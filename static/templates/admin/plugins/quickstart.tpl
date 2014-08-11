<h1>Sample Admin Page</h1>
<hr />

<form role="form" class="quickstart-settings">
	<p>
		Adjust these settings. You can then retrieve these settings in code via:
		<code>meta.config['sample:setting1']</code> and <code>meta.config['sample:setting2']</code>
	</p><br />
	<div class="alert alert-info">
		<p>
			<label for="Setting 1">Setting 1</label>
			<input type="text" id="setting-1" name="setting-1" title="Setting 1" class="form-control" placeholder="Setting 1"><br />
			<label for="Setting 2">Setting 2</label>
			<input type="text" id="setting-2" name="setting-2" title="Setting 2" class="form-control" placeholder="Setting 2">
		</p>
	</div>
</form>

<button class="btn btn-lg btn-primary" id="save">Save</button>

<script>
	require(['settings'], function(Settings) {
		Settings.load('quickstart', $('.quickstart-settings'));

		$('#save').on('click', function() {
			Settings.save('quickstart', $('.quickstart-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'quickstart-saved',
					title: 'Settings Saved',
				})
			});
		});
	});
</script>