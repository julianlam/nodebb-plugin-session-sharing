'use strict';
/* globals $, app, socket */

define('admin/plugins/quickstart', ['settings'], function(Settings) {

	var ACP = {};

	ACP.init = function() {
		Settings.load('quickstart', $('.quickstart-settings'));

		$('#save').on('click', function() {
			Settings.save('quickstart', $('.quickstart-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'quickstart-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});