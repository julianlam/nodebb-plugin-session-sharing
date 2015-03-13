<div class="row">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading">Sample Admin Page</div>
			<div class="panel-body">
				<form role="form" class="quickstart-settings">
					<p>
						Adjust these settings. You can then retrieve these settings in code via:
						<code>meta.config['sample:setting1']</code> and <code>meta.config['sample:setting2']</code>
					</p>
					<div class="form-group">
						<label for="Setting 1">Setting 1</label>
						<input type="text" id="setting-1" name="setting-1" title="Setting 1" class="form-control" placeholder="Setting 1"><br />
					</div>
					<div class="form-group">
						<label for="Setting 2">Setting 2</label>
						<input type="text" id="setting-2" name="setting-2" title="Setting 2" class="form-control" placeholder="Setting 2">
					</div>
				</form>
			</div>
		</div>
	</div>
	<div class="col-lg-3">
		<div class="panel panel-default">
			<div class="panel-heading">Control Panel</div>
			<div class="panel-body">
				<button class="btn btn-primary" id="save">Save Settings</button>
			</div>
		</div>
	</div>
</div>
