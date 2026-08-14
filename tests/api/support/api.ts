import type { APIRequestContext } from '@playwright/test';

/**
 * Crockford base32, 26 characters — the shape of every id this API is
 * documented to return. Asserting the *shape* rather than a value is what
 * makes these tests survive a database reseed.
 *
 * Crockford base32 is explicitly case-insensitive (decoders must accept
 * upper, lower, or mixed case) and this API leans on that: product/category
 * ids come back upper-case, brand ids come back lower-case. Both are valid
 * ULIDs, so the pattern matches either case rather than assuming upper-case.
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
