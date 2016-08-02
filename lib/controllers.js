'use strict';

var Controllers = {};

Controllers.renderAdminPage = function (req, res) {
	res.render('admin/plugins/session-sharing', {});
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

module.exports = Controllers;