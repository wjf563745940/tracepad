# Contributing

Thanks for helping out. This project is early, so the rules are simple.

## Getting started

```bash
pnpm install
pnpm test
pnpm typecheck
```

## Ground rules

1. **`@tracepad/core` stays dependency-free.** It must run in Node and the browser with zero runtime deps.
2. **No business logic in framework packages.** `@tracepad/vue` / `@tracepad/react` only bridge props, events and slots.
3. **Every adapter needs tests.** Protocol adapters are the fragile part; cover malformed and partial chunks.
4. **Snapshots are immutable.** `applyEvent` returns a new tree; never mutate the previous one.

## Adding a protocol adapter

1. Create `packages/core/src/adapters/<name>.ts`.
2. Export a factory returning a `TraceAdapter`.
3. Yield normalised `TraceEvent`s — never raw protocol shapes.
4. Add a test with a realistic stream, including a truncated chunk.

## Commit messages

Short and imperative: `add langgraph adapter`, `fix tool args concat`.

## Changesets

Any change to a published package needs a changeset:

```bash
pnpm changeset          # pick the packages and the bump
```

Pick `patch` for fixes, `minor` for new features, `major` for breaking changes.
Releases are cut from `main` with `pnpm version` followed by `pnpm release`.

## Good first issues

Look for the `good first issue` label — usually adapters for new protocols and small parser fixes.
