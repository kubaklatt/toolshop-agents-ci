// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { catalog, readNames } from './support/catalog.js';

test.describe( 'Category filters', () => {
	test( 'Checking a parent category auto-selects all of its subcategories', async ( { page } ) => {
		const { names, categoryBoxes, checkedCategoryBoxes, pageButtons } = catalog( page );

		await page.goto( '/' );
		await expect( names.first() ).toBeVisible();

		await expect( categoryBoxes.first() ).toBeVisible();
		await expect( checkedCategoryBoxes, 'no category should be pre-selected' ).toHaveCount( 0 );

		await expect( pageButtons.first() ).toBeVisible();

		const unfilteredNames = await readNames( names );
		const unfilteredPages = await pageButtons.count();

		expect( unfilteredNames.length ).toBeGreaterThan( 0 );
		expect( unfilteredPages, 'this scenario needs a catalogue larger than one page' ).toBeGreaterThan( 1 );

		const parent = categoryBoxes.first();

		await parent.click();

		await expect( checkedCategoryBoxes.first() ).toBeChecked();

		const checkedAfterParent = await checkedCategoryBoxes.count();

		expect( checkedAfterParent, 'checking a parent should select the parent and its children' )
			.toBeGreaterThan( 1 );

		await expect( pageButtons, 'filtering to one category must shrink the result set' )
			.not.toHaveCount( unfilteredPages );

		const filteredPages = await pageButtons.count();

		expect( filteredPages ).toBeLessThan( unfilteredPages );

		await parent.click();
		await expect( checkedCategoryBoxes ).toHaveCount( 0 );

		// Clearing is immediate; restoring the grid waits on the shared demo backend.
		await expect( names ).toHaveText( unfilteredNames, { timeout: 15_000 } );
	} );
} );
