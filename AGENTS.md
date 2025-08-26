# Repository Guidelines

## Project Structure & Module Organization
- Monorepo using npm workspaces under `packages/*`.
- `packages/web` (Vue 3 + Vite): app code in `src/` (`views/`, `components/`, `router/`). Dev server on `:5173`.
- `packages/server` (Express + Socket.IO): `src/routes/`, `src/websocket/`, `src/middleware/`. Persists workspace data to `projects-config.json` in the server CWD (runtime; do not commit).
- `packages/agent` (local CLI/service): key files in `src/cli.ts`, `src/services/*`, `src/websocket/*`, `src/config/*`.
- `packages/shared` (TypeScript types/protocols): `src/types/*`, `src/protocols/*`. Prefer re-exports via `index.ts` where helpful.

## Build, Test, and Development Commands
- Install: `npm install`
- Dev (all): `npm run dev` — runs server, web, and agent together.
- Build (all): `npm run build`; per package: `npm run build:web|server|agent|shared`
- Lint/Format: `npm run lint` (Prettier + ESLint)
- Types: `npm run typecheck`
- Agent CLI: `npm run agent:scan --`, `npm run agent:execute --`, `npm run agent:cli -- <args>`

## Coding Style & Naming Conventions
- Language: TypeScript across packages; Vue SFCs in web.
- Indentation: 2 spaces; prefer trailing commas and single quotes.
- Naming: `camelCase` (vars/functions), `PascalCase` (classes/types, Vue components), `kebab-case` (dirs, non-class files). Vue components end with `.vue`.
- Run `npm run lint` before PRs.

## Testing Guidelines
- Current: no formal suite committed. When adding tests:
  - Colocate as `*.spec.ts` next to sources (e.g., `src/foo.spec.ts`).
  - Frameworks: Vitest for web; Vitest or Jest for Node packages.
  - Root command: `npm test` (wire workspaces as tests are added).

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat(server): add project detection API`).
- PRs: clear description, linked issues, and UI screenshots for web changes.
- Ensure `npm run lint`, `npm run typecheck`, and `npm run build` pass. Keep scope focused and reference affected packages in the title.

## Security & Configuration Tips
- Do not commit secrets. `.env*` files are git-ignored; create per-package `.env` as needed.
- Agent env (examples): `CODE_CROW_SERVER_URL`, `CODE_CROW_PROJECT_PATHS`, `CODE_CROW_WORKING_DIR`, `CODE_CROW_ALLOWED_TOOLS`. Generate an example via `ConfigService.getEnvironmentExample()` in `packages/agent`.
- Server workspace data: `projects-config.json` is runtime local state—do not commit.

