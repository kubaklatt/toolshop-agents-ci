import { test, expect } from '@playwright/test';
import { ULID } from './support/api.js';

test( 'GET /brands returns ULID identifiers, not sequential integers', async ( { request } ) => {
	const response = await request.get( '/brands' );

	expect( response.status() ).toBe( 200 );

	const brands = await response.json();

	expect( Array.isArray( brands ) ).toBe( true );
	expect( brands.length ).toBeGreaterThan( 0 );

	for ( const brand of brands ) {
		// An integer id here is not a cosmetic difference: it means the record
		// came from somewhere other than the real catalogue, and it makes ids
		// guessable for anything that accepts a brand id.
		expect( typeof brand.id, `brand "${ brand.name }" has a non-string id` ).toBe( 'string' );
		expect( String( brand.id ) ).toMatch( ULID );
		expect( typeof brand.slug ).toBe( 'string' );
	}
} );
