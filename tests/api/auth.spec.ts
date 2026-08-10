import { test, expect } from '@playwright/test';
import { DEMO_CUSTOMER, loginAsCustomer } from './support/api.js';

test( 'POST /users/login issues a token for the demo customer', async ( { request } ) => {
	const response = await request.post( '/users/login', { data: DEMO_CUSTOMER } );

	expect( response.status() ).toBe( 200 );

	const { access_token: accessToken } = await response.json();

	expect( accessToken ).toBeTruthy();
	// Three dot-separated segments — a JWT, not an opaque string or an error body.
	expect( String( accessToken ).split( '.' ) ).toHaveLength( 3 );
} );

test( 'POST /users/login rejects a wrong password with 401', async ( { request } ) => {
	const response = await request.post( '/users/login', {
		data: { ...DEMO_CUSTOMER, password: 'definitely-not-the-password' }
	} );

	expect( response.status() ).toBe( 401 );
} );

test( 'GET /invoices refuses to serve invoices to an anonymous caller', async ( { request } ) => {
	const response = await request.get( '/invoices' );

	// This is the assertion that matters. A 200 here means the endpoint hands
	// other people's invoices — user_id, invoice dates, billing addresses — to
	// anyone who asks, with no token at all.
	expect( response.status(), 'anonymous /invoices must not be served' ).toBe( 401 );
} );

test( 'GET /invoices serves the caller once authenticated', async ( { request } ) => {
	const token = await loginAsCustomer( request );

	const response = await request.get( '/invoices', {
		headers: { Authorization: `Bearer ${ token }` }
	} );

	expect( response.status() ).toBe( 200 );
	expect( Array.isArray( ( await response.json() ).data ) ).toBe( true );
} );
