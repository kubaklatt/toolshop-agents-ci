// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog } from './support/catalog.js';

test.describe( 'Search', () => {
	test( 'Searching for a term with no matches shows an explicit empty state', async ( { page } ) => {
		const { cards, pageButtons } = catalog( page );

		await page.goto( '/' );

		const searchTerm = 'zzzznoresultsxyz123';

		await page.getByTestId( 'search-query' ).fill( searchTerm );
		await page.getByTestId( 'search-submit' ).click();

		await expect( page.getByTestId( 'search-caption' ) ).toContainText( `Searched for: ${ searchTerm }` );
		await expect( page.getByTestId( 'no-results' ) ).toHaveText( 'There are no products found.' );

		// The empty state must also clear stale products and pagination.
		await expect( cards ).toHaveCount( 0 );
		await expect( pageButtons ).toHaveCount( 0 );
	} );
} );
