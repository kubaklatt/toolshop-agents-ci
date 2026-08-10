import { defineConfig, devices } from '@playwright/test';

/**
 * Three projects, two of which run the *same* API test code against different
 * hosts. `api-buggy` points at a deliberately broken build of the same API —
 * see scripts/assert-bugs-caught.ts for why that matters.
 */
const UI_BASE_URL = process.env.UI_BASE_URL ?? 'https://practicesoftwaretesting.com';
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.practicesoftwaretesting.com';
const API_BUGGY_URL = process.env.API_BUGGY_URL ?? 'https://api-with-bugs.practicesoftwaretesting.com';

export default defineConfig( {
	testDir: 'tests',
	fullyParallel: true,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [
		[ 'list' ],
		[ 'html', { open: 'never' } ],
		[ 'json', { outputFile: 'test-results/results.json' } ]
	],
	use: {
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',

		// The app annotates elements with `data-test`, not the Playwright default
		// `data-testid`. Without this, every getByTestId() an agent writes silently
		// matches nothing.
		testIdAttribute: 'data-test'
	},
	projects: [
		{
			name: 'ui',
			testMatch: [ 'seed.spec.ts', 'ui/**/*.spec.ts' ],
			use: { ...devices[ 'Desktop Chrome' ], baseURL: UI_BASE_URL }
		},
		{
			name: 'api-clean',
			testMatch: 'api/**/*.spec.ts',
			use: { baseURL: API_BASE_URL }
		},
		{
			name: 'api-buggy',
			testMatch: 'api/**/*.spec.ts',
			use: { baseURL: API_BUGGY_URL }
		}
	]
} );
