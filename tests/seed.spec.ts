import { test, expect } from '@playwright/test';

/**
 * Seed test.
 *
 * The planner runs this first and treats it as the template for everything it
 * generates: how the app is reached, what a good locator looks like here, and
 * what "ready" means on this page. Two lessons are deliberately encoded below.
 *
 * 1. Product and category elements carry an ID in the attribute itself —
 *    `data-test="product-01KZPDA9NKSHZ19KBQMZFYV0JZ"`. Those ULIDs change every
 *    time the demo database is reseeded, so a test that hardcodes one rots
 *    within days. Match the prefix or use the accessible name instead.
 *
 * 2. `waitUntil: 'networkidle'` never settles on this app. Wait for an element,
 *    not for the network.
 *
 * Keep it boring and always-green. If this fails, the environment is wrong,
 * not the product.
 */
test( 'seed: storefront lists products', async ( { page } ) => {
	await page.goto( '/' );

	// Prefix match — never a whole ULID.
	const productCards = page.locator( '[data-test^="product-"]' );

	await expect( productCards.first() ).toBeVisible();
	await expect( productCards ).not.toHaveCount( 0 );

	// Stable, human-meaningful landmarks: these testids are not ID-derived.
	await expect( page.getByTestId( 'search-query' ) ).toBeVisible();
	await expect( page.getByTestId( 'sort' ) ).toBeVisible();
} );
