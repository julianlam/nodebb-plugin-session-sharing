'use strict';

var meta = require.main.require('./src/meta');
var user = require.main.require('./src/user');
var groups = require.main.require('./src/groups');
var SocketPlugins = require.main.require('./src/socket.io/plugins');

var winston = module.parent.require('winston');
var nconf = module.parent.require('nconf');

var _ = require('lodash');
var async = require('async');

var db = require.main.require('./src/database');
var plugins = require.main.require('./src/plugins');

var jwt = require('jsonwebtoken');

var controllers = require('./lib/controllers');
var nbbAuthController = require.main.require('./src/controllers/authentication');

/* all the user profile fields that can be passed to user.updateProfile */
var profileFields = [
	'username',
	'email',
	'fullname',
	'website',
	'location',
	'groupTitle',
	'birthday',
	'signature',
	'aboutme',
];
var payloadKeys = profileFields.concat([
	'id', // the uniq identifier of that account
	'firstName', // for backwards compatibillity
	'lastName', // dto.
	'picture',
	'groups',
]);

var plugin = {
	ready: false,
	settings: {
		name: 'appId',
		cookieName: 'token',
		cookieDomain: undefined,
		secret: '',
		behaviour: 'trust',
		adminRevalidate: 'off',
		noRegistration: 'off',
		payloadParent: undefined,
	},
};

payloadKeys.forEach(function (key) {
	plugin.settings['payload:' + key] = key;
});

