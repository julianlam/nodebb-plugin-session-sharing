'use strict';

/* globals document, $, window, config, ajaxify, bootbox */

$(document).ready(function () {
	$(window).on('action:app.loggedOut', function (evt, data) {
		if (config.sessionSharing.logoutRedirect) {
			data.next = config.sessionSharing.logoutRedirect;
		}
	});

	$(window).on('action:ajaxify.end', function () {
		if (config.sessionSharing.loginOverride) {
			$('a[href="/login"]').off('click').on('click', loginRedirect);
		}

		if (ajaxify.data.sessionSharingBan) {
			bootbox.alert({
				title: '[[error:user-banned]]',
				message: ajaxify.data.sessionSharingBan.ban.expiry > 0 ?
					'[[error:user-banned-reason-until, ' + ajaxify.data.sessionSharingBan.ban.expiry_readable + ', ' + ajaxify.data.sessionSharingBan.ban.reason + ']]' :
					'[[error:user-banned-reason, ' + ajaxify.data.sessionSharingBan.ban.reason + ']]',
			});
		}
	});

	$(window).on('action:ajaxify.start', function (e, data) {
		if (data.url.startsWith('login') && config.sessionSharing.loginOverride) {
			data.url = null;
			loginRedirect(e);
		}
	});

	$(window).on('action:ajaxify.end', function (e, data) {
		if (data.url === 'login' && config.sessionSharing.loginOverride) {
			$('#content').html('');
			loginRedirect(e);
		}
	});

	function loginRedirect(e) {
		e.preventDefault();
		e.stopPropagation();

		window.location.href = config.sessionSharing.loginOverride;
	}

	$(window).on('action:ajaxify.end', function () {
		if (config.sessionSharing.registerOverride) {
			$('a[href="/register"]').off('click').on('click', registerRedirect);
		}
	});

	$(window).on('action:ajaxify.start', function (e, data) {
		if (data.url.startsWith('register') && config.sessionSharing.registerOverride) {
			data.url = null;
			registerRedirect(e);
		}
	});

	$(window).on('action:ajaxify.end', function (e, data) {
		if (data.url === 'register' && config.sessionSharing.registerOverride) {
			$('#content').html('');
			registerRedirect(e);
		}
	});

	function registerRedirect(e) {
		e.preventDefault();
		e.stopPropagation();

		window.location.href = config.sessionSharing.registerOverride;
	}
});
