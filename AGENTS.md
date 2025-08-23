# Repository Guidelines

## Project Structure & Module Organization
- Monorepo with npm workspaces: source lives under `packages/*`.
- `packages/web` (Vue 3 + Vite): app code in `src/` (`views/`, `components/`, `router/`), dev server on `:5173`.
- `packages/server` (Express + Socket.IO): `src/routes/`, `src/websocket/`, `src/middleware/`. Persists workspace metadata to `projects-config.json` in the server CWD (runtime data; do not commit).
- `packages/agent` (local CLI/service): connects to server and Claude Code SDK. Key files: `src/cli.ts`, `src/services/*`, `src/websocket/*`, `src/config/*`.
- `packages/shared` (TypeScript types/protocols): `src/types/*`, `src/protocols/*`.

## Build, Test, and Development Commands
- Install: `npm install`
- Dev (all): `npm run dev` (spawns server, web, agent)
- Build (all): `npm run build`; per package: `npm run build:web|server|agent|shared`
- Lint/Types: `npm run lint`, `npm run typecheck` (runs across workspaces)
- Agent CLI: `npm run agent:scan --`, `npm run agent:execute --`, `npm run agent:cli -- <args>`

## Coding Style & Naming Conventions
- Language: TypeScript across packages; Vue SFCs in web.
- Formatting: Prettier 3; run `npm run lint` before PRs (ESLint fixes common issues).
- Indentation: 2 spaces; prefer trailing commas and single quotes where applicable.
- Naming: `camelCase` for variables/functions, `PascalCase` for classes/types and Vue components, `kebab-case` for directories and non-class files. Vue components end with `.vue` (e.g., `ProjectView.vue`). Re-export with `index.ts` where it improves DX in `shared/`.

## Testing Guidelines
- Current status: no formal test suite committed. When adding tests:
  - Colocate `*.spec.ts` next to sources (`src/foo.spec.ts`).
  - Use Vitest for web; Vitest or Jest for Node packages.
  - Root command: `npm test` (wire workspaces as you add tests).

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`). Example: `feat(server): add project detection API`.
- PRs: include clear description, linked issues, and UI screenshots for web changes. Ensure `npm run lint`, `npm run typecheck`, and `npm run build` pass. Keep PRs scoped and reference affected packages in the title.

## Security & Configuration Tips
- Do not commit secrets. `.env*` files are git-ignored. Create per-package `.env` as needed.
- Agent env (examples): `CODE_CROW_SERVER_URL`, `CODE_CROW_PROJECT_PATHS`, `CODE_CROW_WORKING_DIR`, `CODE_CROW_ALLOWED_TOOLS`. Generate an example via `ConfigService.getEnvironmentExample()` in `packages/agent`.
- Server workspace data: `projects-config.json` is created at runtime by the server—treat as local state.
