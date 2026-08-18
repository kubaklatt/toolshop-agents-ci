// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog, isAscending, isDescending } from './support/catalog.js';

test.describe( 'Sorting', () => {
	test( 'Sorting by Price (Low-High) and (High-Low) orders products numerically', async ( { page } ) => {
		const { sort, prices, names } = catalog( page );

		await page.goto( '/' );
		await expect( names.first() ).toBeVisible();

		const pricesOnPage = async (): Promise<number[]> =>
			( await prices.allTextContents() ).map( text => Number( text.replace( /[^0-9.]/g, '' ) ) );

		const initialPrices = await pricesOnPage();

		expect(
			initialPrices.length,
			'an ordering assertion is meaningless with fewer than two prices'
		).toBeGreaterThanOrEqual( 2 );
		expect(
			new Set( initialPrices ).size,
			'an ordering assertion needs at least two distinct prices'
		).toBeGreaterThanOrEqual( 2 );

		// Establish one known order first, then prove both transitions change it.
		await sort.selectOption( 'Price (High - Low)' );
		await expect
			.poll( async () => isDescending( await pricesOnPage() ), {
				message: 'prices should settle into descending order'
			} )
			.toBe( true );

		await sort.selectOption( 'Price (Low - High)' );
		await expect
			.poll( async () => isAscending( await pricesOnPage() ), {
				message: 'prices should settle into ascending order'
			} )
			.toBe( true );

		const lowToHigh = await pricesOnPage();

		await sort.selectOption( 'Price (High - Low)' );
		await expect.poll( async () => isDescending( await pricesOnPage() ) ).toBe( true );

		expect( await pricesOnPage() ).not.toEqual( lowToHigh );
	} );
} );
