'use strict';

const groups = require.main.require('./src/groups');

const Controllers = {};

Controllers.renderAdminPage = async (req, res) => {
	const groupData = await groups.getGroupsFromSet('groups:visible:createtime', 0, -1);
	res.render('admin/plugins/session-sharing', { groups: groupData });
};

Controllers.retrieveUser = async (req, res) {
	const main = module.parent.exports;
	const remoteId = req.query.id;
	
	if (!remoteId) {
		return res.status(400).json({
			error: 'no-id-supplied',
		});
	}
	
	try {
		const userObj = await main.getUser(remoteId);

		if (!userObj) {
			return res.sendStatus(404);
		}

		return res.status(200).json(userObj);
	} catch (error) {
		return res.status(500).json({
			error: error.message,
		});
	}
};

Controllers.process = async (req, res) {
	const main = module.parent.exports;

	if (!req.body || !req.body.token) {
		return res.status(400).json({
			error: 'no-token-provided',
		});
	}
	
	try {
		const uid = await main.process(req.body.token);

		return res.status(200).json({
			uid,
		});
	} catch (error) {
		return res.status(500).json({
			error: error.message,
		});
	}
};

module.exports = Controllers;
