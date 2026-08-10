import { test, expect } from '@playwright/test';
import { ULID } from './support/api.js';

test( 'GET /products returns a self-consistent page envelope', async ( { request } ) => {
	const response = await request.get( '/products?page=1' );

	expect( response.status() ).toBe( 200 );

	const page = await response.json();

	expect( page.current_page ).toBe( 1 );
	expect( page.data.length ).toBeGreaterThan( 0 );
	expect( page.data.length ).toBeLessThanOrEqual( page.per_page );

	// The envelope has to agree with itself: a claimed total and per_page must
	// produce the claimed last_page. Reseeding changes the numbers, not the maths.
	expect( page.last_page ).toBe( Math.ceil( page.total / page.per_page ) );

	for ( const product of page.data ) {
		expect( product.id ).toMatch( ULID );
		expect( typeof product.name ).toBe( 'string' );
		expect( typeof product.price ).toBe( 'number' );
	}
} );

test( 'GET /products?sort=price,asc orders by ascending price', async ( { request } ) => {
	const response = await request.get( '/products?sort=price,asc' );

	expect( response.status() ).toBe( 200 );

	const prices: number[] = ( await response.json() ).data.map( ( p: { price: number } ) => p.price );

	expect( prices.length ).toBeGreaterThan( 1 );
	expect( prices ).toEqual( [ ...prices ].sort( ( a, b ) => a - b ) );
} );

test( 'GET /products?between=price filters to the requested range', async ( { request } ) => {
	const response = await request.get( '/products?between=price,1,10' );

	expect( response.status() ).toBe( 200 );

	const prices: number[] = ( await response.json() ).data.map( ( p: { price: number } ) => p.price );

	// The demo data may legitimately contain nothing in this band after a
	// reseed, so an empty result is acceptable — a price outside it is not.
	for ( const price of prices ) {
		expect( price ).toBeGreaterThanOrEqual( 1 );
		expect( price ).toBeLessThanOrEqual( 10 );
	}
} );

test( 'GET /products/{id} agrees with the list entry it came from', async ( { request } ) => {
	const list = await ( await request.get( '/products?page=1' ) ).json();
	const listed = list.data[ 0 ];

	const response = await request.get( `/products/${ listed.id }` );

	expect( response.status() ).toBe( 200 );

	const detail = await response.json();

	expect( detail.id ).toBe( listed.id );
	expect( detail.name ).toBe( listed.name );
	expect( detail.price ).toBe( listed.price );
} );

test( 'GET /products/{unknown id} returns 404, not an empty 200', async ( { request } ) => {
	const response = await request.get( '/products/01ZZZZZZZZZZZZZZZZZZZZZZZZ' );

	expect( response.status() ).toBe( 404 );
} );
