<?php
    $rev = exec('git rev-parse HEAD');

    if (!isset($_SESSION)) {
        session_start();
    }

    include_once __DIR__ . '/../scripts/init.php';

    if (!isset($_SESSION['currentUser']) || !isset($_SESSION['currentAvatar']) || !$_SESSION['currentUser'] || !$_SESSION['currentAvatar']) {
        $user = (isset($_SERVER['PHP_AUTH_USER']) ? $_SERVER['PHP_AUTH_USER'] : '');
        $user = (!$user) ? ((isset($_SERVER['REDIRECT_REMOTE_USER']) ? $_SERVER['REDIRECT_REMOTE_USER'] : '')) : $user;
        $user = ($user && array_key_exists($user, $usersArray)) ? $user : 'default';

        $_SESSION["currentUser"] = $user;
        $_SESSION["currentAvatar"] = md5(strtolower(trim($usersArray[$user])));
    }

    $userName   = $_SESSION["currentUser"];
    $userAvatar = $_SESSION["currentAvatar"];

    if (isset($_GET['file']) && trim($_GET['file'])) {
        $xml = new xml;
        $xml->setCurrentTab((isset($_GET['server_tab'])) ? $_GET['server_tab'] : '');

        if (!$xml->verifyXmlArchive()) {
            $xml->dieXmlArchiveNotFound();
        }
    }
?><html>
<head>
    <title>Current Network Status</title>
    <link rel="icon" type="image/png" href="data:image/png;base64,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" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes" />
	<link rel="stylesheet" href="css/jquery-ui.min.css"/>
	<link rel="stylesheet" href="css/datatables.min.css" />
	<link rel="stylesheet" href="css/custom.css?v=<?php echo $rev; ?>" />
<?php
    if (isset($_GET['file']) && $_GET['file']) {
?>
        <style>
            #mainTable .service .likeTable ul li:not(:first-child) { display: none !important; }
            #mainTable .service .likeTable ul li:first-child { height: 19px; }
            #planned, #planned-label { display: none !important; }
            .edit_acknowledgeGroup, .edit_scheduleGroup, .edit_acknowledgeIt, .edit_scheduleIt, .edit_planned_comment { display: none !important; }
            #quickAck_button, #quickUnAck_button, #acknowledgeIt_button, #scheduleIt_button, #recheckIt_button, #edit_acknowledge, #edit_scheduled { display: none !important; }
            #planned-maintenance { display: none !important; }
        </style>
<?php
    }
?>
    <script>
        url = new URL(window.location.href);
        if (url.searchParams.get('server_tab')) {
            localStorage.setItem('currentServerTab', url.searchParams.get('server_tab'));
        }
    </script
</head>
<body>
<div id="loading" style="display: block; float: left;">
	<div class="sk-circle">
		<div class="sk-circle1 sk-child"></div>
		<div class="sk-circle2 sk-child"></div>
		<div class="sk-circle3 sk-child"></div>
		<div class="sk-circle4 sk-child"></div>
		<div class="sk-circle5 sk-child"></div>
		<div class="sk-circle6 sk-child"></div>
		<div class="sk-circle7 sk-child"></div>
		<div class="sk-circle8 sk-child"></div>
		<div class="sk-circle9 sk-child"></div>
		<div class="sk-circle10 sk-child"></div>
		<div class="sk-circle11 sk-child"></div>
		<div class="sk-circle12 sk-child"></div>
	</div>
</div>

<div id="noData" style="display: none;">
    <h2>Server error occurred: Can't get data for rendering. You can try to:</h2>
    <ol>
        <li style="font-size: 13px;"><span id="reloadPage" style="cursor: pointer; text-decoration: underline;  font-size: 13px;">reload page</span></li>
        <li style="font-size: 13px;">clear 'localStorage' by clicking: <span id="clearLocalStorage" style="cursor: pointer; text-decoration: underline;  font-size: 13px;">here</span> (it will delete 'localStorage' only for this site)</li>
        <li style="font-size: 13px;">report issue in <a href="https://github.com/Ivinco/nagiosUI/issues" target="_blank" style="font-size: 13px;">github.com</a></li>
    </ol>
