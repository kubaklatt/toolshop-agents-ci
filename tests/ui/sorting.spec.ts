// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe( 'Sorting', () => {
	test( 'Sorting by Price (Low-High) and (High-Low) orders products numerically', async ( { page } ) => {
		await page.goto( '/' );

		const sort = page.getByTestId( 'sort' );
		const prices = page.getByTestId( 'product-price' );
		const parsePrices = async () =>
			( await prices.allTextContents() ).map( text => parseFloat( text.replace( /[^0-9.]/g, '' ) ) );

		// 1. Select 'Price (Low - High)' from the Sort dropdown.
		await sort.selectOption( 'Price (Low - High)' );
		const lowToHigh = await parsePrices();
		for ( let i = 1; i < lowToHigh.length; i++ ) {
			expect( lowToHigh[ i ] ).toBeGreaterThanOrEqual( lowToHigh[ i - 1 ] );
		}
		expect( lowToHigh[ 0 ] ).toBe( Math.min( ...lowToHigh ) );

		// 2. Select 'Price (High - Low)' from the Sort dropdown.
		await sort.selectOption( 'Price (High - Low)' );
		const highToLow = await parsePrices();
		for ( let i = 1; i < highToLow.length; i++ ) {
			expect( highToLow[ i ] ).toBeLessThanOrEqual( highToLow[ i - 1 ] );
		}
		expect( highToLow[ 0 ] ).toBe( Math.max( ...highToLow ) );
	} );
} );
