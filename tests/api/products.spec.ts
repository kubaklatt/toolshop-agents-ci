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
	// Derive a non-empty price band from live data. Accepting an empty response
	// would make the range assertions vacuously true and test no filtering at all.
	const seedResponse = await request.get( '/products?sort=price,asc' );
	expect( seedResponse.status() ).toBe( 200 );

	const seedPrices: number[] = ( await seedResponse.json() ).data.map( ( p: { price: number } ) => p.price );
	expect( seedPrices.length ).toBeGreaterThan( 1 );

	const min = Math.min( ...seedPrices );
	const max = Math.max( ...seedPrices );
	const response = await request.get( `/products?between=price,${ min },${ max }` );

	expect( response.status() ).toBe( 200 );

	const prices: number[] = ( await response.json() ).data.map( ( p: { price: number } ) => p.price );

	expect( prices.length, 'the live-data price band must return products' ).toBeGreaterThan( 0 );

	for ( const price of prices ) {
		expect( price ).toBeGreaterThanOrEqual( min );
		expect( price ).toBeLessThanOrEqual( max );
	}
} );

test( 'GET /products/{id} agrees with the list entry it came from', async ( { request } ) => {
	const listResponse = await request.get( '/products?page=1' );
	expect( listResponse.status() ).toBe( 200 );

	const list = await listResponse.json();
	expect( list.data.length ).toBeGreaterThan( 0 );

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
