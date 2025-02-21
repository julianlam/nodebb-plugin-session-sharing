'use strict';

const winston = require.main.require('winston');

const db = require.main.require('./src/database');
const batch = require.main.require('./src/batch');
const meta = require.main.require('./src/meta');

module.exports = {
	name: 'Convert remote-to-local user ID from hash to sorted set',
	timestamp: Date.UTC(2017, 9, 19),
	method: async function () {
		try {
			const progress = this.progress;
			// Reload plugin settings and grab appID setting
			const settings = await meta.settings.get('session-sharing');
			winston.verbose('getting data');

			if (!settings.secret) {
				// No secret set, skip upgrade as completed.
				return;
			}

			const pluginKey = (settings.name || 'appId') + ':uid';
			// session-sharing is set up, execute upgrade
			const hashData = await db.getObject(pluginKey);

			await db.rename(pluginKey, 'backup:' + pluginKey);

			winston.verbose('constructing array');
			const values = Object.keys(hashData);

			progress.total = values.length;
			winston.verbose('saving into db');
			await batch.processArray(values, async (batchValues) => {
				progress.incr(batchValues.length);
				await db.sortedSetAdd(pluginKey, batchValues.map(v => hashData[v]), batchValues);
			}, {
				batch: 500,
			});
		} catch (err) {
			if (err && err.message !== 'WRONGTYPE Operation against a key holding the wrong kind of value') {
				throw err;
			}
		}
	},
};
