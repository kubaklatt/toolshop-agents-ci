import { test, expect } from '@playwright/test';

test( 'GET /products returns a paginated list', async ( { request } ) => {
	const response = await request.get( '/products' );

	expect( response.status() ).toBe( 200 );

	const body = await response.json();

	expect( Array.isArray( body.data ) ).toBe( true );
	expect( body.data.length ).toBeGreaterThan( 0 );
} );
