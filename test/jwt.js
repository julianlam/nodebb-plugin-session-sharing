'use strict';

/* globals describe, it */

// Standalone (no NodeBB required) regression tests for the jsonwebtoken v9 upgrade (CVE-2022-23539).
// The plugin signs and verifies with a string HMAC secret (see library.js), so that is what is tested here.

const assert = require('assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const secret = 's3cr37c47';
const algorithms = ['HS256', 'HS384', 'HS512'];

describe('jsonwebtoken compatibility', () => {
	it('should verify a token signed with a string secret (plugin default, HS256)', () => {
		const token = jwt.sign({ id: 123, username: 'foo' }, secret);
		assert.strictEqual(jwt.decode(token, { complete: true }).header.alg, 'HS256');

		const payload = jwt.verify(token, secret, { algorithms });
		assert.strictEqual(payload.id, 123);
		assert.strictEqual(payload.username, 'foo');
	});

	it('should reject a token signed with a different secret', () => {
		const token = jwt.sign({ id: 123 }, 'other-secret');
		assert.throws(() => jwt.verify(token, secret, { algorithms }), { name: 'JsonWebTokenError' });
	});

	it('should reject an unsigned (alg: none) token', () => {
		const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
		const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ id: 123 })}.`;
		assert.throws(() => jwt.verify(token, secret, { algorithms }), { name: 'JsonWebTokenError' });
	});

	it('should reject a token signed with an algorithm outside the allowlist', () => {
		const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
		const token = jwt.sign({ id: 123 }, privateKey, { algorithm: 'RS256' });
		assert.throws(() => jwt.verify(token, secret, { algorithms }), { name: 'JsonWebTokenError' });
	});

	it('should not accept a public key as an HMAC secret (CVE-2022-23539 key confusion)', () => {
		const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
		const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

		// Attacker forges an HS256 token using the (public) PEM as the HMAC secret
		const forged = jwt.sign({ id: 1 }, publicPem, { algorithm: 'HS256' });
		assert.throws(() => jwt.verify(forged, publicKey), Error);
		assert.throws(() => jwt.verify(forged, publicPem, { algorithms: ['RS256'] }), Error);

		// Legit RS256 flow still works with a matching key pair
		const token = jwt.sign({ id: 1 }, privateKey, { algorithm: 'RS256' });
		assert.strictEqual(jwt.verify(token, publicKey, { algorithms: ['RS256'] }).id, 1);
	});
});
