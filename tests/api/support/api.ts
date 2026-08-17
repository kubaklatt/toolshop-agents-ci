import type { APIRequestContext } from '@playwright/test';

/**
 * Crockford base32, 26 characters — the shape of every id this API is
 * documented to return. Asserting the *shape* rather than a value is what
 * makes these tests survive a database reseed.
 *
 * Case-insensitive: Crockford base32 is a case-insensitive encoding, and this
 * API is not consistent about which case it emits — /products comes back
 * upper-case, /brands comes back lower-case. Neither is wrong; only the shape
 * (26 characters, no I/L/O/U) is part of the contract, so the regex asserts
 * that and nothing about casing.
 */
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
