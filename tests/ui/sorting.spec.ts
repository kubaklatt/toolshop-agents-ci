// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog, isAscending, isDescending } from './support/catalog.js';

/**
 * Two failure modes in the generated version of this test, and only one of them
 * was mechanical:
 *
 * 1. It read the prices immediately after `selectOption`, before the grid
 *    re-rendered. `pnpm lint` flagged that one.
 * 2. It verified the order with a `for` loop and then
 *    `expect( prices[ 0 ] ).toBe( Math.min( ...prices ) )`. With one product the
 *    loop body never runs and the second assertion is trivially true; with zero
 *    products it compared `undefined` to `Infinity`. So the test could pass
 *    without checking any ordering at all. No lint rule sees that — the shape is
 *    perfectly ordinary.
 *
 * Both are fixed by polling the invariant instead: retry until the prices on the
 * page are sorted, and require at least two of them for the claim to mean
 * anything.
 */
test.describe( 'Sorting', () => {
	test( 'Sorting by Price (Low-High) and (High-Low) orders products numerically', async ( { page } ) => {
		const { sort, prices, names } = catalog( page );

		await page.goto( '/' );
		await expect( names.first() ).toBeVisible();

		const pricesOnPage = async (): Promise<number[]> =>
			( await prices.allTextContents() ).map( text => Number( text.replace( /[^0-9.]/g, '' ) ) );

		// "At least two prices" is a precondition, asserted once and loudly, not
		// folded into the polled invariant. That separation is the fix for failure
		// mode 2: with one product, an ordering claim is vacuous, and a vacuous
		// claim should fail here rather than pass quietly later.
		expect(
			( await pricesOnPage() ).length,
			'an ordering assertion is meaningless with fewer than two prices'
		).toBeGreaterThanOrEqual( 2 );

		// 1. Select 'Price (Low - High)' from the Sort dropdown.
		await sort.selectOption( 'Price (Low - High)' );
		await expect
			.poll( async () => isAscending( await pricesOnPage() ), {
				message: 'prices should settle into ascending order (and there must be at least two)'
			} )
			.toBe( true );

		// 2. Select 'Price (High - Low)' from the Sort dropdown.
		await sort.selectOption( 'Price (High - Low)' );
		await expect
			.poll( async () => isDescending( await pricesOnPage() ), {
				message: 'prices should settle into descending order'
			} )
			.toBe( true );
	} );
} );
