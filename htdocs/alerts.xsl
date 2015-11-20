<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="2.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    
    <xsl:output method="html"
                doctype-system="about:legacy-compat"
                encoding="UTF-8"
                indent="yes" />

    <xsl:template match="/">
            
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
              <th class="duration-sec-th"></th>
              <th class="duration-th">Duration</th>
              <th class="status_information-th">Status Information</th>
              <th class="comment">Comment</th>
            </tr>
        </thead>
        <tbody>

            <xsl:for-each select="alerts/alert">
                <xsl:sort select="*[/alerts/@sort + 0]"/>
                
                <tr class="{@state} main">
                    <td class="host"><a href="{host-url}"><xsl:value-of select="host"/></a></td>
                    <td class="service {@state}">
						<div class="likeTable">
							<ul>
								<li><a href="{service-url}" class="service-name"><xsl:value-of select="service"/></a></li>
								<xsl:if test="acked=1 and ack_comment != 'temp'">
									<li><img class="icons unAckThis" src="images/ack.gif" alt="Unacknowledge this Service" title="Unacknowledge this Service" /></li>
								</xsl:if>
								<xsl:if test="sched=1">
									<li><img class="icons" src="images/downtime.gif"/></li>
								</xsl:if>
								<xsl:if test="notes_url!=''">
									<li><a href="{notes_url}" target="_blank"><img class="icons" src="images/notes.gif"/></a></li>
								</xsl:if>
                                <li>
                                    <xsl:if test="ack_comment != 'temp'">
                                        <img class="icons quickAck" src="images/ok.png" alt="Quick Acknowledge" title="Quick Acknowledge" />
                                    </xsl:if>
                                    <xsl:if test="ack_comment = 'temp'">
                                        <img class="icons quickUnAck" src="images/avatars/{ack_author}.jpeg" alt="{ack_author} unack" title="{ack_author} unack" />
                                    </xsl:if>
                                </li>
								<li><img class="icons acknowledgeIt" src="images/acknowledgement.png" alt="Acknowledge this Service" title="Acknowledge this Service" /></li>
								<li><img class="icons scheduleIt" src="images/schedule.png" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service" /></li>
								<li><img class="icons recheckIt" src="images/refresh.png" alt="Refresh Service Status" title="Refresh Service Status" /></li>
							</ul>
						</div>
                    </td>
                    <td class="status {@state} orig{@origState}">
                        <span class="for-order">
							<xsl:if test="status = 'CRITICAL'">4</xsl:if>
							<xsl:if test="status = 'UNKNOWN'">3</xsl:if>
							<xsl:if test="status = 'WARNING'">2</xsl:if>
							<xsl:if test="status = 'OK'">1</xsl:if>
						</span>
						<xsl:value-of select="status"/>
                        <xsl:if test="downtime_id != ''">
                            <span class="downtime_id">
                                remove
                                <span><xsl:value-of select="downtime_id"/></span>
                            </span>
                        </xsl:if>
                    </td>
                    <td class="last_check {@state}">
						<span class="for-order">
							<xsl:value-of select="last_check_sec"/>
						</span>
						<xsl:value-of select="last_check"/>
					</td>
                    <td class="duration-sec"><xsl:value-of select="durationSec"/></td>
                    <td class="duration {@state}">
						<span class="for-order">
							<xsl:value-of select="durationSec9Digits"/>
						</span>
						<xsl:value-of select="duration"/>
					</td>
                    <td class="status_information {@state}"><xsl:copy-of select="status_information"/></td>
                    <td class="comment {@state}">
                        <span>
                            <xsl:if test="(acked=0 and sched=0) or (acked=1 and ack_comment = 'temp')">__normal__</xsl:if>
                            <xsl:if test="acked=1 and ack_comment != 'temp'">__acked__</xsl:if>
                            <xsl:if test="sched=1">__sched__</xsl:if>
                        </span>
                        <span class="ack">
                            <xsl:if test="ack_comment != ''">'<xsl:copy-of select="ack_comment"/>' by <xsl:value-of select="ack_author"/></xsl:if>
                            <xsl:if test="ack_comment_date != ''"><br />added: <xsl:copy-of select="ack_comment_date"/></xsl:if>
                        </span>
                        <span class="sched">
                            <xsl:if test="sched_comment != ''">'<xsl:copy-of select="sched_comment"/>' by <xsl:value-of select="sched_author"/></xsl:if>
                            <xsl:if test="sched_comment_date != ''"><br />added: <xsl:copy-of select="sched_comment_date"/></xsl:if>
                        </span>
                    </td>
                </tr>
                
            </xsl:for-each>
        </tbody>
    </table>
	<div id="lastUpdated"></div>
    <div id="openDialogServerTime"></div>
	<div id="timeShift"></div>
	<div id="downtimeComment"></div>
    <div id="userName"><xsl:value-of select="alerts/user" /></div>
	<div id="nagiosConfigFile"><xsl:value-of select="alerts/nagios-config-file" /></div>
	<div id="nagiosPostFile"><xsl:value-of select="alerts/nagios-post-file" /></div>
	<div id="nagiosFullListUrl"><xsl:value-of select="alerts/nagios-full-list-url" /></div>
	<div id="updateHash"><xsl:value-of select="alerts/hash" /></div>
</div>
    <script src="//code.jquery.com/jquery-2.1.4.min.js"></script>
	<script src="//code.jquery.com/ui/1.11.4/jquery-ui.min.js"></script>
    <script src="js/jquery.xslt.js"></script>
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
    
    </xsl:template>
</xsl:stylesheet>
