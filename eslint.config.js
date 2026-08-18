import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

// Block common false-green patterns in generated tests.
const agentGuardrails = {
	'playwright/no-skipped-test': [ 'error', { disallowFixme: true } ],
	'playwright/no-focused-test': 'error',
	'playwright/expect-expect': 'error',
	'playwright/no-unnecessary-assertions': 'error',
	'playwright/no-conditional-expect': 'error',
	'playwright/no-conditional-in-test': 'error',
	'playwright/no-commented-out-tests': 'error',
	'playwright/no-wait-for-timeout': 'error',

	// This app never reaches networkidle; wait for observable UI state instead.
	'playwright/no-networkidle': 'error',
	'playwright/prefer-web-first-assertions': 'error',
	'playwright/missing-playwright-await': 'error',
	'playwright/no-element-handle': 'error',
	'playwright/no-eval': 'error',
	'playwright/no-page-pause': 'error'
};

export default [
	{
		ignores: [ 'node_modules/**', 'test-results/**', 'playwright-report/**', 'reports/**', 'tests/guardrails/**' ]
	},

	{
		files: [ 'tests/**/*.ts', 'scripts/**/*.ts' ],
		languageOptions: {
			parser: tseslint.parser,
			ecmaVersion: 'latest',
			sourceType: 'module'
		},
		plugins: { playwright },
		rules: {
			...playwright.configs[ 'flat/recommended' ].rules,
			...agentGuardrails,

			// Dynamic ULIDs require prefix selectors; banning raw locators would
			// encourage hardcoded identifiers that break after a reseed.
			'playwright/no-raw-locators': 'off'
		}
	}
];
