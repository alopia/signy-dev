# AGENTS.md

Instructions for any AI tool or agent working on `signy-dev`, the Signy dev tools. The rules for this repo live in `.github/instructions/`. The code follows the framework rules in the sibling repo.

## Always read

- `.github/instructions/project-identity.instructions.md`: package name, repos and paths.
- The framework rules in `../signy/.github/instructions/`:
  - `project-identity.instructions.md`: framework name and casing.
  - `general.instructions.md`: writing style for docs, comments and commits, development stage, module headers.

## Read when editing TypeScript

- `../signy/.github/instructions/typescript-standards.instructions.md`
- `../signy/.github/instructions/ts-class-order.instructions.md`
- `../signy/.github/instructions/module-structure.instructions.md`
- `../signy/.github/instructions/constants-usage.instructions.md`
- `../signy/.github/instructions/logging.instructions.md`: log message ids. Every id Signy defines needs a text in `src/log-messages.ts`.

## Layout

- `src/`: the package source. `npm run build` writes `dist/`.
- `test/`: Vitest tests in jsdom. Any `console.error` or `console.warn` a test does not claim with `expectLogged()` fails it.
- Signy comes from npm (`signy` in `devDependencies`). The log message test also reads the ids from Signy's source in `../signy` (or `SIGNY_DIR`), and skips when there is none. CI checks out the tag of the installed version. Do not edit the framework from here, a framework change belongs in `alopia/signy`.

Keep `npm run check` passing: ESLint, Prettier, typecheck, tests and the build.
