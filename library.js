"use strict";

var meta = module.parent.require('./meta'),
	user = module.parent.require('./user');

var _ = module.parent.require('underscore'),
	winston = module.parent.require('winston'),
	async = module.parent.require('async'),
	db = module.parent.require('./database'),
	nconf = module.parent.require('nconf');

var jwt = require('jsonwebtoken');

var controllers = require('./lib/controllers'),

	plugin = {
		ready: false,
		settings: {
			name: 'appId',
			cookieName: 'token',
			secret: '',
			'payload:id': 'id',
			'payload:email': 'email',
			'payload:username': 'username',
			'payload:picture': 'picture'
		}
	};

plugin.init = function(params, callback) {
	var router = params.router,
		hostMiddleware = params.middleware,
		hostControllers = params.controllers;

	router.get('/admin/plugins/session-sharing', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
	router.get('/api/admin/plugins/session-sharing', controllers.renderAdminPage);

	plugin.reloadSettings(callback);
};

plugin.process = function(token, callback) {
	async.waterfall([
		async.apply(jwt.verify, token, plugin.settings.secret),
		async.apply(plugin.verify),
		async.apply(plugin.findUser)
	], callback);
};

plugin.verify = function(payload, callback) {
	var ok = ['payload:id', 'payload:username'].every(function(key) {
		// Verify the required keys exist in the payload, and that they are not null
		return payload.hasOwnProperty(plugin.settings[key]) && payload[plugin.settings[key]].length;
	});

	callback(!ok ? new Error('payload-invalid') : null, ok ? payload : undefined);
};

plugin.findUser = function(payload, callback) {
	// If payload id resolves to a user, return the uid, otherwise register a new user
	winston.verbose('[session-sharing] Payload verified');

	async.parallel({
		uid: async.apply(db.getObjectField, plugin.settings.name + ':uid', payload[plugin.settings['payload:id']]),
		mergeUid: async.apply(db.sortedSetScore, 'email:uid', payload[plugin.settings['payload:email']])
	}, function(err, checks) {
		if (err) { return callback(err); }
		if (checks.uid && !isNaN(parseInt(checks.uid, 10))) { return callback(null, checks.uid); }
		else if (payload.hasOwnProperty(plugin.settings['payload:email']) && payload[plugin.settings['payload:email']].length && checks.mergeUid && !isNaN(parseInt(checks.mergeUid, 10))) {
			winston.info('[session-sharing] Found user via their email, associating this id (' + payload[plugin.settings['payload:id']] + ') with their NodeBB account');
			db.setObjectField(plugin.settings.name + ':uid', payload[plugin.settings['payload:id']], checks.mergeUid);
			return callback(null, checks.mergeUid);
		}

		// If no match, create a new user
		winston.info('[session-sharing] No user found, creating a new user for this login');
		var username = payload[plugin.settings['payload:username']].trim();

		user.create({
			username: username,
			email: payload[plugin.settings['payload:email']],
			picture: payload[plugin.settings['payload:picture']]
		}, function(err, uid) {
			if (err) { return callback(err); }

			db.setObjectField(plugin.settings.name + ':uid', payload[plugin.settings['payload:id']], uid);
			callback(null, uid);
		});
	});
};

plugin.addMiddleware = function(data, callback) {
	data.app.use(function(req, res, next) {
		// Only respond to page loads, not api or asset calls
		var blacklist = new RegExp('^' + nconf.get('relative_path') + '/(api|vendor|uploads|language|templates)?.+\.(css|js|tpl)?$');
		if (req.path.match(blacklist)) {
			return next();
		} else {
			if (req.cookies.hasOwnProperty(plugin.settings.cookieName) && req.cookies[plugin.settings.cookieName].length) {
				return plugin.process(req.cookies[plugin.settings.cookieName], function(err, uid) {
					if (err) {
						switch(err.message) {
							case 'payload-invalid':
								winston.warn('[session-sharing] The passed-in payload was invalid and could not be processed');
								break;
							default:
								winston.warn('[session-sharing] Error encountered while parsing token: ' + err.message);
								break;
						}

						return next();
					}

					winston.info('[session-sharing] Processing login for uid ' + uid);
					req.login({
						uid: uid
					}, function() {
						req.uid = uid;
						next();
					});
				});
			}

			// res.cookie('access_token', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJVc2VySUQiOiI4MzYzIiwiVXNlck5hbWUiOiJqdWxpYW5sYW0iLCJGaXJzdE5hbWUiOiJKdWxpYW4iLCJMYXN0TmFtZSI6IkxhbSJ9.95NdeziNRnO5OOr73wOgQ0fnHO02npi7hh_ejT7PS5s', {
			// 	maxAge: 1000*60*60*24*21,
			// 	httpOnly: true,
			// 	domain: 'julian.is.awesome'
			// })
			next();
		}
	});

	callback();
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/session-sharing',
		icon: 'fa-user-secret',
		name: 'Session Sharing'
	});

	callback(null, header);
};

plugin.reloadSettings = function(callback) {
	meta.settings.get('session-sharing', function(err, settings) {
		if (err) {
			return callback(err);
		}

		if (!settings.hasOwnProperty('secret') || !settings.secret.length) {
			winston.error('[session-sharing] JWT Secret not found, session sharing disabled.');
			return callback();
		}

		winston.info('[session-sharing] Settings OK');
		plugin.settings = _.defaults(_.pick(settings, Boolean), plugin.settings);
		plugin.ready = true;

		callback();
	});
};

module.exports = plugin;