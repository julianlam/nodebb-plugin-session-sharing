'use strict';

/* globals describe, it */

// MUST BE RUN WITH ENV VAR "TEST_ENV=development"
// Don't forget to add this plugin to `test_plugins` array in `config.json`

const assert = require('assert');
const crypto = require('crypto');
const url = require('url');
const util = require('util');
const request = require('request-promise-native');

const db = nodebb.require('./test/mocks/databasemock');

const nconf = nodebb.require('nconf');
const meta = nodebb.require('./src/meta');

/*
 * meta.settings.setOne fires the `action:settings.set` hook without awaiting it,
 * so the plugin's reloadSettings may still be running when setOne resolves.
 * Awaiting reloadSettings directly keeps these tests deterministic.
 * (Required lazily to avoid a circular dependency while mocha loads the suite.)
 */
const setSetting = async (key, value) => {
	await meta.settings.setOne('session-sharing', key, value);
	await require('../library').reloadSettings();
};

describe('nodebb-plugin-session-sharing', () => {
	const userJar = request.jar();
	const anonJar = request.jar();
	const { protocol, hostname } = url.parse(nconf.get('url'));

	describe('debug route', () => {
		it('should 404 when no secret is set', async () => {
			const response = await request(`${nconf.get('url')}/debug/session`, {
				jar: userJar,
				resolveWithFullResponse: true,
				simple: false,
			});

			assert.strictEqual(response.statusCode, 404);

			await setSetting('secret', 's3cr37c47');
		});

		it('should generate a valid session when called', async () => {
			const body = await request(`${nconf.get('url')}/debug/session`, {
				jar: userJar,
			});
			assert.strictEqual(body, 'OK');

			const cookies = userJar.getCookies(`${protocol}//${hostname}/`);
			assert(cookies);
			assert(cookies.some(cookie => cookie.key === 'token'));
		});
	});

	describe('token processing middleware', () => {
		it('should automatically log in a user with a valid token', async () => {
			const getSession = util.promisify(db.sessionStore.get.bind(db.sessionStore));
			const response = await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar: userJar,
			});
			assert.strictEqual(response.statusCode, 200);

			const cookies = userJar.getCookies(`${protocol}//${hostname}/`);
			assert(cookies);

			const sidCookie = cookies.find(cookie => cookie.key === 'express.sid');
			assert(sidCookie);

			let sid = sidCookie.value.match(/s%3A([^.]+)/);
			assert(sid && sid[1]);
			sid = sid[1];
			const sessionObj = await getSession(sid);

			assert(sessionObj && sessionObj.passport && sessionObj.passport.user);
			assert(parseInt(sessionObj.passport.user, 10) > 0);
		});

		it('should transparently pass-through as guest without a token', async () => {
			const response = await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar: anonJar,
			});
			assert.strictEqual(response.statusCode, 200);

			// Core now initialises the guest session (CSRF token), so assert on the
			// session contents: the guest must not have been logged in.
			const getSession = util.promisify(db.sessionStore.get.bind(db.sessionStore));
			const cookies = anonJar.getCookies(`${protocol}//${hostname}/`);
			const sidCookie = cookies.find(cookie => cookie.key === 'express.sid');
			if (sidCookie) {
				let sid = sidCookie.value.match(/s%3A([^.]+)/);
				assert(sid && sid[1]);
				const sessionObj = await getSession(sid[1]);
				assert(!sessionObj || !sessionObj.passport || !sessionObj.passport.user);
			}
		});

		it('should redirect a guest to a specified redirection target if configured', async () => {
			await setSetting('guestRedirect', 'https://example.org');
			const response = await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar: anonJar,
				followRedirect: false,
				simple: false,
			});

			assert(response.statusCode, 302);
			assert.strictEqual(response.headers.location, 'https://example.org');
			await setSetting('guestRedirect', '');
		});

		it('should maintain the login if behaviour is "revalidate"', async () => {
			const getSession = util.promisify(db.sessionStore.get.bind(db.sessionStore));
			await setSetting('behaviour', 'revalidate');

			await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar: userJar,	// now with no token
				followRedirect: false,
				simple: false,
			});

			const cookies = userJar.getCookies(`${protocol}//${hostname}/`);
			assert(cookies);

			const sidCookie = cookies.find(cookie => cookie.key === 'express.sid');
			assert(sidCookie);

			let sid = sidCookie.value.match(/s%3A([^.]+)/);
			assert(sid && sid[1]);
			sid = sid[1];
			const sessionObj = await getSession(sid);
			assert(sessionObj && sessionObj.passport && sessionObj.passport.user);
			assert(parseInt(sessionObj.passport.user, 10) > 0);
		});

		it('should log the user out if behaviour is "revalidate" and the token is gone', async () => {
			const getSession = util.promisify(db.sessionStore.get.bind(db.sessionStore));

			userJar.setCookie('token=', `${protocol}//${hostname}/`);	// remove the token
			await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar: userJar,	// now with no token
				followRedirect: false,
				simple: false,
			});

			const cookies = userJar.getCookies(`${protocol}//${hostname}/`);
			assert(cookies);

			const sidCookie = cookies.find(cookie => cookie.key === 'express.sid');
			assert(sidCookie);

			let sid = sidCookie.value.match(/s%3A([^.]+)/);
			assert(sid && sid[1]);
			sid = sid[1];
			const sessionObj = await getSession(sid);

			assert(sessionObj && (!sessionObj.passport || !sessionObj.passport.uid));

			// Restore userJar's session again
			await request(`${nconf.get('url')}/debug/session`, {
				jar: userJar,
			});
		});
	});

	describe('login override', () => {
		it('should redirect a guest to a specified login override if configured', async () => {
			await setSetting('loginOverride', 'https://example.org/login');
			const response = await request(`${nconf.get('url')}/login`, {
				resolveWithFullResponse: true,
				jar: anonJar,
				followRedirect: false,
				simple: false,
			});

			assert(response.statusCode, 302);
			assert.strictEqual(response.headers.location, 'https://example.org/login');
		});
	});

	describe('register override', () => {
		it('should redirect a guest to a specified register override if configured', async () => {
			await setSetting('registerOverride', 'https://example.org/register');
			const response = await request(`${nconf.get('url')}/register`, {
				resolveWithFullResponse: true,
				jar: anonJar,
				followRedirect: false,
				simple: false,
			});

			assert(response.statusCode, 302);
			assert.strictEqual(response.headers.location, 'https://example.org/register');
		});
	});

	describe('JWE token support', () => {
		const getTokenCookie = (jar) => {
			const cookies = jar.getCookies(`${protocol}//${hostname}/`);
			return cookies.find(cookie => cookie.key === 'token');
		};

		const assertLoggedIn = async (jar) => {
			const getSession = util.promisify(db.sessionStore.get.bind(db.sessionStore));
			const response = await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar,
			});
			assert.strictEqual(response.statusCode, 200);

			const cookies = jar.getCookies(`${protocol}//${hostname}/`);
			const sidCookie = cookies.find(cookie => cookie.key === 'express.sid');
			assert(sidCookie);
			const sid = sidCookie.value.match(/s%3A([^.]+)/)[1];
			const sessionObj = await getSession(sid);

			assert(sessionObj && sessionObj.passport && sessionObj.passport.user);
			assert(parseInt(sessionObj.passport.user, 10) > 0);
		};

		it('should generate and accept an HMAC JWE token', async () => {
			const jweJar = request.jar();
			await setSetting('tokenFormat', 'jwe');

			await request(`${nconf.get('url')}/debug/session`, { jar: jweJar });
			const cookie = getTokenCookie(jweJar);
			assert(cookie);
			assert.strictEqual(cookie.value.split('.').length, 5);

			await assertLoggedIn(jweJar);
		});

		it('should accept a JWS token even when tokenFormat is jwe (auto-detection)', async () => {
			const jwsJar = request.jar();
			await setSetting('tokenFormat', 'jws');

			await request(`${nconf.get('url')}/debug/session`, { jar: jwsJar });
			const cookie = getTokenCookie(jwsJar);
			assert(cookie);
			assert.strictEqual(cookie.value.split('.').length, 3);

			await setSetting('tokenFormat', 'jwe');
			await assertLoggedIn(jwsJar);
		});

		it('should generate and accept an RSA JWE token', async () => {
			const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
			await setSetting('publicKey', publicKey.export({ type: 'spki', format: 'pem' }));
			await setSetting('privateKey', privateKey.export({ type: 'pkcs8', format: 'pem' }));
			await setSetting('signingMethod', 'rsa');
			await setSetting('tokenFormat', 'jwe');

			const rsaJar = request.jar();
			await request(`${nconf.get('url')}/debug/session`, { jar: rsaJar });
			const cookie = getTokenCookie(rsaJar);
			assert(cookie);
			assert.strictEqual(cookie.value.split('.').length, 5);

			await assertLoggedIn(rsaJar);
		});

		it('should reject a JWE token decrypted with the wrong key', async () => {
			const { EncryptJWT } = require('jose');
			const wrongKey = new Uint8Array(crypto.hkdfSync('sha256', 'wrong-secret', 'nodebb-plugin-session-sharing', 'A256GCM', 32));
			const token = await new EncryptJWT({ id: 99999, username: 'intruder' })
				.setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
				.encrypt(wrongKey);

			const badJar = request.jar();
			badJar.setCookie(`token=${token}`, `${protocol}//${hostname}/`);
			const response = await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar: badJar,
				simple: false,
			});

			assert.strictEqual(response.statusCode, 500);
		});

		it('should restore default signing settings', async () => {
			await setSetting('signingMethod', 'hmac');
			await setSetting('tokenFormat', 'jws');
		});
	});
});
