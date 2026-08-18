// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog, readTestIds } from './support/catalog.js';

test.describe( 'Product Grid Browsing & Pagination', () => {
	test( 'Navigating between pages updates the product set without duplicates', async ( { page } ) => {
		const { cards, pageButtons, paginationButton } = catalog( page );

		await page.goto( '/' );
		await expect( cards.first() ).toBeVisible();

		const availablePages = await pageButtons.count();

		expect( availablePages, 'this scenario needs at least 2 pages of products' ).toBeGreaterThanOrEqual( 2 );

		const page1Ids = await readTestIds( cards );

		expect( page1Ids.length ).toBeGreaterThan( 0 );

		await paginationButton( 2 ).click();
		await expect.poll( () => readTestIds( cards ) ).not.toEqual( page1Ids );

		const page2Ids = await readTestIds( cards );

		expect( page2Ids.length ).toBeGreaterThan( 0 );
		expect(
			page2Ids.filter( id => page1Ids.includes( id ) ),
			'pages 1 and 2 must not show the same product'
		).toEqual( [] );

		await page.getByRole( 'button', { name: 'Previous' } ).click();
		await expect.poll( () => readTestIds( cards ) ).toEqual( page1Ids );
	} );
} );
