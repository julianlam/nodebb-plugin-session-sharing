"use strict";

$(document).ready(function() {
	$(window).on('action:app.loggedOut', function(e, data) {
		if (config.sessionSharing.logoutRedirect) {
			data.next = config.sessionSharing.logoutRedirect;
		}
	});

	$(window).on('action:ajaxify.end', function(ev, data) {
		if (config.sessionSharing.loginOverride) {
			$('a[href="/login"]').off('click').on('click', loginRedirect);
		}
	});

	$(window).on('action:ajaxify.start', function(e, data) {
		if (data.url.startsWith('login') && config.sessionSharing.loginOverride) {
			data.url = null;
			loginRedirect(e);
		}
	});

	$(window).on('action:ajaxify.end', function(e, data) {
		if (data.url === 'login' && config.sessionSharing.loginOverride) {
			$('#content').html('');
			loginRedirect(e);
		}
	});

	function loginRedirect(e) {
		e.preventDefault();
		e.stopPropagation();

		window.location.href = config.sessionSharing.loginOverride;
	};
});