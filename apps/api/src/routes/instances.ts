import { Hono } from 'hono';
import { instances } from '../db/index.js';
import { generateId, generateApiKey } from '../utils/crypto.js';
import { createInstanceSchema } from '../utils/validation.js';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/error.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import * as orchestrator from '../services/orchestrator-client.js';

const instancesRoute = new Hono();

// All instance routes require auth
instancesRoute.use('*', authMiddleware);

// List user's instances
instancesRoute.get('/', (c) => {
  const user = getAuthUser(c);
  const userInstances = instances.findByUserId(user.id);
  
  return c.json({
    instances: userInstances.map((inst: any) => ({
      id: inst.id,
      name: inst.name,
      status: inst.status,
      model: inst.model,
      ramGb: inst.allocated_ram_gb,
      createdAt: inst.created_at,
      expiresAt: inst.expires_at,
      endpoint: inst.endpoint,
    })),
  });
});

// Create new instance
instancesRoute.post('/', async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.json();
  
  const result = createInstanceSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.errors);
  }

  const { name, model, ramGb, ttlSeconds } = result.data;

  // Check instance limits based on plan
  const instanceCount = instances.countByUserId(user.id);
  const limits: Record<string, number> = {
    free: 1,
    pro: 3,
    business: 10,
    enterprise: Infinity,
  };
  
  if (instanceCount >= limits[user.plan]) {
    throw new ConflictError(`Plan limit reached. Your ${user.plan} plan allows ${limits[user.plan]} concurrent instances.`);
  }

  // Call orchestrator to spawn VM
  const ttlHours = Math.ceil(ttlSeconds / 3600);
  
  let orchestratorInstance;
  try {
    const orchestratorResult = await orchestrator.createInstance({
      name: name || `agent-${generateId().slice(0, 8)}`,
      model,
      ramGb,
      ttlHours,
    });
    orchestratorInstance = orchestratorResult.instance;
  } catch (err) {
    return c.json({
      error: err instanceof Error ? err.message : 'Failed to create instance',
      code: 'ORCHESTRATOR_ERROR',
    }, 503);
  }

  if (orchestratorInstance.status === 'error') {
    return c.json({
      error: 'Instance failed to start',
      code: 'INSTANCE_CREATE_FAILED',
    }, 500);
  }

  // Create instance record in our DB
  const instanceId = orchestratorInstance.id;
  const apiKey = orchestratorInstance.apiKey;
  const expiresAt = new Date(orchestratorInstance.expiresAt);
  
  instances.create({
    id: instanceId,
    userId: user.id,
    name: orchestratorInstance.name,
    allocatedRamGb: orchestratorInstance.ramGb,
    model: orchestratorInstance.model,
    ttlSeconds,
    apiKey,
    expiresAt,
  });

  // Update status with orchestrator info
  instances.updateStatus(instanceId, orchestratorInstance.status, orchestratorInstance.endpoint, orchestratorInstance.hostId);

  return c.json({
    instance: {
      id: instanceId,
      name: orchestratorInstance.name,
      status: orchestratorInstance.status,
      model: orchestratorInstance.model,
      ramGb: orchestratorInstance.ramGb,
      apiKey,
      createdAt: orchestratorInstance.createdAt,
      expiresAt: orchestratorInstance.expiresAt,
      endpoint: orchestratorInstance.endpoint,
    },
  }, 201);
});

// Get instance by ID
instancesRoute.get('/:id', (c) => {
  const user = getAuthUser(c);
  const instanceId = c.req.param('id');
  
  const inst = instances.findById(instanceId) as any;
  
  if (!inst) {
    throw new NotFoundError('Instance');
  }
  
  // Check ownership
  if (inst.user_id !== user.id) {
    throw new NotFoundError('Instance'); // Don't leak existence
  }

  return c.json({
    instance: {
      id: inst.id,
      name: inst.name,
      status: inst.status,
      model: inst.model,
      ramGb: inst.allocated_ram_gb,
      createdAt: inst.created_at,
      expiresAt: inst.expires_at,
      endpoint: inst.endpoint,
    },
  });
});

// Delete instance
instancesRoute.delete('/:id', async (c) => {
  const user = getAuthUser(c);
  const instanceId = c.req.param('id');
  
  const inst = instances.findById(instanceId) as any;
  
  if (!inst) {
    throw new NotFoundError('Instance');
  }
  
  if (inst.user_id !== user.id) {
    throw new NotFoundError('Instance');
  }

  // Call orchestrator to tear down VM
  await orchestrator.deleteInstance(instanceId);

  // Delete from database
  instances.delete(instanceId);

  return c.json({ success: true });
});

// Start instance
instancesRoute.post('/:id/start', async (c) => {
  const user = getAuthUser(c);
  const instanceId = c.req.param('id');
  
  const inst = instances.findById(instanceId) as any;
  
  if (!inst) {
    throw new NotFoundError('Instance');
  }
  
  if (inst.user_id !== user.id) {
    throw new NotFoundError('Instance');
  }

  if (inst.status === 'running') {
    return c.json({
      instance: {
        id: inst.id,
        status: inst.status,
        endpoint: inst.endpoint,
      },
    });
  }

  // Call orchestrator
  const result = await orchestrator.startInstance(instanceId);
  const updatedInstance = result.instance;
  
  instances.updateStatus(instanceId, updatedInstance.status, updatedInstance.endpoint);
  
  const updated = instances.findById(instanceId);

  return c.json({
    instance: {
      id: (updated as any).id,
      name: (updated as any).name,
      status: updatedInstance.status,
      endpoint: updatedInstance.endpoint,
    },
  });
});

// Stop instance
instancesRoute.post('/:id/stop', async (c) => {
  const user = getAuthUser(c);
  const instanceId = c.req.param('id');
  
  const inst = instances.findById(instanceId) as any;
  
  if (!inst) {
    throw new NotFoundError('Instance');
  }
  
  if (inst.user_id !== user.id) {
    throw new NotFoundError('Instance');
  }

  if (inst.status === 'stopped') {
    return c.json({
      instance: {
        id: inst.id,
        status: inst.status,
      },
    });
  }

  const result = await orchestrator.stopInstance(instanceId);
  
  instances.updateStatus(instanceId, result.instance.status);

  return c.json({
    instance: {
      id: instanceId,
      status: result.instance.status,
    },
  });
});

export default instancesRoute;