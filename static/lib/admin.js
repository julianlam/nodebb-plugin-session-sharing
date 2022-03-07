'use strict';

/* globals define, $, socket, config */

define('admin/plugins/session-sharing', ['settings', 'alerts'], function (Settings, alerts) {
	var ACP = {};

	ACP.init = function () {
		Settings.load('session-sharing', $('.session-sharing-settings'));

		$('#save').on('click', function () {
			Settings.save('session-sharing', $('.session-sharing-settings'), function () {
				alerts.alert({
					type: 'success',
					alert_id: 'session-sharing-saved',
					title: 'Settings Saved',
					message: 'No restart/reload is required',
					timeout: 5000,
				});
			});
		});

		$('#search').on('keyup', ACP.showUserId);
		$('#remote_search').on('keyup', ACP.findUserByRemoteId);
	};

	ACP.showUserId = function () {
		if (ACP._searchDelay) {
			clearTimeout(ACP._searchDelay);
			delete ACP._searchDelay;
		}

		var element = $(this);

		ACP._searchDelay = setTimeout(function () {
			delete ACP._searchDelay;

			var qs = decodeURIComponent($.param({
				query: element.val(),
			}));

			$.get(config.relative_path + '/api/admin/manage/users?' + qs)
				.then(function (results) {
					var resultEl = $('#result');

					if (results.users.length) {
						socket.emit('plugins.sessionSharing.showUserIds', {
							uids: results.users.map(function (user) {
								return user.uid;
							}),
						}, function (err, remoteIds) {
							if (err) {
								resultEl.text('We encountered an error while servicing this request:' + err.message);
							} else {
								resultEl.empty();
								results.users.forEach(function (userObj, idx) {
									resultEl.append('<p>Username: ' + userObj.username + '<br />NodeBB uid: ' + userObj.uid + '<br />Remote id: ' + (remoteIds[idx] || '<em>Not Found</em>'));
								});
							}
						});
					} else {
						resultEl.text('No users matched your query');
					}
				})
				.fail(function (err) {
					$('#result').text('We encountered an error while servicing this request:' + err.message);
				});
		}, 500);
	};

	ACP.findUserByRemoteId = function () {
		if (ACP._searchDelay) {
			clearTimeout(ACP._searchDelay);
			delete ACP._searchDelay;
		}

		var element = $(this);

		ACP._searchDelay = setTimeout(function () {
			delete ACP._searchDelay;

			socket.emit('plugins.sessionSharing.findUserByRemoteId', {
				remoteId: element.val(),
			}, function (err, results) {
				if (!err && results) {
					$('#local_result').html(
						'<div class="media"><div class="media-left"><a target="_blank" href="' + config.relative_path + '/user/' + results.userslug + '">' +
						(results.picture ? '<img class="media-object avatar avatar-sm" src="' + results.picture + '" alt="Profile Picture">' : '<div class="avatar avatar-sm" style="background-color: ' + results['icon:bgColor'] + ';">' + results['icon:text'] + '</div>') +
						'</a></div>' +
						'<div class="media-body"><a target="_blank" href="' + config.relative_path + '/user/' + results.userslug + '">' + results.username + '</a></div></div>');
				} else {
					$('#local_result').text('No users were found associated with that remote ID');
				}
			});
		}, 500);
	};

	return ACP;
});
