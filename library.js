"use strict";

var plugin = {};

plugin.init = function(app, middleware, controllers, callback) {
	console.log('nodebb-plugin-quickstart: loaded');
	callback();
};

module.exports = plugin;