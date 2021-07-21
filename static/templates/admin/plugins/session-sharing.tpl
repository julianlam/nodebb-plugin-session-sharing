<form role="form" class="session-sharing-settings">
	<div class="row">
		<div class="col-md-9">
			<div class="row">
				<div class="col-sm-2 col-xs-12 settings-header">General</div>
				<div class="col-sm-10 col-xs-12">
					<div class="form-group">
						<label for="name">Base Name</label>
						<input type="text" id="name" name="name" title="Base Name" class="form-control" placeholder="appId" />
					</div>
					<div class="form-group">
						<label for="cookieName">Cookie Name</label>
						<input type="text" id="cookieName" name="cookieName" title="Cookie Name" class="form-control" placeholder="token" />
					</div>
					<div class="form-group">
						<label for="cookieDomain">Cookie Domain</label>
						<input type="text" id="cookieDomain" name="cookieDomain" title="Cookie Domain" class="form-control" />
						<p class="help-block">
							Specifying the common cookie domain here will allow NodeBB to delete the common cookie when a user
							logs out of NodeBB. If not set (default), then the user will simply be logged in again as their
							common cookie still exists. This may actually be what you want.
						</p>
					</div>
					<div class="form-group">
						<label for="secret">JWT Secret</label>
						<input type="text" id="secret" name="secret" title="JWT Secret" class="form-control" />
						<p class="help-block">
							This value is the secret key you used to encode your JSON Web Token. NodeBB needs the same secret
							otherwise the JWT cannot be properly decoded.
						</p>
					</div>
					<div class="form-group">
						<label for="hostWhitelist">Host Whitelist</label>
						<input type="text" id="hostWhitelist" name="hostWhitelist" title="Host Whitelist" class="form-control" placeholder="localhost" />
						<p class="help-block">
							If set, session-sharing plugin works only on whitelisted domains. Separate with commas, for example: "localhost,test.domain.com".
						</p>
					</div>
				</div>
			</div>
			<div class="row">
				<div class="col-sm-2 col-xs-12 settings-header">Session Handling</div>
				<div class="col-sm-10 col-xs-12">
					<div class="form-group">
						<label for="behaviour">Cookie changes</label>
						<select class="form-control" name="behaviour" id="behaviour">
							<option value="trust">"Trust" &rarr; Shared cookie token used once only to authenticate, session persists even if cookie cleared</option>
							<option value="revalidate">"Revalidate" &rarr; Shared cookie is checked on every page load, and updated/logged out to reflect changes in cookie</option>
							<option value="update">"Update" &rarr; Shared cookie is checked on every page load, and updated to reflect changes in cookie. But user is not logged out when cookie is missing</option>
						</select>
					</div>
					<div class="checkbox">
							<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
								<input class="mdl-switch__input" type="checkbox" id="adminRevalidate" name="adminRevalidate" />
								<span class="mdl-switch__label"><strong>Apply revalidation rules to administrators as well</strong></span>
							</label>
							<p class="help-block">
								Administrators are exempt from the <code>revalidate</code> behaviour because a 
								misconfiguration could lock them out of the admin panel. Enable this option to force
								administrators to also undergo cookie revalidation, and thereby increasing security.
							</p>
							<p class="help-block">
								This option is disabled by default to allow for smoother setup.
							</p>
						</div>
					<div class="checkbox">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
							<input class="mdl-switch__input" type="checkbox" id="noRegistration" name="noRegistration" />
							<span class="mdl-switch__label"><strong>Do not automatically create NodeBB accounts for unrecognized users</strong></span>
						</label>
						<p class="help-block">
							By default, an unrecognized user id found in a payload cookie will have a local NodeBB account automatically created for it. If enabled,
							that cookie will not resolve into a session and that client will remain a guest.
						</p>
					</div>
					<div class="checkbox">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
							<input class="mdl-switch__input" type="checkbox" id="updateProfile" name="updateProfile" />
							<span class="mdl-switch__label"><strong>Automatically update local profile information with information found in shared cookie</strong></span>
						</label>
						<div class="help-block">
							Basic information such as username and id are required, while others are optional (first name, last name, etc.). Enable this setting to allow
							NodeBB to automatically sync up the local profile with the information provided.
						</div>
					</div>
					<div class="checkbox">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
							<input class="mdl-switch__input" type="checkbox" id="syncGroupJoin" name="syncGroupJoin" />
							<span class="mdl-switch__label"><strong>Automatically join groups if present in payload</strong></span>
						</label>
					</div>
					<div class="checkbox">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
							<input class="mdl-switch__input" type="checkbox" id="syncGroupLeave" name="syncGroupLeave" />
							<span class="mdl-switch__label"><strong>Automatically leave groups if not present in payload</strong></span>
						</label>
					</div>
					<div class="checkbox">
						<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
							<input class="mdl-switch__input" type="checkbox" id="syncGroupList" name="syncGroupList" />
							<span class="mdl-switch__label"><strong>Select groups to join/leave</strong></span>
						</label>
					</div>
					<div class="form-group">
						<select class="form-control" id="syncGroups" name="syncGroups" multiple size="10">
							<!-- BEGIN groups -->
							<option value="{groups.displayName}">{groups.displayName}</option>
							<!-- END groups -->
						</select>
					</div>
					<div class="form-group">
						<label for="logoutRedirect">Logout Redirection</label>
						<input type="text" class="form-control" id="logoutRedirect" name="logoutRedirect" />
						<p class="help-block">
							If set, once a user logs out from NodeBB, they will be sent to this link. Setting this option may be useful if you'd like to trigger
							a session logout in your own application instead.
						</p>
					</div>
					<div class="form-group">
						<label for="loginOverride">Login Override</label>
						<input type="text" class="form-control" id="loginOverride" name="loginOverride" />
						<p class="help-block">
							If set, users clicking the "Login" button will be redirected to this link instead
						</p>
					</div>
					<div class="form-group">
						<label for="registerOverride">Register Override</label>
						<input type="text" class="form-control" id="registerOverride" name="registerOverride" />
						<p class="help-block">
							If set, users clicking the "Register" button will be redirected to this link instead
						</p>
					</div>
					<div class="form-group">
						<label for="editOverride">Edit Profile Override</label>
						<input type="text" class="form-control" id="editOverride" name="editOverride" />
						<p class="help-block">
							If set, users clicking the "Edit Profile" button will be redirected to this link instead
						</p>
					</div>
				</div>
			</div>
			<div class="row">
				<div class="col-sm-2 col-xs-12 settings-header">Payload Keys</div>
				<div class="col-sm-10 col-xs-12">
					<p>
						In general, you should not need to change these values, as you should be adjusting your app's cookie's
						JWT payload keys to match the defaults. However if circumstances require you to have different values,
						you can change them here.
					</p>
					<p class="help-block">
						Default values are shown as placeholders in the corresponding input fields.
					</p>
					<div class="form-group">
						<label for="name">Unique ID</label>
						<input type="text" id="payload:id" name="payload:id" title="Unique ID" class="form-control" placeholder="id">
					</div>
					<div class="form-group">
						<label for="payload:email">Email</label>
						<input type="text" id="payload:email" name="payload:email" title="Email" class="form-control" placeholder="email">
					</div>
					<div class="form-group">
						<label for="payload:username">Username</label>
						<input type="text" id="payload:username" name="payload:username" title="Username" class="form-control" placeholder="username">
						<p class="help-block">
							The plugin will try to generate this value from the fullname, if no username is given.
						</p>
					</div>
					<div class="form-group">
						<label for="payload:fullname">Full name</label>
						<input type="text" id="payload:fullname" name="payload:fullname" title="Full name" class="form-control" placeholder="fullname">
						<p class="help-block">
							The plugin will use a combination of first name and last name, if no fullname is given. If given, the following two fields will be ignored.
						</p>
					</div>
					<div class="form-group">
						<label for="payload:firstName">First Name (deprecated)</label>
						<input type="text" id="payload:firstName" name="payload:firstName" title="First Name (deprecated)" class="form-control" placeholder="firstName">
					</div>
					<div class="form-group">
						<label for="payload:lastName">Last Name (deprecated)</label>
						<input type="text" id="payload:lastName" name="payload:lastName" title="Last Name (deprecated)" class="form-control" placeholder="lastName">
					</div>
					<div class="form-group">
						<label for="payload:website">Website</label>
						<input type="text" id="payload:website" name="payload:website" title="Website" class="form-control" placeholder="website">
					</div>
					<div class="form-group">
						<label for="payload:birthday">Birthday</label>
						<input type="text" id="payload:birthday" name="payload:birthday" title="Birthday" class="form-control" placeholder="birthday">
					</div>
					<div class="form-group">
						<label for="payload:aboutme">About</label>
						<input type="text" id="payload:aboutme" name="payload:aboutme" title="About" class="form-control" placeholder="aboutme">
					</div>
					<div class="form-group">
						<label for="payload:location">Location</label>
						<input type="text" id="payload:location" name="payload:location" title="Location" class="form-control" placeholder="location">
					</div>
					<div class="form-group">
						<label for="payload:signature">Signature</label>
						<input type="text" id="payload:signature" name="payload:signature" title="Signature" class="form-control" placeholder="signature">
					</div>
					<div class="form-group">
						<label for="payload:signature">Group Title</label>
						<input type="text" id="payload:groupTitle" name="payload:groupTitle" title="Signature" class="form-control" placeholder="groupTitle">
					</div>
					<div class="form-group">
						<label for="payload:picture">Picture</label>
						<input type="text" id="payload:picture" name="payload:picture" title="Picture" class="form-control" placeholder="picture">
					</div>
					<div class="form-group">
						<label for="payloadParent">Parent Key</label>
						<input type="text" id="payloadParent" name="payloadParent" title="Parent Key" class="form-control">
						<p class="help-block">
							If your user data is contained in a subkey inside of the payload data, specify its key here.
							Otherwise, this plugin assumes the relevant data is at the root level.
						</p>
					</div>
				</div>
			</div>
			<div class="row">
				<div class="col-sm-2 col-xs-12 settings-header">Guest Handling</div>
				<div class="col-sm-10 col-xs-12">
					<div class="form-group">
						<label for="guestRedirect">Re-direct unauthenticated sessions (guests) to this address</label>
						<input type="text" id="guestRedirect" name="guestRedirect" class="form-control" placeholder="https://...">
						<p class="help-block">
							Blank value disables guest redirection.
						</p>
						<p class="help-block">
							<code>%1</code> can be used as a placeholder for the link the user landed on (will be URL encoded)
						</p>
					</div>
				</div>
			</div>
		</div>
		<div class="col-md-3">
			<div class="panel panel-default">
				<div class="panel-heading">
					<h3 class="panel-title">User Search</h3>
				</div>
				<div class="panel-body">
					<input type="text" class="form-control" id="search" />
					<p class="help-block">
						Search for a username here to find their associated unique ID.
					</p>
					<p id="result"></p>
				</div>
			</div>
			<div class="panel panel-default">
				<div class="panel-heading">
					<h3 class="panel-title">Remote ID Search</h3>
				</div>
				<div class="panel-body">
					<input type="text" class="form-control" id="remote_search" />
					<p class="help-block">
						Enter a remote ID here to find their NodeBB user profile.
					</p>
					<p id="local_result"></p>
				</div>
			</div>
		</div>
	</div>
</form>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>
