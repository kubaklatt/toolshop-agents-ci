import type { Locator, Page } from '@playwright/test';

/**
 * Product names in this app come back padded with whitespace, so every
 * comparison has to trim first.
 *
 * A note on reading text at all: web-first assertions (`toHaveText`) retry and
 * should do the waiting. But "pages 1 and 2 share no products" is set
 * arithmetic over two snapshots — there is no retrying matcher for that. So the
 * pattern in these tests is: wait with a web-first assertion, *then* read for
 * the arithmetic. Reading without waiting first is what made three of the four
 * generated tests fail.
 */
export async function readNames( locator: Locator ): Promise<string[]> {
	return ( await locator.allTextContents() ).map( text => text.trim() );
}

/**
 * Order predicates live here, not in the test body, because
 * playwright/no-conditional-in-test rejects branching inside a test — including
 * the `&&`/`||` in these one-liners. That rule is right: a branch in a test body
 * is usually an assertion that does not always run. A pure predicate in a support
 * module is not that.
 */
export const isAscending = ( values: number[] ): boolean =>
	values.every( ( value, i ) => i === 0 || values[ i - 1 ] <= value );

export const isDescending = ( values: number[] ): boolean =>
	values.every( ( value, i ) => i === 0 || values[ i - 1 ] >= value );

export function catalog( page: Page ) {
	return {
		names: page.getByTestId( 'product-name' ),
		prices: page.getByTestId( 'product-price' ),

		// Prefix match, never a whole ULID — those rotate on every reseed.
		//
		// The `a` matters. `[data-test^="product-"]` alone also matches
		// `product-name` and `product-price`, which are children of every card, so
		// a page of 9 products reports 27 "cards". I introduced that bug in the
		// seed test and the generator copied the pattern out of it faithfully.
		// Cards are anchors; the name and price are not.
		cards: page.locator( 'a[data-test^="product-"]' ),
		categoryBoxes: page.locator( '[data-test^="category-"]' ),
		checkedCategoryBoxes: page.locator( '[data-test^="category-"]:checked' ),

		sort: page.getByTestId( 'sort' ),
		pageButtons: page.getByRole( 'button', { name: /^Page-\d+$/ } ),
		pageButton: ( number: number ) => page.getByRole( 'button', { name: `Page-${ number }` } )
	};
}
