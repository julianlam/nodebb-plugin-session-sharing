'use strict';
/* globals $, app, socket */

define('admin/plugins/session-sharing', ['settings'], function(Settings) {

	var ACP = {};

	ACP.init = function() {
		Settings.load('session-sharing', $('.session-sharing-settings'));

		$('#save').on('click', function() {
			Settings.save('session-sharing', $('.session-sharing-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'session-sharing-saved',
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