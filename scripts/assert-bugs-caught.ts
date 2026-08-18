/** Verify that api-buggy fails for every known defect and nowhere else. */

const PROJECT = 'api-buggy';

// Defects confirmed manually, keyed by the test that must catch each one.
const KNOWN_DEFECTS: Record<string, string> = {
	'GET /invoices refuses to serve invoices to an anonymous caller':
		'Authorisation bypass: anonymous GET /invoices answers 200 and returns other ' +
		'customers\' invoices (user_id, dates, billing details) instead of 401.',

	'GET /brands returns ULID identifiers, not sequential integers':
		'Broken contract: brands come back with integer ids (1, 2, 3…) and placeholder ' +
		'names ("Brand name 1") rather than the documented ULIDs.',

	'GET /products returns a self-consistent page envelope':
		'Broken contract: product ids are integers, so anything consuming the documented ' +
		'ULID shape breaks.',

	'GET /products/{unknown id} returns 404, not an empty 200':
		'Integer coercion on the id path segment: GET /products/7abc returns product 7 and ' +
		'GET /products/01ZZZ… returns product 1. A malformed id silently resolves to the ' +
		'wrong resource instead of 404.'
};

type Spec = { title: string; ok: boolean; tests?: { projectName?: string }[] };
type Suite = { specs?: Spec[]; suites?: Suite[] };

function collectSpecs( suites: Suite[] = [] ): Spec[] {
	return suites.flatMap( suite => [ ...( suite.specs ?? [] ), ...collectSpecs( suite.suites ) ] );
}

const reportPath = process.argv[ 2 ] ?? 'test-results/buggy.json';
const report = JSON.parse( await ( await import( 'node:fs/promises' ) ).readFile( reportPath, 'utf8' ) );

const specs = collectSpecs( report.suites ).filter(
	spec => ( spec.tests ?? [] ).some( t => t.projectName === PROJECT )
);

if ( specs.length === 0 ) {
	console.error( `No ${ PROJECT } results found in ${ reportPath }. Did the run start at all?` );
	process.exit( 1 );
}

const failed = new Set( specs.filter( spec => ! spec.ok ).map( spec => spec.title ) );
const expected = Object.keys( KNOWN_DEFECTS );

const undetected = expected.filter( title => ! failed.has( title ) );
const unexpected = [ ...failed ].filter( title => ! ( title in KNOWN_DEFECTS ) );

const lines: string[] = [];
lines.push( `## Bug hunt against \`${ PROJECT }\`` );
lines.push( '' );
lines.push( `${ specs.length } tests ran. ${ failed.size } failed, ${ expected.length } defects expected.` );
lines.push( '' );

lines.push( '| Known defect | Caught |' );
lines.push( '| --- | --- |' );
for ( const title of expected ) {
	lines.push( `| ${ KNOWN_DEFECTS[ title ] } | ${ failed.has( title ) ? 'yes' : '**NO**' } |` );
}
lines.push( '' );

if ( undetected.length > 0 ) {
	lines.push( '### The suite stopped detecting a known defect' );
	lines.push( '' );
	lines.push( 'These tests passed against the broken build. Either the defect was fixed upstream' );
	lines.push( '(update KNOWN_DEFECTS) or the test was weakened until it no longer asserts anything.' );
	lines.push( '' );
	for ( const title of undetected ) {
		lines.push( `- ${ title }` );
	}
	lines.push( '' );
}

if ( unexpected.length > 0 ) {
	lines.push( '### Unexpected failure' );
	lines.push( '' );
	lines.push( 'Not a catalogued defect — a new bug in the broken build, or a flaky test.' );
	lines.push( 'Investigate before accepting this run.' );
	lines.push( '' );
	for ( const title of unexpected ) {
		lines.push( `- ${ title }` );
	}
	lines.push( '' );
}

const summary = lines.join( '\n' );
console.log( summary );

// Feed the GitHub Actions job summary when running in CI.
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

if ( summaryFile ) {
	await ( await import( 'node:fs/promises' ) ).appendFile( summaryFile, summary + '\n' );
}

if ( undetected.length > 0 || unexpected.length > 0 ) {
	console.error( '\nBug hunt failed: the suite did not fail in exactly the expected places.' );
	process.exit( 1 );
}

console.log( 'Every catalogued defect was caught, and nothing else broke.' );
