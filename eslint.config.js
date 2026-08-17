import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

/**
 * Guardrails for tests an agent wrote.
 *
 * The point is not style. Every rule below catches a way generated code can
 * produce a green test that checks nothing. These rules narrow the review; they
 * do not replace the human question: "could this assertion fail for the product
 * behaviour it claims to test?"
 */
const agentGuardrails = {
	// Skip and fixme both turn visible failures into invisible coverage gaps.
	'playwright/no-skipped-test': [ 'error', { disallowFixme: true } ],

	// A stray .only() silently reduces the suite to one test while staying green.
	'playwright/no-focused-test': 'error',

	// A test with no assertion cannot fail. Agents produce these when a step
	// "worked" and they forget the test has to prove something.
	'playwright/expect-expect': 'error',

	// An assertion that can never fail is worse than none, because it reads as
	// coverage.
	'playwright/no-unnecessary-assertions': 'error',

	// expect() inside if/try/catch: the branch never runs, the test passes.
	'playwright/no-conditional-expect': 'error',
	'playwright/no-conditional-in-test': 'error',

	// Commenting a test out is the quiet version of deleting it.
	'playwright/no-commented-out-tests': 'error',

	// Fixed sleeps are the default way an agent "fixes" a race. They convert a
	// real failure into a slow, intermittent one.
	'playwright/no-wait-for-timeout': 'error',

	// Verified by hand on this app: networkidle never settles here, so a test
	// waiting on it hangs until timeout. Keeping the ban in lint makes the
	// constraint enforceable instead of advisory.
	'playwright/no-networkidle': 'error',

	// Web-first assertions retry; a bare truthiness check on a resolved value
	// does not, and becomes flaky under load.
	'playwright/prefer-web-first-assertions': 'error',
	'playwright/missing-playwright-await': 'error',

	// Element handles and page evaluation bypass locator retryability and make
	// synchronization the test author's responsibility.
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

			// Deliberately off. Product and category elements embed a ULID that
			// changes on every database reseed, so `[data-test^="product-"]` is the
			// reseed-proof way to reach them. Banning raw locators here would push
			// tests towards hardcoding a ULID, which is the failure this repo is
			// trying to prevent.
			'playwright/no-raw-locators': 'off'
		}
	}
];