plugin.init = function (params, callback) {
	var router = params.router;
	var hostMiddleware = params.middleware;

	router.get('/admin/plugins/session-sharing', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
	router.get('/api/admin/plugins/session-sharing', controllers.renderAdminPage);

	router.get('/api/session-sharing/lookup', controllers.retrieveUser);
	router.post('/api/session-sharing/user', controllers.process);

	if (process.env.NODE_ENV === 'development') {
		router.get('/debug/session', plugin.generate);
	}

	plugin.reloadSettings(callback);
};

plugin.appendConfig = function (config, callback) {
	config.sessionSharing = {
		logoutRedirect: plugin.settings.logoutRedirect,
		loginOverride: plugin.settings.loginOverride,
		registerOverride: plugin.settings.registerOverride,
		editOverride: plugin.settings.editOverride,
		hostWhitelist: plugin.settings.hostWhitelist,
	};

	callback(null, config);
};

/* Websocket Listeners */

SocketPlugins.sessionSharing = {};

SocketPlugins.sessionSharing.showUserIds = function (socket, data, callback) {
	// Retrieve the hash and find matches
	var uids = data.uids;
	var payload = [];

	payload.length = uids.length;

	if (uids.length) {
		async.map(uids, function (uid, next) {
			db.getSortedSetRangeByScore(plugin.settings.name + ':uid', 0, -1, uid, uid, next);
		}, function (err, remoteIds) {
			if (err) {
				return callback(err);
			}

			remoteIds.forEach(function (remoteId, idx) {
				payload[idx] = remoteId;
			});

			callback(null, payload);
		});
	} else {
		callback(new Error('no-uids-supplied'));
	}
};

SocketPlugins.sessionSharing.findUserByRemoteId = function (socket, data, callback) {
	if (data.remoteId) {
		plugin.getUser(data.remoteId, callback);
	} else {
		callback(new Error('no-remote-id-supplied'));
	}
};

/* End Websocket Listeners */

/*
 *	Given a remoteId, show user data
 */
plugin.getUser = function (remoteId, callback) {
	async.waterfall([
		async.apply(db.sortedSetScore, plugin.settings.name + ':uid', remoteId),
		function (uid, next) {
			if (uid) {
				user.getUserFields(uid, ['username', 'userslug', 'picture'], next);
			} else {
				setImmediate(next);
			}
		},
	], callback);
};

plugin.process = function (token, callback) {
	async.waterfall([
		async.apply(jwt.verify, token, plugin.settings.secret),
		async.apply(plugin.normalizePayload),
		async.apply(plugin.findOrCreateUser),
		async.apply(plugin.updateUserProfile),
		async.apply(plugin.updateUserGroups),
		async.apply(plugin.verifyUser, token),
	], callback);
};

plugin.normalizePayload = function (payload, callback) {
	var userData = {};

	if (plugin.settings.payloadParent) {
		payload = payload[plugin.settings.payloadParent];
	}

	if (typeof payload !== 'object') {
		winston.warn('[session-sharing] the payload is not an object', payload);
		return callback(new Error('payload-invalid'));
	}

	payloadKeys.forEach(function (key) {
		var propName = plugin.settings['payload:' + key];
		if (payload[propName]) {
			userData[key] = payload[propName];
		}
	});

	if (!userData.id) {
		winston.warn('[session-sharing] No user id was given in payload');
		return callback(new Error('payload-invalid'));
	}

	userData.fullname = (userData.fullname || [userData.firstName, userData.lastName].join(' ')).trim();

	if (!userData.username) {
		userData.username = userData.fullname;
	}

	/* strip username from illegal characters */
	userData.username = userData.username.trim().replace(/[^'"\s\-.*0-9\u00BF-\u1FFF\u2C00-\uD7FF\w]+/, '-');

	if (!userData.username) {
		winston.warn('[session-sharing] No valid username could be determined');
		return callback(new Error('payload-invalid'));
	}

	if (userData.hasOwnProperty('groups') && !Array.isArray(userData.groups)) {
		winston.warn('[session-sharing] Array expected for `groups` in JWT payload. Ignoring.');
		delete userData.groups;
	}

	winston.verbose('[session-sharing] Payload verified');
	plugins.fireHook('filter:sessionSharing.normalizePayload', {
		payload: payload,
		userData: userData,
	}, function (err, data) {
		callback(err, data.userData);
	});
};

plugin.verifyUser = function (token, uid, isNewUser, callback) {
	plugins.fireHook('static:sessionSharing.verifyUser', {
		uid: uid,
		isNewUser: isNewUser,
		token: token,
	}, function (err) {
		if (err) {
			return callback(err);
		}
		// Check ban state of user, reject if banned
		user.bans.isBanned(uid, function (err, banned) {
			callback(err || banned ? new Error('banned') : null, uid);
		});
	});
};

plugin.findOrCreateUser = function (userData, callback) {
	var queries = {};
	if (userData.email && userData.email.length) {
		queries.mergeUid = async.apply(db.sortedSetScore, 'email:uid', userData.email);
	}
	queries.uid = async.apply(db.sortedSetScore, plugin.settings.name + ':uid', userData.id);

	async.parallel(queries, function (err, checks) {
		if (err) { return callback(err); }

		async.waterfall([
			/* check if found something to work with */
			function (next) {
				if (checks.uid && !isNaN(parseInt(checks.uid, 10))) {
					var uid = parseInt(checks.uid, 10);
					/* check if the user with the given id actually exists */
					return user.exists(uid, function (err, exists) {
						/* ignore errors, but assume the user doesn't exist  */
						if (err) {
							winston.warn('[session-sharing] Error while testing user existance', err);
							return next(null, null);
						}
						if (exists) {
							return next(null, uid);
						}
						/* reference is outdated, user got deleted */
						db.sortedSetRemove(plugin.settings.name + ':uid', userData.id, function (err) {
							next(err, null);
						});
					});
				}
				if (checks.mergeUid && !isNaN(parseInt(checks.mergeUid, 10))) {
					winston.info('[session-sharing] Found user via their email, associating this id (' + userData.id + ') with their NodeBB account');
					return db.sortedSetAdd(plugin.settings.name + ':uid', checks.mergeUid, userData.id, function (err) {
						next(err, parseInt(checks.mergeUid, 10));
					});
				}
				setImmediate(next, null, null);
			},
			/* create the user from payload if necessary */
			function (uid, next) {
				winston.debug('createUser?', !uid);
				if (!uid) {
					if (plugin.settings.noRegistration === 'on') {
						return next(new Error('no-match'));
					}
					return plugin.createUser(userData, function (err, uid) {
						next(err, uid, userData, true);
					});
				}
				setImmediate(next, null, uid, userData, false);
			},
		], callback);
	});
};

plugin.updateUserProfile = function (uid, userData, isNewUser, callback) {
	winston.debug('consider updateProfile?', isNewUser || plugin.settings.updateProfile === 'on');

	/* even update the profile on a new account, since some fields are not initialized by NodeBB */
	if (!isNewUser && plugin.settings.updateProfile !== 'on') {
		return setImmediate(callback, null, uid, userData, isNewUser);
	}

	async.waterfall([
		function (next) {
			user.getUserFields(uid, profileFields, next);
		},
		function (existingFields, next) {
			var obj = {};

			profileFields.forEach(function (field) {
				if (typeof userData[field] !== 'undefined' && existingFields[field] !== userData[field]) {
					obj[field] = userData[field];
				}
			});

			if (Object.keys(obj).length) {
				winston.debug('[session-sharing] Updating profile fields:', obj);
				obj.uid = uid;
				return user.updateProfile(uid, obj, function (err, userObj) {
					if (err) {
						winston.warn('[session-sharing] Unable to update profile information for uid: ' + uid + '(' + err.message + ')');
					}

					// If it errors out, not that big of a deal, continue anyway.
					next(null, userObj || existingFields);
				});
			}
			setImmediate(next, null, {});
		},
		function (userObj, next) {
			if (userData.picture) {
				return db.setObjectField('user:' + uid, 'picture', userData.picture, next);
			}

			setImmediate(next, null);
		},
	], function (err) {
		return callback(err, uid, userData, isNewUser);
	});
};

plugin.updateUserGroups = function (uid, userData, isNewUser, callback) {
	if (!userData.groups || !Array.isArray(userData.groups)) {
		return setImmediate(callback, null, uid, isNewUser);
	}

	async.waterfall([
		// Retrieve user groups
		async.apply(groups.getUserGroupsFromSet, 'groups:createtime', [uid]),
		function (groups, next) {
			// Normalize user group data to just group names
			groups = groups[0].map(function (groupObj) {
				return groupObj.name;
			});

			// Build join and leave arrays
			var join = userData.groups.filter(function (name) {
				return !groups.includes(name);
			});

			if (plugin.settings.syncGroupList === 'on') {
				join = join.filter(group => plugin.settings.syncGroups.includes(group));
			}

			var leave = groups.filter(function (name) {
				// `registered-users` is always a joined group
				if (name === 'registered-users') {
					return false;
				}

				return !userData.groups.includes(name);
			});

			if (plugin.settings.syncGroupList === 'on') {
				leave = leave.filter(group => plugin.settings.syncGroups.includes(group));
			}

			executeJoinLeave(uid, join, leave, next);
		},
	], function (err) {
		return callback(err, uid, isNewUser);
	});
};

function executeJoinLeave(uid, join, leave, callback) {
	async.parallel([
		function (next) {
			if (plugin.settings.syncGroupJoin !== 'on') {
				return setImmediate(next);
			}

			async.each(join, function (name, next) {
				groups.join(name, uid, next);
			}, next);
		},
		function (next) {
			if (plugin.settings.syncGroupLeave !== 'on') {
				return setImmediate(next);
			}

			async.each(leave, function (name, next) {
				groups.leave(name, uid, next);
			}, next);
		},
	], callback);
}

plugin.createUser = function (userData, callback) {
	winston.verbose('[session-sharing] No user found, creating a new user for this login');

	user.create(_.pick(userData, profileFields), function (err, uid) {
		if (err) { return callback(err); }

		db.sortedSetAdd(plugin.settings.name + ':uid', uid, userData.id, function (err) {
			callback(err, uid);
		});
	});
};

plugin.addMiddleware = async function (req, res, next) {
	const { hostWhitelist, guestRedirect, editOverride, loginOverride, registerOverride } = await meta.settings.get('session-sharing');

	if (hostWhitelist) {
		var hosts = hostWhitelist.split(',') || [hostWhitelist];
		var whitelisted = false;
		for (var host of hosts) {
			if (req.headers.host.includes(host)) {
				whitelisted = true;
				break;
			}
		}

		if (!whitelisted) {
			return next();
		}
	}

	function handleGuest(req, res, next) {
		if (guestRedirect && !req.originalUrl.startsWith(nconf.get('relative_path') + '/login?local=1')) {
			// If a guest redirect is specified, follow it
			res.redirect(guestRedirect.replace('%1', encodeURIComponent(req.protocol + '://' + req.get('host') + req.originalUrl)));
		} else if (res.locals.fullRefresh === true) {
			res.redirect(nconf.get('relative_path') + req.url);
		} else {
			next();
		}
	}

	// Only respond to page loads by guests, not api or asset calls
	var hasSession = req.hasOwnProperty('user') && req.user.hasOwnProperty('uid') && parseInt(req.user.uid, 10) > 0;
	var hasLoginLock = req.session.hasOwnProperty('loginLock');

	if (
		!plugin.ready ||	// plugin not ready
		(plugin.settings.behaviour === 'trust' && hasSession) ||	// user logged in + "trust" behaviour
		((plugin.settings.behaviour === 'revalidate' || plugin.settings.behaviour === 'update') && hasLoginLock) ||
		req.originalUrl.startsWith(nconf.get('relative_path') + '/api')	// api routes
	) {
		// Let requests through under "revalidate" behaviour only if they're logging in for the first time
		delete req.session.loginLock;	// remove login lock for "revalidate" logins

		return next();
	}

	if (editOverride && hasSession && req.originalUrl.match(/\/user\/.*\/edit$/)) {
		return res.redirect(editOverride.replace('%1', encodeURIComponent(req.protocol + '://' + req.get('host') + req.originalUrl)));
	}
	if (loginOverride && req.originalUrl.match(/\/login$/)) {
		return res.redirect(loginOverride.replace('%1', encodeURIComponent(req.protocol + '://' + req.get('host') + req.originalUrl)));
	}
	if (registerOverride && req.originalUrl.match(/\/register$/)) {
		return res.redirect(registerOverride.replace('%1', encodeURIComponent(req.protocol + '://' + req.get('host') + req.originalUrl)));
	}

	// Hook into ip blacklist functionality in core
	meta.blacklist.test(req.ip, function (err) {
		if (err) {
			if (hasSession) {
				req.logout();
				res.locals.fullRefresh = true;
			}

			plugin.cleanup({ res: res });
			return handleGuest.call(null, req, res, next);
		}
		if (Object.keys(req.cookies).length && req.cookies.hasOwnProperty(plugin.settings.cookieName) && req.cookies[plugin.settings.cookieName].length) {
			return plugin.process(req.cookies[plugin.settings.cookieName], function (err, uid) {
				if (err) {
					var handleAsGuest = false;

					switch (err.message) {
					case 'banned':
						winston.info('[session-sharing] uid ' + uid + ' is banned, not logging them in');
						req.session.sessionSharing = {
							banned: true,
							uid: uid,
						};
						break;
					case 'payload-invalid':
						winston.warn('[session-sharing] The passed-in payload was invalid and could not be processed');
						break;
					case 'no-match':
						winston.info('[session-sharing] Payload valid, but local account not found.  Assuming guest.');
						handleAsGuest = true;
						break;
					default:
						winston.warn('[session-sharing] Error encountered while parsing token: ' + err.message);
						break;
					}

					return plugins.fireHook('filter:sessionSharing.error', {
						error: err,
						uid: uid,
						res: res,
						settings: plugin.settings,
						handleAsGuest: handleAsGuest,
					}, function (err, data) {
						if (data.handleAsGuest) {
							return handleGuest.call(err, req, res, next);
						}

						next(err);
					});
				}

				winston.verbose('[session-sharing] Processing login for uid ' + uid + ', path ' + req.originalUrl);
				req.uid = uid;

				if (plugin.settings.behaviour === 'revalidate') {
					res.locals.reroll = false;	// disable session rerolling in core
				}

				nbbAuthController.doLogin(req, uid, function () {
					req.session.loginLock = true;
					const url = req.session.returnTo || req.originalUrl.replace(nconf.get('relative_path'), '');
					delete req.session.returnTo;
					res.redirect(nconf.get('relative_path') + url);
				});
			});
		} else if (hasSession) {
			// Has login session but no cookie, can assume "revalidate" behaviour
			user.isAdministrator(req.user.uid, function (err, isAdmin) {
				if (plugin.settings.behaviour !== 'update' && (plugin.settings.adminRevalidate === 'on' || !isAdmin)) {
					req.logout();
					res.locals.fullRefresh = true;
					handleGuest(req, res, next);
				} else {
					// Admins can bypass
					return next(err);
				}
			});
		} else {
			handleGuest.call(null, req, res, next);
		}
	});
};

plugin.cleanup = function (data, callback) {
	if (plugin.settings.cookieDomain) {
		winston.verbose('[session-sharing] Clearing cookie');
		data.res.clearCookie(plugin.settings.cookieName, {
			domain: plugin.settings.cookieDomain,
			expires: new Date(),
			path: '/',
		});
	}

	if (typeof callback === 'function') {
		callback();
	} else {
		return true;
	}
};

plugin.generate = function (req, res) {
	var payload = {};
	payload[plugin.settings['payload:id']] = 1;
	payload[plugin.settings['payload:username']] = 'testUser';
	payload[plugin.settings['payload:email']] = 'testUser@example.org';
	payload[plugin.settings['payload:firstName']] = 'Test';
	payload[plugin.settings['payload:lastName']] = 'User';
	payload[plugin.settings['payload:location']] = 'Testlocation';
	payload[plugin.settings['payload:birthday']] = '04/01/1981';
	payload[plugin.settings['payload:website']] = 'nodebb.org';
	payload[plugin.settings['payload:aboutme']] = 'I am just testing';
	payload[plugin.settings['payload:signature']] = 'T User';
	payload[plugin.settings['payload:groupTitle']] = 'TestUsers';
	payload[plugin.settings['payload:groups']] = ['test-group'];

	if (plugin.settings.payloadParent || plugin.settings['payload:parent']) {
		var parentKey = plugin.settings.payloadParent || plugin.settings['payload:parent'];
		var newPayload = {};
		newPayload[parentKey] = payload;
		payload = newPayload;
	}

	var token = jwt.sign(payload, plugin.settings.secret);
	res.cookie(plugin.settings.cookieName, token, {
		maxAge: 1000 * 60 * 60 * 24 * 21,
		httpOnly: true,
		domain: plugin.settings.cookieDomain,
	});

	res.sendStatus(200);
};

plugin.addAdminNavigation = function (header, callback) {
	header.plugins.push({
		route: '/plugins/session-sharing',
		icon: 'fa-user-secret',
		name: 'Session Sharing',
	});

	callback(null, header);
};

plugin.reloadSettings = function (callback) {
	// If callback is not a function then it is the action hook from core
	if (typeof callback !== 'function' && callback.plugin !== 'session-sharing') {
		return;
	}

	meta.settings.get('session-sharing', function (err, settings) {
		if (err) {
			return callback(err);
		}

		if (!settings.hasOwnProperty('secret') || !settings.secret.length) {
			winston.error('[session-sharing] JWT Secret not found, session sharing disabled.');
			return callback();
		}

		// If "payload:parent" is found, but payloadParent is not, update the latter and delete the former
		if (!settings.payloadParent && settings['payload:parent']) {
			winston.verbose('[session-sharing] Migrating payload:parent to payloadParent');
			settings.payloadParent = settings['payload:parent'];
			db.setObjectField('settings:session-sharing', 'payloadParent', settings.payloadParent);
			db.deleteObjectField('settings:session-sharing', 'payload:parent');
		}

		if (!settings['payload:username'] && !settings['payload:firstName'] && !settings['payload:lastName'] && !settings['payload:fullname']) {
			settings['payload:username'] = 'username';
		}

		winston.info('[session-sharing] Settings OK');
		plugin.settings = _.defaults(_.pickBy(settings, Boolean), plugin.settings);
		plugin.ready = true;

		if (typeof callback === 'function') {
			callback();
		}
	});
};

plugin.appendTemplate = (data, callback) => {
	if (data.req.session.sessionSharing && data.req.session.sessionSharing.banned) {
		user.getLatestBanInfo(data.req.session.sessionSharing.uid, (err, info) => {
			if (err) {
				return callback(err);
			}

			data.templateData.sessionSharingBan = {
				ban: info,
				banned: true,
			};

			delete data.req.session.sessionSharing;
			callback(null, data);
		});

		return;
	}

	setImmediate(callback, null, data);
};

module.exports = plugin;
