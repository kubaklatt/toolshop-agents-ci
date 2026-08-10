/**
 * Proves the guardrails still bite.
 *
 * eslint.config.js is a list of claims: "an agent cannot silence a test here",
 * "a test with no assertion is rejected here". A config file makes those claims;
 * it does not demonstrate them. A rule can be silently disabled by a plugin
 * upgrade, a renamed rule id, or a stray override, and `pnpm lint` stays green
 * because nothing in the repo violates the rule any more.
 *
 * So: lint a fixture that violates every guardrail on purpose, and fail if any
 * expected rule did not fire. Same shape as scripts/assert-bugs-caught.ts —
 * a check you never saw fail is not a check.
 *
 * Usage: node scripts/assert-guardrails-bite.ts
 */

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';

const FIXTURE = 'tests/guardrails/violations.fixture.ts';
const LINT_TARGET = 'tests/guardrails/.violations.lint.ts';

/** Rule -> the agent behaviour it is there to stop. */
const MUST_FIRE: Record<string, string> = {
	'playwright/no-skipped-test': 'skipping or fixme-ing a test instead of fixing it',
	'playwright/no-focused-test': 'leaving .only() so the rest of the suite never runs',
	'playwright/expect-expect': 'a test that asserts nothing and therefore cannot fail',
	'playwright/no-wait-for-timeout': 'a fixed sleep standing in for a real condition',
	'playwright/no-networkidle': 'waiting for networkidle, which never settles here',
	'playwright/no-conditional-in-test': 'hiding the assertion behind a branch that never runs',
	'playwright/no-commented-out-tests': 'commenting a test out rather than deleting or fixing it'
};

type Message = { ruleId: string | null };
type Result = { messages: Message[] };

// The fixture carries an eslint-disable so editors stay quiet. Strip it, lint the
// copy, then throw the copy away.
const source = await readFile( FIXTURE, 'utf8' );
await writeFile( LINT_TARGET, source.replace( '/* eslint-disable */\n', '' ) );

let results: Result[] = [];

try {
	let stdout = '';

	try {
		stdout = execFileSync(
			'npx',
			[ 'eslint', '--no-ignore', '--format', 'json', LINT_TARGET ],
			{ encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] }
		);
	} catch ( error ) {
		// eslint exits non-zero when it reports problems, which is the expected path.
		stdout = ( error as { stdout?: string } ).stdout ?? '';
	}

	if ( ! stdout.trim() ) {
		throw new Error( 'eslint produced no output — cannot tell whether the guardrails fired.' );
	}

	results = JSON.parse( stdout );
} finally {
	await unlink( LINT_TARGET ).catch( () => {} );
}

const fired = new Set(
	results.flatMap( result => result.messages.map( message => message.ruleId ) ).filter( Boolean ) as string[]
);

const expected = Object.keys( MUST_FIRE );
const silent = expected.filter( rule => ! fired.has( rule ) );

const lines: string[] = [];
lines.push( '## Guardrails' );
lines.push( '' );
lines.push( `Linted \`${ FIXTURE }\`, which violates every guardrail on purpose.` );
lines.push( '' );
lines.push( '| Rule | Stops | Fired |' );
lines.push( '| --- | --- | --- |' );
for ( const rule of expected ) {
	lines.push( `| \`${ rule }\` | ${ MUST_FIRE[ rule ] } | ${ fired.has( rule ) ? 'yes' : '**NO**' } |` );
}
lines.push( '' );

if ( silent.length > 0 ) {
	lines.push( '### A guardrail stopped firing' );
	lines.push( '' );
	lines.push( 'The fixture still contains the violation, so the rule was disabled, renamed,' );
	lines.push( 'or overridden. Until this is fixed, an agent can do this and CI will not notice.' );
	lines.push( '' );
	for ( const rule of silent ) {
		lines.push( `- \`${ rule }\` — ${ MUST_FIRE[ rule ] }` );
	}
	lines.push( '' );
}

const summary = lines.join( '\n' );
console.log( summary );

const summaryFile = process.env.GITHUB_STEP_SUMMARY;

if ( summaryFile ) {
	await ( await import( 'node:fs/promises' ) ).appendFile( summaryFile, summary + '\n' );
}

if ( silent.length > 0 ) {
	console.error( `\n${ silent.length } guardrail(s) no longer fire.` );
	process.exit( 1 );
}

console.log( `All ${ expected.length } guardrails fired.` );
