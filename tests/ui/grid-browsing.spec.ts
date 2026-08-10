// spec: specs/product-catalog.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe( 'Product Grid Browsing & Pagination', () => {
	test( 'Navigating between pages updates the product set without duplicates', async ( { page } ) => {
		await page.goto( '/' );

		const productNames = page.getByTestId( 'product-name' );
		const pageItem = ( name: string ) => page.locator( 'li.page-item', { has: page.getByRole( 'button', { name } ) } );

		// 1. On the homepage, if more than one page exists, record the set of product names (data-test=product-name) shown on page 1.
		await expect( productNames.first() ).toBeVisible();
		const page1Names = await productNames.allTextContents();
		expect( page1Names.length ).toBeGreaterThan( 0 );

		// 2. Click the 'Page-2' pagination button.
		await page.getByRole( 'button', { name: 'Page-2' } ).click();
		await expect( pageItem( 'Page-2' ) ).toHaveClass( /active/ );
		const page2Names = await productNames.allTextContents();
		expect( page2Names ).not.toEqual( page1Names );
		expect( page2Names.some( name => page1Names.includes( name ) ) ).toBe( false );

		// 3. Click the Next (») button.
		await page.getByRole( 'button', { name: 'Next' } ).click();
		await expect( pageItem( 'Page-3' ) ).toHaveClass( /active/ );
		const page3Names = await productNames.allTextContents();
		expect( page3Names.some( name => page2Names.includes( name ) ) ).toBe( false );

		// 4. Click the Previous («) button.
		await page.getByRole( 'button', { name: 'Previous' } ).click();
		await expect( pageItem( 'Page-2' ) ).toHaveClass( /active/ );
		await expect( productNames ).toHaveText( page2Names );

		// 5. Navigate back to page 1 using the 'Page-1' button.
		await page.getByRole( 'button', { name: 'Page-1' } ).click();
		await expect( pageItem( 'Page-1' ) ).toHaveClass( /active/ );
		await expect( productNames ).toHaveText( page1Names );
		await expect( pageItem( 'Previous' ) ).toHaveClass( /disabled/ );
	} );
} );
