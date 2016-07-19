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
				</div>
			</div>
			<div class="row">
				<div class="col-sm-2 col-xs-12 settings-header">Session Handling</div>
				<div class="col-sm-10 col-xs-12">
					<div class="form-group">
						<select class="form-control" name="behaviour">
							<option value="trust">"Trust" &rarr; Shared cookie token used once only to authenticate, session persists even if cookie cleared</option>
							<option value="revalidate">"Revalidate" &rarr; Shared cookie is checked on every page load, and updated/logged out to reflect changes in cookie</option>
						</select>
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
							Supercedes first name / last name. If this is set, then the following two fields are ignored
						</p>
					</div>
					<div class="form-group">
						<label for="payload:firstName">First Name</label>
						<input type="text" id="payload:firstName" name="payload:firstName" title="First Name" class="form-control">
					</div>
					<div class="form-group">
						<label for="payload:lastName">Last Name</label>
						<input type="text" id="payload:lastName" name="payload:lastName" title="Last Name" class="form-control">
					</div>
					<div class="form-group">
						<label for="payload:picture">Picture</label>
						<input type="text" id="payload:picture" name="payload:picture" title="Picture" class="form-control" placeholder="picture">
					</div>
					<div class="form-group">
						<label for="payload:parent">Parent Key</label>
						<input type="text" id="payload:parent" name="payload:parent" title="Parent Key" class="form-control">
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