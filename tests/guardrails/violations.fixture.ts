/* eslint-disable */
/**
 * NOT A TEST. This file never runs.
 *
 * It is the fixture for scripts/assert-guardrails-bite.ts: every block below is
 * something an agent actually does when it cannot make a test pass honestly.
 * The script lints this file and fails if any of these slip through, which is
 * how the guardrails are proven to still work rather than merely configured.
 *
 * Excluded from `pnpm lint` via eslint.config.js ignores; the script lints it
 * explicitly with --no-ignore.
 *
 * The `eslint-disable` above keeps editors quiet. The script strips it before
 * linting, so it does not weaken the check.
 */
import { test, expect } from '@playwright/test';

// The healer's escape hatch: cannot fix it, so silence it.
test.fixme( 'fixme instead of a fix', async ( { page } ) => {
	await expect( page.getByRole( 'heading' ) ).toBeVisible();
} );

// Same move, blunter.
test.skip( 'skip instead of a fix', async ( { page } ) => {
	await expect( page.getByRole( 'heading' ) ).toBeVisible();
} );

// Green suite, one test actually running.
test.only( 'only leaves the rest of the suite unrun', async ( { page } ) => {
	await expect( page.getByRole( 'heading' ) ).toBeVisible();
} );

// Cannot fail: nothing is asserted.
test( 'no assertion at all', async ( { page } ) => {
	await page.goto( '/' );
	await page.getByTestId( 'search-query' ).click();
} );

// Turns a race into a slow intermittent failure.
test( 'fixed sleep instead of a condition', async ( { page } ) => {
	await page.goto( '/' );
	await page.waitForTimeout( 3000 );
	await expect( page.getByTestId( 'sort' ) ).toBeVisible();
} );

// Never settles on this app; hangs until timeout.
test( 'waits for networkidle', async ( { page } ) => {
	await page.goto( '/', { waitUntil: 'networkidle' } );
	await expect( page.getByTestId( 'sort' ) ).toBeVisible();
} );

// The assertion sits in a branch that never runs, so the test always passes.
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
