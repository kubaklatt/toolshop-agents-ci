// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe( 'Search', () => {
	test( 'Searching for a term with no matches shows an explicit empty state', async ( { page } ) => {
		await page.goto( '/' );

		const searchTerm = 'zzzznoresultsxyz123';

		// 1. Type a nonsense keyword guaranteed not to match any product, e.g. 'zzzznoresultsxyz123', into the search box and submit.
		await page.getByTestId( 'search-query' ).fill( searchTerm );
		await page.getByTestId( 'search-submit' ).click();

		await expect( page.getByTestId( 'search-caption' ) ).toContainText( `Searched for: ${ searchTerm }` );
		await expect( page.getByTestId( 'no-results' ) ).toHaveText( 'There are no products found.' );
		await expect( page.locator( '[data-test^="product-"]' ) ).toHaveCount( 0 );
		await expect( page.locator( 'ul.pagination' ) ).toHaveCount( 0 );
	} );
} );
