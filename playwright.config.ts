import { defineConfig, devices } from '@playwright/test';

// The same API tests run against healthy and deliberately broken builds.
const UI_BASE_URL = process.env.UI_BASE_URL ?? 'https://practicesoftwaretesting.com';
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.practicesoftwaretesting.com';
const API_BUGGY_URL = process.env.API_BUGGY_URL ?? 'https://api-with-bugs.practicesoftwaretesting.com';

export default defineConfig( {
	testDir: 'tests',
	fullyParallel: true,
	forbidOnly: !! process.env.CI,
	// Keep one retry for trace evidence, but never let a flaky retry turn CI green.
	failOnFlakyTests: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: [
		[ 'list' ],
		[ 'html', { open: 'never' } ],
		[ 'json', { outputFile: 'test-results/results.json' } ]
	],
	use: {
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',

		// Toolshop uses data-test instead of Playwright's data-testid default.
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
