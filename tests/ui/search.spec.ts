// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog } from './support/catalog.js';

test.describe( 'Search', () => {
	test( 'Searching for a term with no matches shows an explicit empty state', async ( { page } ) => {
		const { cards, pageButtons } = catalog( page );

		await page.goto( '/' );

		const searchTerm = 'zzzznoresultsxyz123';

		// 1. Type a nonsense keyword guaranteed not to match any product, e.g. 'zzzznoresultsxyz123', into the search box and submit.
		await page.getByTestId( 'search-query' ).fill( searchTerm );
		await page.getByTestId( 'search-submit' ).click();

		await expect( page.getByTestId( 'search-caption' ) ).toContainText( `Searched for: ${ searchTerm }` );
		await expect( page.getByTestId( 'no-results' ) ).toHaveText( 'There are no products found.' );

		// The assertion that carries this test: an empty state that still renders
		// the previous results is the bug this scenario exists to catch.
		await expect( cards ).toHaveCount( 0 );
		await expect( pageButtons ).toHaveCount( 0 );
	} );
} );
