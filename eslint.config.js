// Shared flat ESLint config for every workspace project.
//
// Tiers:
//   1. Baseline (all *.ts/*.tsx everywhere): eslint:recommended + typescript-eslint
//      recommended, no type information required. Catches unused vars/imports,
//      unreachable code, `any` usage (warn), etc.
//   2. React (apps/web only): JSX/hooks rules on top of the baseline.
//   3. Type-aware (apps/server, apps/ad-server, packages/sdk `src/**`): adds
//      typescript-eslint's type-checked rule set, most importantly
//      no-floating-promises and no-misused-promises. Scoped to each package's
//      `src` because that's the only tree covered by that package's tsconfig
//      `include` (root-level scripts/config files live outside any tsconfig
//      project and fall back to tier 1 instead of breaking type-aware linting).
const js = require('@eslint/js')
const globals = require('globals')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const tsParser = require('@typescript-eslint/parser')
const reactPlugin = require('eslint-plugin-react')
const reactHooksPlugin = require('eslint-plugin-react-hooks')
const reactRefreshPlugin = require('eslint-plugin-react-refresh').default
const prettierConfig = require('eslint-config-prettier')

const TS_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']
const JS_FILES = ['**/*.js', '**/*.cjs', '**/*.mjs']

const TYPE_AWARE_PROJECTS = [
  'apps/server/src/**/*.ts',
  'apps/ad-server/src/**/*.ts',
  'packages/sdk/src/**/*.ts',
]

module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/*.d.ts',
      // Stray duplicate directory left over from a past migration run;
      // contains no source, but avoid globbing into it regardless.
      'packages/db/packages/**',
    ],
  },

  js.configs.recommended,

  // typescript-eslint's own base/eslint-recommended/recommended configs, pinned
  // to ts/tsx files (their `base` entry has no `files` of its own by default).
  ...tsPlugin.configs['flat/recommended'].map((config) => ({
    ...config,
    files: config.files ?? TS_FILES,
  })),

  {
    files: TS_FILES,
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Node globals for everything (server code, package internals, config/scripts) —
  // including plain .js/.cjs/.mjs files (this config file itself, root-level codegen
  // scripts): lint-staged's pre-commit hook runs `eslint --fix` directly on whatever's
  // staged, regardless of extension, bypassing each package's own `pnpm lint` glob.
  {
    files: [...TS_FILES, ...JS_FILES],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // apps/web: browser globals + React/JSX/hooks rules on top of the baseline.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: reactPlugin.configs.flat.recommended.languageOptions.parserOptions,
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Type-aware tier: server, ad-server, sdk — real `src` trees only.
  //
  // Deliberately NOT the full `recommended-type-checked`/`strict-type-checked`
  // presets: those also pull in the `no-unsafe-*` family (member-access,
  // assignment, call, argument, return), which lit up ~6,600 findings across
  // apps/server alone on a codebase that leans on Prisma's loosely-typed JSON
  // columns and `any` at request boundaries — a real, separate cleanup project,
  // not something to bundle into wiring up lint infra. Also skips
  // `only-throw-error`, which is fundamentally incompatible with this project's
  // documented `throw { statusCode, message }` HTTP-error convention (see
  // CLAUDE.md's error-handling notes) rather than a real bug class here.
  {
    files: TYPE_AWARE_PROJECTS,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // apps/server and apps/ad-server: package-specifier subpath imports into a workspace package
  // that declares more than one export (i.e. `@project/<pkg>/<subpath>`, not just `@project/<pkg>`
  // itself) resolve fine locally (real tsx/vitest, real pnpm-linked node_modules) but crash with
  // MODULE_NOT_FOUND in the built Railway image — confirmed live twice now: once for
  // @project/page-renderer/@project/embed-contract/@project/ad-renderer (see apps/server/
  // Dockerfile's COPY comments) and again for @project/sdk (GoogleSheetsService.ts/
  // ImportSourceService.ts crash-looped production on 2026-09-08, see CLAUDE.md). The proven fix
  // both times was a plain relative import to the real file instead — see ContactService.ts's
  // `../../../../packages/sdk/src/lib/importContactSchema`. Only sdk and embed-contract declare
  // subpath exports at all today; this list grows if another workspace package adds one.
  {
    files: ['apps/server/src/**/*.ts', 'apps/ad-server/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@project/sdk',
              message:
                'Import the specific relative file instead (e.g. ../../../../packages/sdk/src/lib/X) — the package root pulls in React/react-query and has never been proven to resolve at runtime in the Railway image either.',
            },
          ],
          patterns: [
            {
              group: ['@project/sdk/*', '@project/embed-contract/*'],
              message:
                'Package-specifier subpath imports into this workspace package are known to crash at runtime in the Railway image (MODULE_NOT_FOUND) even though they resolve fine locally. Use a relative import to the real file instead — see ContactService.ts.',
            },
          ],
        },
      ],
    },
  },

  // apps/server and packages/sdk lean heavily on `any` at request/response and
  // React Query generic boundaries (Prisma Json columns, generated-OpenAPI query
  // types that don't line up with hand-rolled pagination params, `...options`
  // passthroughs) — ~1,050 sites in apps/server alone. Turning no-explicit-any
  // on there today would either block this lint rollout on a large, separate
  // typing project or force through low-value casts. Deferred on purpose; not
  // silenced for apps/ad-server, which was small enough to fix outright (see
  // EmbedServingService.ts for the real-type pattern to follow when this is
  // eventually tackled here too).
  {
    files: ['apps/server/src/**/*.ts', 'packages/sdk/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  prettierConfig,
]
