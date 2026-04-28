# GitHub Actions Setup for Hyperclaw

## Required GitHub Secrets

Go to: https://github.com/twilson63/hyperclaw/settings/secrets/actions

Add these secrets:

1. **DIGITALOCEAN_ACCESS_TOKEN**
   - Your DigitalOcean API token with read/write access
   - Generate at: https://cloud.digitalocean.com/account/api/tokens

2. **VITE_CLERK_PUBLISHABLE_KEY**
   - Your Clerk publishable key from https://dashboard.clerk.com
   - Starts with `pk_test_` or `pk_live_`

## Create the Workflow File

After adding the secrets, create `.github/workflows/deploy.yml` in the repo:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build and Push Images
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Login to DigitalOcean Registry
        uses: docker/login-action@v3
        with:
          registry: registry.digitalocean.com
          username: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
          password: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Build and Push Dashboard
        uses: docker/build-push-action@v5
        with:
          context: ./apps/dashboard
          platforms: linux/amd64
          push: true
          tags: |
            registry.digitalocean.com/scout-live/app-hyperclaw:latest
            registry.digitalocean.com/scout-live/app-hyperclaw:${{ github.sha }}
          build-args: |
            VITE_CLERK_PUBLISHABLE_KEY=${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}

  deploy:
    name: Deploy to Cluster
    runs-on: ubuntu-latest
    needs: [build]
    
    steps:
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Save kubeconfig
        run: doctl kubernetes cluster kubeconfig save scout-live
      
      - name: Install kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Deploy
        run: |
          kubectl set image deployment/app-hyperclaw app-hyperclaw=registry.digitalocean.com/scout-live/app-hyperclaw:latest -n scout-live
          kubectl rollout status deployment/app-hyperclaw -n scout-live --timeout=120s
          
      - name: Verify
        run: |
          kubectl get pods -n scout-live
          curl -sf https://hyperclaw.scoutos.live/health || exit 1
```

## Trigger Deployment

After adding the workflow and secrets:
1. Push to main branch, OR
2. Go to Actions tab and click "Run workflow"