import type { Locator, Page } from '@playwright/test';

/** Read a stable snapshot only after a web-first assertion has made the locator ready. */
export async function readNames( locator: Locator ): Promise<string[]> {
	return ( await locator.allTextContents() ).map( text => text.trim() );
}

export async function readTestIds( locator: Locator ): Promise<string[]> {
	const ids = await Promise.all(
		( await locator.all() ).map( element => element.getAttribute( 'data-test' ) )
	);

	return ids.filter( ( id ): id is string => id !== null );
}

export const isAscending = ( values: number[] ): boolean =>
	values.every( ( value, i ) => i === 0 || values[ i - 1 ] <= value );

export const isDescending = ( values: number[] ): boolean =>
	values.every( ( value, i ) => i === 0 || values[ i - 1 ] >= value );

export function catalog( page: Page ) {
	return {
		names: page.getByTestId( 'product-name' ),
		prices: page.getByTestId( 'product-price' ),

		// The `a` excludes product-name and product-price, which share the prefix.
		cards: page.locator( 'a[data-test^="product-"]' ),
		categoryBoxes: page.locator( '[data-test^="category-"]' ),
		checkedCategoryBoxes: page.locator( '[data-test^="category-"]:checked' ),

		sort: page.getByTestId( 'sort' ),
		pageButtons: page.getByRole( 'button', { name: /^Page-\d+$/ } ),
		paginationButton: ( number: number ) => page.getByRole( 'button', { name: `Page-${ number }` } )
	};
}
