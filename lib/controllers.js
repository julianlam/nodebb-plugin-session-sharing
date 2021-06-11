'use strict';

var groups = require.main.require('./src/groups');

var Controllers = {};

Controllers.renderAdminPage = async (req, res) => {
	const groupData = await groups.getGroupsFromSet('groups:visible:createtime', 0, -1);
	res.render('admin/plugins/session-sharing', { groups: groupData });
};

Controllers.retrieveUser = function (req, res) {
	const main = module.parent.exports;
	const remoteId = req.query.id;

	if (remoteId) {
		main.getUser(remoteId, function (err, userObj) {
			if (err) {
				res.status(500).json({
					error: err.message,
				});
			} else if (userObj) {
				res.status(200).json(userObj);
			} else {
				res.sendStatus(404);
			}
		});
	} else {
		res.status(400).json({
			error: 'no-id-supplied',
		});
	}
};

Controllers.process = function (req, res) {
	const main = module.parent.exports;

	if (!req.body || !req.body.token) {
		return res.status(400).json({
			error: 'no-token-provided',
		});
	}

	main.process(req.body.token, (err, uid) => {
		if (err) {
			return res.status(500).json({
				error: err.message,
			});
		}

		res.status(200).json({
			uid,
		});
	});
};

module.exports = Controllers;
