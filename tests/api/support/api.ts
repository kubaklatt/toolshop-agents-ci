import type { APIRequestContext } from '@playwright/test';

/** Crockford base32 ULID shape; case-insensitive and stable across reseeds. */
export const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export const DEMO_CUSTOMER = {
	email: 'customer@practicesoftwaretesting.com',
	// Published in the application's own README — a fixture, not a secret.
	password: 'welcome01'
} as const;

export async function loginAsCustomer( request: APIRequestContext ): Promise<string> {
	const response = await request.post( '/users/login', { data: DEMO_CUSTOMER } );

	if ( ! response.ok() ) {
		throw new Error( `Login failed with ${ response.status() }: ${ await response.text() }` );
	}

	const { access_token: accessToken } = await response.json();

	if ( ! accessToken ) {
		throw new Error( 'Login succeeded but returned no access_token' );
	}

	return accessToken;
}