</div>
<div id="infoHolder" style="display: none;">
    <div id="tabs">
        <ul>
        </ul>
    </div>
	<form>
		<div id="refreshTime">
			<select name="files" id="refreshTimeSelect">

			</select>
		</div>
		<div id="normalGrouping">
			<select name="files" id="grouping">
				<option value="0">Grouping: Disabled</option>
				<option value="1">Grouping: Enabled</option>
			</select>
		</div>
		<div id="radio">
            <input type="radio" id="normal" name="radio"/>
			<label for="normal">
					<span class="top-normal-icon"></span>
					<span class="small-hide">&#160;Normal</span>
					<span class="xs-hide">&#160;(<em></em>)</span>
			</label>
            <input type="radio" id="acked" name="radio"/>
			<label for="acked">
				<span class="top-ack-icon"></span>
				<span class="small-hide">&#160;Acknowledged</span>
				<span class="xs-hide">&#160;(<em></em>)</span>
			</label>
            <input type="radio" id="sched" name="radio"/>
			<label for="sched">
				<span class="top-downtime-icon"></span>
				<span class="small-hide">&#160;Scheduled downtime</span>
				<span class="xs-hide">&#160;(<em></em>)</span>
			</label>
            <input type="radio" id="EMERGENCY" name="radio"/>
			<label for="EMERGENCY" id="EMERGENCY-label">
				<span class="top-emergency-icon"></span>
				<span class="small-hide">&#160;EMERGENCY</span>
				<span class="xs-hide">&#160;(<em></em>)</span>
			</label>
            <input type="radio" id="hosts" name="radio"/>
            <label for="hosts" id="hosts-label">
                <span class="top-hosts-icon"></span>
                <span class="small-hide">&#160;Hosts</span>
                <span class="xs-hide">&#160;(<em></em>)</span>
            </label>
			<input type="radio" id="planned" name="radio"/>
			<label for="planned" id="planned-label">
				<span class="top-planned-icon"></span>
				<span class="small-hide">&#160;Schedule a downtime</span>
                <span class="xs-hide">&#160;(<em></em>)</span>
			</label>
        </div>
    </form>
	<p style="clear: both; float: right; margin: 5px 5px 0 0;">Updated <span id="updatedAgo">0</span>s ago</p>
    <table id="mainTable">
        <thead>
            <tr>
              <th class="abb-th"></th>
              <th class="host-th">Host</th>
              <th class="service-th">Service</th>
              <th class="status-th">Status</th>
              <th class="last_check-th">Last Check</th>
              <th class="duration-th">Duration</th>
              <th class="status_information-th">Status Information</th>
              <th class="comment">Comment</th>
			  <th class="type-th">Type</th>
			  <th class="more-th"></th>
            </tr>
        </thead>
    </table>
	<div id="planned-maintenance">
		<div class="holder" style="width: 350px;">
			<label for="maintenance-host">Host</label><br />
			<input type="text" name="maintenance-host" id="maintenance-host" /><br />
            <label for="maintenance-service">Service</label><br />
            <input type="text" name="maintenance-service" id="maintenance-service" /><br />
            <label for="maintenance-status">Status Information</label><br />
            <input type="text" name="maintenance-status" id="maintenance-status" /><br />
			<label for="maintenance-time">Downtime <small>(minutes)</small></label><br />
			<input type="text" name="maintenance-time" id="maintenance-time" /><br />
            <label for="maintenance-comment">Comment</label><br />
            <input type="text" name="maintenance-comment" id="maintenance-comment" /><br />
            <label for="maintenance-server">Server</label><br />
            <select id="maintenance-server" name="maintenance-server"></select><br />
            <input type="checkbox" name="maintenance-normal" id="maintenance-normal" checked="checked" />
            <label for="maintenance-normal">Visible in Normal</label><br />
			<button id="planned-save">Save</button>
			
			<p>
				<small>
					<strong>?</strong> wildcard replaces any 1 character<br />
					<strong>*</strong> wildcard replaces any # of characters<br />
					<strong>examples:</strong><br />
						forumdb01-?<br />
						*mysql*<br />
						forum*,log*<br />
						*error*
				</small>
			</p>
		</div>

        <div class="holder planned-holder">
            <p style="margin-top: 10px;"><strong>Scheduled downtime list:</strong></p>
            <table class="full-planned-list">
                <thead>
                    <tr>
                        <th>Host</th>
                        <th>Service</th>
                        <th>Status Information</th>
                        <th>Till</th>
                        <th>Comment</th>
                        <th>Created by</th>
                        <th>Show in normal</th>
                        <th>Server</th>
                        <th></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="planned-list"></tbody>
            </table>
            <br /><br />
            <div>
                <p><strong>Use a template:</strong></p>
                <ul id="planned-templates-list"></ul>
            </div>
		</div>
	</div>
	<div id="lastUpdated"></div>
    <div id="openDialogServerTime"></div>
	<div id="timeShift"></div>
	<div id="downtimeComment"></div>
	<div id="userName"><?php echo $userName; ?></div>
	<div id="userAvatar"><?php echo $userAvatar; ?></div>
	<div id="nagiosConfigFile"></div>
	<div id="nagiosPostFile"></div>
	<div id="nagiosFullListUrl"></div>
	<div id="updateHash"></div>
	<div id="groupByService"></div>
	<div id="groupByHost"></div>
	<div id="refreshArray"></div>
	<div id="serviceDialog" title="Status Information"></div>
	<div id="commentDialog" title="Comment"></div>
	<div id="plannedDialog" title="Planned Templates"></div>
    <div id="noDataServer" style="display: none;">
        <h2>Server error occurred: Can't get data for rendering. You can try to:</h2>
        <ol>
            <li style="font-size: 13px;">select another server</li>
            <li style="font-size: 13px;"><span id="reloadPageServer" style="cursor: pointer; text-decoration: underline;  font-size: 13px;">reload page</span></li>
            <li style="font-size: 13px;">clear 'localStorage' by clicking: <span id="clearLocalStorageServer" style="cursor: pointer; text-decoration: underline;  font-size: 13px;">here</span> (it will delete 'localStorage' only for this site)</li>
            <li style="font-size: 13px;">report issue in <a href="https://github.com/Ivinco/nagiosUI/issues" target="_blank" style="font-size: 13px;">github.com</a></li>
        </ol>
    </div>
</div>

    <script src="js/jquery-2.1.4.min.js"></script>
	<script src="js/jquery-ui.min.js"></script>
    <script src="js/datatables.min.js"></script>
	<script src="js/moment.min.js"></script>
	<script src="js/controller.js?v=<?php echo $rev; ?>"></script>
    <script>
        $(document).ready(function() {
            $(document).on('click', '#clearLocalStorage, #clearLocalStorageServer', function () {
                localStorage.clear();
                location.reload();
            });

            $(document).on('click', '#reloadPage, #reloadPageServer', function () {
                location.reload();
            });

            Search.init();
            Grouping.init();

            if (!getParameterByName('file')) {
                Planned.init();
            }
        });
    </script>
</body>
</html>
