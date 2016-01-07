<form role="form" class="session-sharing-settings">
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
			</div>
			<div class="form-group">
				<label for="payload:picture">Picture</label>
				<input type="text" id="payload:picture" name="payload:picture" title="Picture" class="form-control" placeholder="picture">
			</div>
		</div>
	</div>
</form>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>