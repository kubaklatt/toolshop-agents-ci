// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe( 'Category & Brand Filters', () => {
	test( 'Checking a parent category auto-selects all of its subcategories', async ( { page } ) => {
		await page.goto( '/' );

		const productNames = page.getByTestId( 'product-name' );
		const handTools = page.getByRole( 'checkbox', { name: 'Hand Tools' } );
		const subcategoryLabels = [ 'Hammer', 'Hand Saw', 'Wrench', 'Screwdriver', 'Pliers', 'Chisels', 'Measures' ];
		const subcategories = subcategoryLabels.map( label => page.getByRole( 'checkbox', { name: label } ) );
		const pageCount = async () => Math.max( await page.locator( 'a[aria-label^="Page-"]' ).count(), 1 );

		const unfilteredNames = await productNames.allTextContents();
		expect( unfilteredNames.length ).toBeGreaterThan( 0 );
		const unfilteredPageCount = await pageCount();

		// 1. Check a top-level parent category checkbox (e.g. 'Hand Tools').
		await handTools.click();
		for ( const subcategory of subcategories ) {
			await expect( subcategory ).toBeChecked();
		}
		const unionNames = await productNames.allTextContents();
		const unionPageCount = await pageCount();
		expect( unionPageCount ).toBeLessThanOrEqual( unfilteredPageCount );

		// 2. Uncheck exactly one of the now-checked subcategory checkboxes, leaving the rest checked.
		const [ hammer, handSaw, wrench, screwdriver, pliers, chisels, measures ] = subcategories;
		await pliers.click();
		await expect( pliers ).not.toBeChecked();
		for ( const subcategory of [ hammer, handSaw, wrench, screwdriver, chisels, measures ] ) {
			await expect( subcategory ).toBeChecked();
		}
		await expect( productNames.first() ).toBeVisible();
		const namesAfterUnchecking = await productNames.allTextContents();
		expect( namesAfterUnchecking ).not.toEqual( unionNames );
		const pageCountAfterUnchecking = await pageCount();
		expect( pageCountAfterUnchecking ).toBeLessThanOrEqual( unionPageCount );

		// 3. Uncheck the parent category checkbox.
		await handTools.click();
		for ( const subcategory of subcategories ) {
			await expect( subcategory ).not.toBeChecked();
		}
		await expect( productNames ).toHaveText( unfilteredNames );
	} );
} );
