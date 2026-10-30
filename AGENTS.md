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
- Signy comes from the checkout in `../signy` (a `file:` dev dependency) until it is on npm. Build it there first with `npm run build`. Do not edit it from here, a framework change belongs in `alopia/signy`.

Keep `npm run check` passing: ESLint, Prettier, typecheck, tests and the build.
