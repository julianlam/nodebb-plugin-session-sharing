'use strict';

/* globals describe, it */

// MUST BE RUN WITH ENV VAR "TEST_ENV=development"
// Don't forget to add this plugin to `test_plugins` array in `config.json`

const assert = require('assert');
const url = require('url');
const util = require('util');
const request = require('request-promise-native');

// eslint-disable-next-line no-unused-vars
const db = require.main.require('./test/mocks/databasemock');

const nconf = require.main.require('nconf');
const meta = require.main.require('./src/meta');

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

			await meta.settings.setOne('session-sharing', 'secret', 's3cr37c47');
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

			const cookies = anonJar.getCookies(`${protocol}//${hostname}/`);
			assert(cookies.every(cookie => cookie.key !== 'express.sid'));
		});

		it('should redirect a guest to a specified redirection target if configured', async () => {
			await meta.settings.setOne('session-sharing', 'guestRedirect', 'https://example.org');
			const response = await request(`${nconf.get('url')}`, {
				resolveWithFullResponse: true,
				jar: anonJar,
				followRedirect: false,
				simple: false,
			});

			assert(response.statusCode, 302);
			assert.strictEqual(response.headers.location, 'https://example.org');
			await meta.settings.setOne('session-sharing', 'guestRedirect', '');
		});

		it('should maintain the login if behaviour is "revalidate"', async () => {
			const getSession = util.promisify(db.sessionStore.get.bind(db.sessionStore));
			await meta.settings.setOne('session-sharing', 'behaviour', 'revalidate');

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
			await meta.settings.setOne('session-sharing', 'loginOverride', 'https://example.org/login');
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
			await meta.settings.setOne('session-sharing', 'registerOverride', 'https://example.org/register');
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
});
