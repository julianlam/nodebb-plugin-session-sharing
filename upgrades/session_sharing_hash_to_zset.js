'use strict';

var db = require.main.require('./src/database');

var async = module.parent.require('async');
var winston = module.parent.require('winston');

var meta = module.parent.require('./meta');

var settings;

module.exports = {
	name: 'Convert remote-to-local user ID from hash to sorted set',
	timestamp: Date.UTC(2017, 9, 19),
	method: function (callback) {
		async.waterfall([
			// Reload plugin settings and grab appID setting
			async.apply(meta.settings.get, 'session-sharing'),
			function (_settings, next) {
				settings = _settings;

				if (settings.name) {
					db.getSortedSetRange(settings.name + ':uid', 0, -1, function (err) {
						if (err && err.code === 'WRONGTYPE') {
							// Proceed with retrieving hash data
							db.getObject(settings.name + ':uid', next);
						} else if (err) {
							next(err);
						} else {
							// No upgrade needed
							next(true);
						}
					})
				} else {
					// No name set, skip upgrade as completed.
					setImmediate(next, true);
				}
			},

			// Save a backup of the hash data in another key
			function (hashData, next) {
				db.setObject('backup:' + settings.name + ':uid', hashData, function (err) {
					next(err, hashData);
				});
			},

			// Delete the original hash
			function (hashData, next) {
				db.delete(settings.name + ':uid', function (err) {
					next(err, hashData);
				});
			},

			// Save new zset
			function (hashData, next) {
				var values = [];
				var scores = [];
				for(var remoteId in hashData) {
					if (hashData.hasOwnProperty(remoteId)) {
						values.push(remoteId);
						scores.push(hashData[remoteId]);
					}
				}

				db.sortedSetAdd(settings.name + ':uid', scores, values, next);
			}
		], function (err) {
			if (typeof err === 'boolean') {
				// No upgrade needed
				return callback();
			}
			
			callback(err);
		});
	},
};
