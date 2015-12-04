<html>
<head>
    <title>Current Network Status</title>
    <link rel="shortcut icon" href="images/favicon.ico" type="image/ico"/>
	<link rel="stylesheet" href="css/jquery-ui.min.css" />
	<link rel="stylesheet" href="css/jquery-ui.structure.min.css" />
	<link rel="stylesheet" href="//code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.min.css"/>
	<link rel="stylesheet" href="css/datatables.min.css" />
    <link rel="stylesheet" href="css/datetimepicker.css" />
	<link rel="stylesheet" href="css/custom.css" />
</head>
<body>
<div id="loading" style="display: block;">
	<img src="images/loading.gif" />
</div>
<div id="infoHolder" style="display: none;">
	<form>
        <div id="radio">
            <input type="radio" id="normal" name="radio"/><label for="normal">Normal (<em></em>)</label>
            <input type="radio" id="acked" name="radio"/><label for="acked"><img src="images/ack.gif" width="15"/>&#160;Acknowledged (<em></em>)</label>
            <input type="radio" id="sched" name="radio"/><label for="sched"><img src="images/downtime.gif" width="15"/>&#160;Scheduled downtime (<em></em>)</label>
            <input type="radio" id="EMERGENCY" name="radio"/><label for="EMERGENCY">EMERGENCY (<em></em>)</label>
            <input type="radio" id="hosts" name="radio"/><label for="hosts">Hosts</label>
        </div>
		<div id="refreshTime">
			<select name="files" id="refreshTimeSelect">
				<option value="auto">Refresh: Auto</option>
				<optgroup label="---">
                    <option value="10">Refresh: 10 sec</option>
					<option value="20">Refresh: 20 sec</option>
					<option value="40">Refresh: 40 sec</option>
					<option value="60">Refresh: 1 min</option>
					<option value="120">Refresh: 2 min</option>
					<option value="180">Refresh: 3 min</option>
					<option value="300">Refresh: 5 min</option>
					<option value="600">Refresh: 10 min</option>
					<option value="custom">Refresh: Custom</option>
				</optgroup>
				<optgroup label="----">
					<option value="10000000">Refresh: Disable</option>
				</optgroup>
			</select>
		</div>
		<div id="normalGrouping">
			<select name="files" id="grouping">
				<option value="0">Grouping: Disabled</option>
				<option value="1">Grouping: Enabled</option>
			</select>
		</div>
    </form>
    <table id="mainTable">
        <thead>
            <tr>
              <th class="host-th">Host</th>
              <th class="service-th">Service</th>
              <th class="status-th">Status</th>
              <th class="last_check-th">Last Check</th>
              <th class="duration-th">Duration</th>
              <th class="status_information-th">Status Information</th>
              <th class="comment">Comment</th>
			  <th class="type-th">Type</th>
            </tr>
        </thead>
    </table>
	<div id="lastUpdated"></div>
    <div id="openDialogServerTime"></div>
	<div id="timeShift"></div>
	<div id="downtimeComment"></div>
    <div id="userName"></div>
	<div id="nagiosConfigFile"></div>
	<div id="nagiosPostFile"></div>
	<div id="nagiosFullListUrl"></div>
	<div id="updateHash"></div>
</div>	
    <script src="//code.jquery.com/jquery-2.1.4.min.js"></script>
	<script src="//code.jquery.com/ui/1.11.4/jquery-ui.min.js"></script>
    <script src="js/data.format.js"></script>
    <script src="js/datatables.min.js"></script>
    <script src="js/datetimepicker.min.js"></script>
	<script src="js/controller.js"></script>
	<script>
		$(document).ready(function() {
			Search.init();
		});	
	</script>
</body>
</html>
