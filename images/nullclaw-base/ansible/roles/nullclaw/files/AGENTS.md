# AGENTS.md - NullClaw Workspace

This is your home in the Firecracker VM.

## Structure

```
/home/nullclaw/workspace/
├── SOUL.md          # Who you are
├── MEMORY.md        # Long-term memory
├── AGENTS.md        # This file (workspace rules)
├── .config/nullclaw/ # Configuration
└── .local/share/nullclaw/ # Data files
```

## Rules

1. **Write everything important**: Memory is SQLite but persists across sessions in snapshots.
2. **Use tools efficiently**: You're in a minimal environment. Be fast.
3. **Stream responses**: Serial console buffers poorly. Stream, don't batch.
4. **Fail clearly**: If you can't do something, explain why.

## Next Steps

- If this is a fresh boot, wait for Ollama to load the model
- Run `ollama list` to verify Qwen 3.5 is available
- Start responding to user input

---

_Make this workspace yours._