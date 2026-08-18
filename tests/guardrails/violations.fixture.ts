/* eslint-disable */
/**
 * Deliberate violations used only by assert-guardrails-bite.ts.
 * The script removes eslint-disable from a temporary copy before linting it.
 */
import { test, expect } from '@playwright/test';

test.fixme( 'fixme instead of a fix', async ( { page } ) => {
	await expect( page.getByRole( 'heading' ) ).toBeVisible();
} );

test.skip( 'skip instead of a fix', async ( { page } ) => {
	await expect( page.getByRole( 'heading' ) ).toBeVisible();
} );

test.only( 'only leaves the rest of the suite unrun', async ( { page } ) => {
	await expect( page.getByRole( 'heading' ) ).toBeVisible();
} );

test( 'no assertion at all', async ( { page } ) => {
	await page.goto( '/' );
	await page.getByTestId( 'search-query' ).click();
} );

test( 'fixed sleep instead of a condition', async ( { page } ) => {
	await page.goto( '/' );
	await page.waitForTimeout( 3000 );
	await expect( page.getByTestId( 'sort' ) ).toBeVisible();
} );

test( 'waits for networkidle', async ( { page } ) => {
	await page.goto( '/', { waitUntil: 'networkidle' } );
	await expect( page.getByTestId( 'sort' ) ).toBeVisible();
} );

test( 'assertion hidden behind a condition', async ( { page } ) => {
	await page.goto( '/' );

	const badge = page.getByTestId( 'out-of-stock' );

	if ( await badge.count() > 0 ) {
		await expect( badge.first() ).toBeVisible();
	}
} );

// test( 'the quiet version of deleting a test', async ( { page } ) => {
// 	await expect( page.getByTestId( 'sort' ) ).toBeVisible();
// } );
