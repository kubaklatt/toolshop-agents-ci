// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog, readNames } from './support/catalog.js';

test.describe( 'Product Grid Browsing & Pagination', () => {
	test( 'Navigating between pages updates the product set without duplicates', async ( { page } ) => {
		const { names, pageButtons, paginationButton } = catalog( page );

		await page.goto( '/' );
		await expect( names.first() ).toBeVisible();

		// Stated loudly on purpose: the scenario is meaningless with one page. If a
		// reseed shrinks the catalogue, fail here with a readable message rather
		// than two steps later on a missing button.
		const availablePages = await pageButtons.count();

		expect( availablePages, 'this scenario needs at least 2 pages of products' ).toBeGreaterThanOrEqual( 2 );

		// 1. Record the set of product names shown on page 1.
		const page1Names = await readNames( names );

		expect( page1Names.length ).toBeGreaterThan( 0 );

		// 2. Click the 'Page-2' pagination button.
		await paginationButton( 2 ).click();

		// The active-page class flips before the grid re-renders. Waiting on that
		// class is exactly what made the generated version read page 1 twice and
		// then assert page 1 !== page 1. Wait for the content instead.
		await expect( names ).not.toHaveText( page1Names );

		const page2Names = await readNames( names );

		expect( page2Names.length ).toBeGreaterThan( 0 );
		expect(
			page2Names.filter( name => page1Names.includes( name ) ),
			'pages 1 and 2 must not show the same product'
		).toEqual( [] );

		// 3. Click the Previous button and land back on exactly page 1's set.
		await page.getByRole( 'button', { name: 'Previous' } ).click();
		await expect( names ).toHaveText( page1Names );
	} );
} );
