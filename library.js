"use strict";

var plugin = {};

plugin.init = function(params, callback) {
	console.log('nodebb-plugin-quickstart: loaded');

	var app = params.router,
		middleware = params.middleware,
		controllers = params.controllers;
		
	// We create two routes for every view. One API call, and the actual route itself.
	// Just add the buildHeader middleware to your route and NodeBB will take care of everything for you.

	app.get('/admin/plugins/quickstart', middleware.admin.buildHeader, renderAdmin);
	app.get('/api/admin/plugins/quickstart', renderAdmin);

	callback();
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/quickstart',
		icon: 'fa-tint',
		name: 'Quickstart'
	});

	callback(null, header);
};


function renderAdmin(req, res, next) {
	/*
	Make sure the route matches your path to template exactly.

	If your route was:
		myforum.com/some/complex/route/
	your template should be:
		templates/some/complex/route.tpl
	and you would render it like so:
		res.render('some/complex/route');    */

	res.render('admin/plugins/quickstart', {});
}

module.exports = plugin;