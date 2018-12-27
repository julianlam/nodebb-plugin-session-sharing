'use strict';

var db = module.parent.require('./database');

var async = module.parent.require('async');
var winston = module.parent.require('winston');

var meta = module.parent.require('./meta');

var settings;

module.exports = {
	name: 'Convert remote-to-local user ID from hash to sorted set',
	timestamp: Date.UTC(2017, 9, 19),
	method: function (callback) {
		var progress = this.progress;
		async.waterfall([
			// Reload plugin settings and grab appID setting
			async.apply(meta.settings.get, 'session-sharing'),
			function (_settings, next) {
				settings = _settings;
				winston.verbose('getting data');
				if (settings.secret) {
					// session-sharing is set up, execute upgrade
					db.getObject((settings.name || 'appId') + ':uid', next);
				} else {
					// No secret set, skip upgrade as completed.
					setImmediate(next, true);
				}
			},

			// Save a backup of the hash data in another key
			function (hashData, next) {
				db.rename((settings.name || 'appId') + ':uid', 'backup:' + (settings.name || 'appId') + ':uid', function (err) {
					next(err, hashData);
				});
			},

			// Save new zset
			function (hashData, next) {
				winston.verbose('constructing array');
				var values = [];

				for(var remoteId in hashData) {
					if (hashData.hasOwnProperty(remoteId)) {
						values.push(remoteId);
					}
				}
				progress.total = values.length;
				winston.verbose('saving into db');
				async.eachSeries(values, function (value, next) {
					progress.incr();
					db.sortedSetAdd((settings.name || 'appId') + ':uid', hashData[value], value, next);
				}, next);
			}
		], function (err) {
			if (typeof err === 'boolean') {
				// No upgrade needed
				return callback();
			} else if (err && err.message === 'WRONGTYPE Operation against a key holding the wrong kind of value') {
				// Likely script already run, all is well
				err = null;
			}

			callback(err);
		});
	},
};
