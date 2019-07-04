'use strict';

var groups = require.main.require('./src/groups');

var Controllers = {};

Controllers.renderAdminPage = function (req, res, next) {
	groups.getGroupsFromSet('groups:visible:createtime', req.uid, 0, -1, function(err, groupData) {
		if (err) {
			return next(err);
		}
		res.render('admin/plugins/session-sharing', { groups: groupData });
	});
};

Controllers.retrieveUser = function(req, res) {
	var main = module.parent.exports,
		remoteId = req.query.id;

	if (remoteId) {
		main.getUser(remoteId, function(err, userObj) {
			if (err) {
				res.status(500).json({
					error: err.message
				});
			} else if (userObj) {
				res.status(200).json(userObj);
			} else {
				res.sendStatus(404);
			}
		});
	} else {
		res.status(400).json({
			error: 'no-id-supplied'
		});
	}
};

Controllers.createUser = function (req, res) {
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
