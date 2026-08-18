import { test, expect } from '@playwright/test';

/** Seed for the agents: use reseed-safe locators and wait for UI state, not networkidle. */
test( 'seed: storefront lists products', async ( { page } ) => {
	await page.goto( '/' );

	// ULIDs rotate on reseed; `a` excludes name and price elements sharing the prefix.
	const productCards = page.locator( 'a[data-test^="product-"]' );

	await expect( productCards.first() ).toBeVisible();
	await expect( productCards ).not.toHaveCount( 0 );

	await expect( page.getByTestId( 'search-query' ) ).toBeVisible();
	await expect( page.getByTestId( 'sort' ) ).toBeVisible();
} );
