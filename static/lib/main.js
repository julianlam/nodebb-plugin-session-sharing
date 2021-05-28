'use strict';

/* globals document, $, window, config, ajaxify, bootbox */

$(document).ready(function () {
	if (config.sessionSharing && config.sessionSharing.hostWhitelist) {
		var hosts = config.sessionSharing.hostWhitelist.split(',') || [config.sessionSharing.hostWhitelist];
		var whitelisted = false;
		for (var host of hosts) {
			if (window && window.location && window.location.host && window.location.host.includes(host)) {
				whitelisted = true;
				break;
			}
		}

		if (!whitelisted) {
			console.log('[session-sharing] host not whitelisted', window && window.location && window.location.host);
			return;
		}
	}

	function isEditUrl(url) {
		return url.match(/^user\/.*\/edit$/);
	}

	$(window).on('action:app.loggedOut', function (evt, data) {
		if (config.sessionSharing.logoutRedirect) {
			data.next = config.sessionSharing.logoutRedirect;
		}
	});

	$(window).on('action:ajaxify.end', function (e, data) {
		if (config.sessionSharing.editOverride) {
			if (isEditUrl(data.url)) {
				$('#content').html('');
				redirect(config.sessionSharing.editOverride, e);
			}

			$('a[href^="/user/"][href$="/edit"]').off('click').on('click', redirectHandler(config.sessionSharing.editOverride));
		}

		if (config.sessionSharing.registerOverride) {
			if (data.url === 'register') {
				$('#content').html('');
				redirect(config.sessionSharing.registerOverride, e);
			}

			$('a[href="/register"]').off('click').on('click', redirectHandler(config.sessionSharing.registerOverride));
		}

		if (config.sessionSharing.loginOverride) {
			if (data.url === 'login') {
				$('#content').html('');
				redirect(config.sessionSharing.loginOverride, e);
			}

			$('a[href="/login"]').off('click').on('click', redirectHandler(config.sessionSharing.loginOverride));
		}

		if (ajaxify.data.sessionSharingBan) {
			bootbox.alert({
				title: '[[error:user-banned]]',
				message: ajaxify.data.sessionSharingBan.ban.expiry > 0 ?
					'[[error:user-banned-reason-until, ' + ajaxify.data.sessionSharingBan.ban.expiry_readable + ', ' + ajaxify.data.sessionSharingBan.ban.reason + ']]' :
					'[[error:user-banned-reason, ' + ajaxify.data.sessionSharingBan.ban.reason + ']]',
			});
		}

		window.localStorage.setItem('sessionSharingLastUrl', window.location.href);
	});

	$(window).on('action:ajaxify.start', function (e, data) {
		if (config.sessionSharing.editOverride && isEditUrl(data.url)) {
			data.url = null;
			redirect(config.sessionSharing.editOverride, e);
		}

		if (config.sessionSharing.registerOverride && data.url.startsWith('register')) {
			data.url = null;
			redirect(config.sessionSharing.registerOverride, e);
		}

		if (config.sessionSharing.loginOverride && data.url.startsWith('login')) {
			data.url = null;
			redirect(config.sessionSharing.loginOverride, e);
		}

		window.localStorage.setItem('sessionSharingLastUrl', window.location.href);
	});

	function redirectHandler(url) {
		return function (e) {
			redirect(url, e);
		};
	}

	function redirect(url, e) {
		e.preventDefault();
		e.stopPropagation();

		const lastUrl = window.localStorage.getItem('sessionSharingLastUrl');
		try {
			if (!lastUrl) {
				throw new Error('lastUrl is missing in localStorage');
			}
			url = url.replace('%1', encodeURIComponent(lastUrl));
		} catch (e) {
			const origin = window.location.origin;
			console.log('[session-sharing] cannot replace %1 with ' + lastUrl + ' using origin ' + origin + ' instead', e);
			url = url.replace('%1', encodeURIComponent(origin));
		}

		console.log('[session-sharing] redirecting to: ' + url);
		window.location.href = url;
	}
});
