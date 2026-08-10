// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog, readNames } from './support/catalog.js';

/**
 * The generated version of this test hardcoded the subcategory names —
 * 'Hammer', 'Hand Saw', 'Wrench', 'Screwdriver', 'Pliers', 'Chisels',
 * 'Measures'. The generator's own summary claimed it had honoured the
 * reseed-safety constraint because it avoided hardcoding ULIDs; it hardcoded the
 * catalogue's category names instead, which change just as easily.
 *
 * This version never names a category. It works from the observable behaviour:
 * whatever became checked when the parent was clicked *is* the set of children.
 *
 * It also asserts the anomaly the planner found and the generated test skipped:
 * unchecking a child leaves the parent visually checked. That is recorded here as
 * the current behaviour, so if the application ever changes it, this test says so
 * rather than silently passing.
 */
test.describe( 'Category & Brand Filters', () => {
	test( 'Checking a parent category auto-selects all of its subcategories', async ( { page } ) => {
		const { names, categoryBoxes, checkedCategoryBoxes, pageButtons } = catalog( page );

		await page.goto( '/' );
		await expect( names.first() ).toBeVisible();

		await expect( categoryBoxes.first() ).toBeVisible();
		await expect( checkedCategoryBoxes, 'no category should be pre-selected' ).toHaveCount( 0 );

		const unfilteredNames = await readNames( names );
		const unfilteredPages = await pageButtons.count();

		expect( unfilteredNames.length ).toBeGreaterThan( 0 );
		expect( unfilteredPages, 'this scenario needs a catalogue larger than one page' ).toBeGreaterThan( 1 );

		// 1. Check a top-level parent category checkbox.
		const parent = categoryBoxes.first();

		await parent.click();

		// Parent plus at least one child. Discovered, not assumed.
		await expect( checkedCategoryBoxes.first() ).toBeChecked();

		const checkedAfterParent = await checkedCategoryBoxes.count();

		expect( checkedAfterParent, 'checking a parent should select the parent and its children' )
			.toBeGreaterThan( 1 );

		// Not an assertion on the first page's product names, which is what I tried
		// first and got wrong: the unfiltered catalogue happens to begin with the
		// products of this very category, so page 1 is byte-identical before and
		// after filtering. The result *size* is what changes. Waiting on the page
		// count is both the wait and the assertion.
		await expect( pageButtons, 'filtering to one category must shrink the result set' )
			.not.toHaveCount( unfilteredPages );

		const filteredPages = await pageButtons.count();

		expect( filteredPages ).toBeLessThan( unfilteredPages );

		// 2. Uncheck exactly one of the now-checked subcategories, whichever it is.
		//
		// Resolve it to a fixed locator first. `checkedCategoryBoxes` is live: the
		// moment the box is unchecked it drops out of the `:checked` set, so
		// `.nth( 1 )` would then point at a different, still-checked box and the
		// assertion below would fail against the wrong element. My bug, not the
		// generator's.
		const childTestId = await checkedCategoryBoxes.nth( 1 ).getAttribute( 'data-test' );
		const someChild = page.locator( `[data-test="${ childTestId }"]` );

		await someChild.click();
		await expect( someChild ).not.toBeChecked();
		await expect( checkedCategoryBoxes ).toHaveCount( checkedAfterParent - 1 );

		// The anomaly, asserted rather than assumed: the parent stays checked even
		// though one of its children no longer is.
		await expect( parent, 'documented current behaviour: parent stays checked' ).toBeChecked();

		// 3. Uncheck the parent and land back on the unfiltered catalogue.
		await parent.click();
		await expect( checkedCategoryBoxes ).toHaveCount( 0 );
		await expect( pageButtons ).toHaveCount( unfilteredPages );
		await expect( names ).toHaveText( unfilteredNames );
	} );
} );
