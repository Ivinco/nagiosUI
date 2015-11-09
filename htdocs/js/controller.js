if (!localStorage.getItem('currentTabNew')) {
	localStorage.setItem('currentTabNew', 'normal');
}

if (!localStorage.getItem('currentReloadNew')) {
	localStorage.setItem('currentReloadNew', 'auto');
}
var tmpTab    = localStorage.getItem('currentTabNew'),
	tmpReload = localStorage.getItem('currentReloadNew');
	
localStorage.clear();
localStorage.setItem('currentTabNew', tmpTab);
localStorage.setItem('currentReloadNew', tmpReload);

var Search = {}
	Search.currentTab         = localStorage.getItem('currentTabNew');
	Search.currentReload      = localStorage.getItem('currentReloadNew');
	Search.reloadCustomText   = 'Refresh: Custom';
	Search.searchInput        = $('#mainTable_filter input');
	Search.tableLength        = 0;
	Search.recheckButtonId    = 'recheck_button';
	Search.quickAckButtonId   = 'quickack_button';
	Search.quickUnAckButtonId = 'quickunack_button';
	Search.ackButtonId        = 'aknoledge_button';
	Search.unackButtonId      = 'unaknoledge_button'; 
	Search.sdButtonId         = 'scheduled_downtime_button';
	Search.filterButtons      = '#'+ Search.recheckButtonId +', #'+ Search.ackButtonId +', #'+ Search.sdButtonId +', #'+ Search.quickAckButtonId +', #'+ Search.quickUnAckButtonId +', #'+ Search.unackButtonId;
	Search.autoRefresh        = true;
	Search.currentUser        = $('#userName').text();
	Search.updateHash         = $('#updateHash').text();
	Search.backgroundReload   = true;
	Search.allDataTable       = $('#mainTable').DataTable({
									'paging'      : false,
									'ordering'    : true,
									'drawCallback': function (settings) {
										var rows       = this.api().rows({ page: 'current' }).nodes(),
											columnData = getGroupNormalServices(rows),
											counts     = getGroupNormalServicesCount(columnData);
										
										getGroupGroupedData(rows, counts);
										getGroupAdditionalData(columnData);
									}
								});

function getGroupAdditionalData(allColumnData) {
	var columnData = $.unique(allColumnData);
										
	for (var i = 0; i < columnData.length; i++) {
		var groupNameSmall     = columnData[i].replace(/\s/g, '-').toLowerCase(),
			status             = [],
			statusText         = [];
			statusFinalText    = [];
			last_check         = [],
			last_checkText     = '',
			duration           = [],
			durationText       = '',
			status_information = [];
											
		$('#mainTable tr[data-group="'+ groupNameSmall +'"]:not(.group-list)').each(function() {
			status.push($(this).find('td.status').clone().children().remove().end().text().replace(/\s/g, ''));
			last_check.push($(this).find('td.last_check').text());
			duration.push($(this).find('td.duration').text());
			status_information.push($(this).find('td.status_information status_information').text());
		});
											
		for (var a = 0; a < duration.length; a++) {
			if (getSeconds(duration[a]) > getSeconds(durationText)) {
				durationText = duration[a];
			}
		}
											
		for (var b = 0; b < last_check.length; b++) {
			if (!last_checkText || last_check[b] < last_checkText) {
				last_checkText = last_check[b];
			}
		}
											
		for (var c = 0; c < status.length; c++) {
			if (status[c] == 'CRITICAL') {
				statusText[0] = status[c];
			}
			else if (status[c] == 'UNKNOWN') {
				statusText[1] = status[c];
			}
			else if (status[c] == 'WARNING') {
				statusText[2] = status[c];
			}
			else {
				statusText[3] = status[c];
			}
		}
											
		for (var d = 0; d < statusText.length; d++) {
			if (statusText[d]) {
				statusFinalText.push(statusText[d]);
			}
		}
											
		$('#mainTable tr[data-group="'+ groupNameSmall +'"].group-list td.status').text(statusFinalText[0]).addClass(statusFinalText[0]);
		$('#mainTable tr[data-group="'+ groupNameSmall +'"].group-list td.last_check').text(last_checkText).addClass(statusFinalText[0]);
		$('#mainTable tr[data-group="'+ groupNameSmall +'"].group-list td.duration').text(durationText).addClass(statusFinalText[0]);
		$('#mainTable tr[data-group="'+ groupNameSmall +'"].group-list td.status_information').text(status_information[0]).addClass(statusFinalText[0]);
		$('#mainTable tr[data-group="'+ groupNameSmall +'"].group-list td.service').addClass(statusFinalText[0]);
		$('#mainTable tr[data-group="'+ groupNameSmall +'"].group-list td.comment').addClass(statusFinalText[0]);
	}
	
	quickAckUnAckGroup();
}

function getGroupGroupedData(rows, counts) {
	var last = null;
	
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
											
		if ($(row).text().search('__normal__') >= 0) {
			var groupName      = $(row).find('.service-name').text(),
				groupNameSmall = groupName.replace(/\s/g, '-').toLowerCase();
													
			if (counts[groupName] > 1 && last != groupName) {
				var isOpen  = localStorage.getItem(Search.currentTab + '_' + groupNameSmall),
					trClass = 'group-list group-list-bottom';
													
				if (isOpen) {
					trClass += ' open';
				}
													
				$(rows).eq(i).before(
					'<tr class="'+ trClass +'" data-group="' + groupNameSmall + '">' +
					'	<td class="host" style="text-align: center; font-size: 12px; font-weight: bold;">' + counts[groupName] + '</td>' +
					'	<td class="service">' +
					'		<div class="likeTable">' +
					'			<ul>' +
					'				<li>' + groupName + '</li>' +
					'				<li class="quickAckUnAckIcon"><img class="icons quickAckGroup" src="images/ok.png" alt="Quick Acknowledge" title="Quick Acknowledge"></li>' +
					'				<li><img class="icons acknowledgeItGroup" src="images/acknowledgement.png" alt="Acknowledge this Service" title="Acknowledge this Service"></li>' +
					'				<li><img class="icons scheduleItGroup" src="images/schedule.png" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></li>' +
					'				<li><img class="icons recheckItGroup" src="images/refresh.png" alt="Refresh Service Status" title="Refresh Service Status"></li>' +
					'			</ul>' +
					'		</div>' +
					'	</td>' +
					'	<td class="status"></td>' +
					'	<td class="last_check"></td>' +
					'	<td class="duration-sec" style="display: none;"></td>' +
					'	<td class="duration"></td>' +
					'	<td class="status_information"></td>' +
					'	<td class="comment"></td>' +
					'</tr>'
				);
			}
			
			
												
			if (counts[groupName] > 1) {
				var rowHide = $(rows).eq(i);
					rowHide.attr('data-group', groupNameSmall);
	
				if (!localStorage.getItem(Search.currentTab + '_' + groupNameSmall)) {
					rowHide.css('display', 'none');
				}
			}
												
			last = groupName;
		}
	}
}

function getGroupNormalServicesCount(columnData) {
	var counts = [];
										
	for (var i = 0; i < columnData.length; i++) {
		counts[columnData[i]] = 1 + (counts[columnData[i]] || 0);
	}
	
	return counts;
}

function getGroupNormalServices (rows) {
	var columnData = [];
	
	$(rows).each(function() {
		if ($(this).text().search('__normal__') >= 0) {
			columnData.push($(this).find('.service-name').text());
		}
	});
	
	return columnData;
}

Search.getContent = function() {
	if (Search.autoRefresh) {
		$.ajax({
			type:    'GET',
			url:     'update.php',
			data:    {'hash' : Search.updateHash},
			success: function(data){
				Search.updateHash = data;
				
				var newData = $.xslt({xmlUrl: 'index.php', xslUrl: 'alerts.xsl', xmlCache: false, xslCache: false });
				
				Search.allDataTable.clear().draw();
				
				$(newData).find('tr[class]').each(function(){
					$('#mainTable tbody').append($(this));	
					Search.allDataTable.row.add($(this));
				});
				
				Search.countRecords();
				Search.filterDataTable(true);
				Search.emptyHosts();
				
				if (Search.backgroundReload) {
					clearTimeout(reloadTimer);
					reloadTimer = setTimeout(function () { Search.getContent(); }, 0);
				}
			},
			error: function() {
				clearTimeout(reloadTimer);
				reloadTimer = setTimeout(function () { Search.getContent(); }, 2000);
			}
		});
	}
}

Search.autoReloadData = function() {
	if (Search.autoRefresh) {
		Search.autoRefresh = false;
		
		var newData = $.xslt({xmlUrl: 'index.php', xslUrl: 'alerts.xsl', xmlCache: false, xslCache: false });
		
		Search.allDataTable.clear().draw();
		
		$(newData).find('tr[class]').each(function(){
			$('#mainTable tbody').append($(this));	
			Search.allDataTable.row.add($(this));
        });
		
		Search.countRecords();
		Search.filterDataTable(true);
		Search.emptyHosts();
		
		Search.autoRefresh = true;
	}
	
	clearTimeout(reloadTimer);
	reloadTimer = setTimeout(function () { Search.autoReloadData(''); }, Search.currentReload*1000);
}

Search.filterDataTable = function(reloadAllData) {
	Search.reorderData(reloadAllData);
	Search.allDataTable.order((Search.currentTab == 'acked' || Search.currentTab == 'sched') ? [[1,'asc'],[0,'asc']] : [[2,'asc'],[4,'desc']]).draw();
	$('#mainTable tbody tr[data-group]').remove();
	
	Search.tableLength = $('#mainTable >tbody >tr[role]').length;
	Search.emptyHosts();
	Search.extension();
	
	$('.comment').toggle(Search.currentTab == 'acked' || Search.currentTab == 'sched');
	$('.comment span.ack').toggle(Search.currentTab == 'acked');
	$('.comment span.sched').toggle(Search.currentTab == 'sched');
	$('.icons.quickAck, .icons.quickUnAck').closest('li').toggle(Search.currentTab != 'acked');
}

Search.getParameterByName = function (name) {
    name        = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex   = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
		
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

Search.addParameterToUrl = function(parameter, value) {
	var newUrl          = '';
	var regExist        = new RegExp('[\?&]'+parameter+'=');
	var regReplaceExist = new RegExp('([\?&])('+parameter+'=[^&]*)(&)?');
	
	if (window.location.href.match(regExist)) {
		newUrl = window.location.href.replace(regReplaceExist,'$1'+parameter+'='+value + '$3');
	} else if (window.location.href.match(/\?/)) {		
		newUrl = window.location.href.replace(/\?/,'?'+parameter+'='+value+'&')
	} else {
		newUrl += '?'+parameter+'='+value;					
	}
	return newUrl;
}

Search.emptyHosts = function () {
    var prevHost = '';
        
	$('tbody td.host').each(function() {
		$(this).css('visibility', ($(this).find('a').text() == prevHost) ? 'hidden' : 'visible');
			
        prevHost = $(this).find('a').text();
    });
}

Search.extension = function () {
	if (Search.searchInput.val() && Search.tableLength && !$('#ext_search').length) {
		$('#mainTable_filter').after('<div id="ext_search"></div>');
		$('#ext_search').append('<img id="'+ Search.quickAckButtonId +'" src="images/ok.png" alt="Quick Acknowledge All" title="Quick Acknowledge All">');
		$('#ext_search').append('<img id="'+ Search.quickUnAckButtonId +'" src="images/avatars/'+ Search.currentUser +'.jpeg" alt="Quick UnAcknowledge All" title="Quick UnAknowledge All">');
		$('#ext_search').append('<img id="'+ Search.ackButtonId +'" src="images/acknowledgement.png" alt="Acknowledge All Services" title="Acknowledge All Services">');
		$('#ext_search').append('<img id="'+ Search.unackButtonId +'" src="images/ack.gif" alt="Unacknowledge All Services" title="Unacknowledge All Services">');
		$('#ext_search').append('<img id="'+ Search.sdButtonId +'" src="images/schedule.png" alt="Schedule Downtime for All Services" title="Schedule Downtime for All Services">');
		$('#ext_search').append('<img id="'+ Search.recheckButtonId +'" src="images/refresh.png" alt="Refresh Services Status" title="Refresh Services Status">');
	}
	
	Search.extensionVisibility();
}

Search.addDialog = function() {
	var dialog = '';
	dialog += '<div id="dialog" title="Schedule Downtime">'
	dialog += '  <p class="validateTips">All form fields are required.</p>';
	dialog += '  <form name="scheduleDowntime">';
	dialog += '    <fieldset>';
	dialog += '      <table><tr><td>';
	dialog += '        <label for="sched_interval_extension">Interval, hours</label>';
	dialog += '      </td><td>';
	dialog += '        <input type="text" name="sched_interval_extension" id="sched_interval_extension" class="text ui-widget-content">';
	dialog += '      </td></tr><tr><td>';
	dialog += '        <label for="sched_comment_extension">Comment</label>';
	dialog += '      </td><td>';
	dialog += '        <input type="text" name="sched_comment_extension" id="sched_comment_extension" class="text ui-widget-content">';
	dialog += '      </td></tr><tr><td>';
	dialog += '        <label for="sched_finish_date_time">Finish date/time</label>';
	dialog += '      </td><td>';
	dialog += '        <input type="text" name="sched_finish_date_time" id="sched_finish_date_time" class="text ui-widget-content">';
	dialog += '      </td></tr></table>';
	dialog += '    </fieldset>';
	dialog += '  </form>';
	dialog += '</div>';
	dialog += '<div id="dialogAck" title="Acknowledge">'
	dialog += '  <p class="validateTips"></p>';
	dialog += '  <form name="acknowledge">';
	dialog += '    <fieldset>';
	dialog += '      <table><tr><td>';
	dialog += '        <label for="ack_comment">Comment</label>';
	dialog += '      </td><td>';
	dialog += '        <input type="text" name="ack_comment_extension" id="ack_comment_extension" class="text ui-widget-content">';
	dialog += '      </td></tr></table>';
	dialog += '    </fieldset>';
	dialog += '  </form>';
	dialog += '</div>';
	$('body').append(dialog);
	
	Search.addDialogJs();
}

Search.addDialogJs = function() {
	$('#dialog').dialog({
		autoOpen: false,
		width:    400,
		open:     function() {
			Search.autoRefresh = false;
			Search.getServerLocalTimeDialog();
			
			if (sheduleItGroupObject) { Search.SchedItHideIconsGroup(); }
			else { Search.SchedItHideIcons($(this).attr('data-call')); }
		},
		close:    function() {
			if (Search.currentReload == 'auto') reloadTimer = setTimeout(function () { Search.getContent(); }, 0);
			else reloadTimer = setTimeout(function () { Search.autoReloadData(); }, Search.currentReload*1000);
			
			if (sheduleItGroupObject) { Search.SchedItShowIconsGroup();	}
			else { Search.SchedItShowIcons();}
			
			$('#sched_finish_date_time').datetimepicker('destroy');
			$('#openDialogServerTime').html('');
			Search.autoRefresh = true;
		},
		create:   function() {
			var $dialog = $(this);
	        $dialog.closest('.ui-dialog').on('keydown', function(ev) {
			    if (ev.keyCode === $.ui.keyCode.ESCAPE) {
					if ($('.xdsoft_datetimepicker').is(':visible')) {
						$('#sched_finish_date_time').datetimepicker('hide');
					}
					else {
						Search.clearScheduleDowntimeForm($dialog);
					}
			    }
			});
		},
		closeOnEscape: false,				
		buttons: [
			{
				text:  'Schedule Downtime',
				id:    'scheduleDowntimeButton',
				click: function() {
					if ('mass' == $(this).attr('data-call') && Search.ScheduleDowntimeServices()) {
						Search.clearScheduleDowntimeForm($(this));
					}
					if ('custom' == $(this).attr('data-call') && Search.ScheduleDowntimeCustomService()) {
						Search.clearScheduleDowntimeForm($(this));
					}							
				}
			},
			{
				text:  'Cancel',							
				click: function() {
					Search.clearScheduleDowntimeForm($(this));
				}
			}
		]
	});
	
	$('#dialogAck').dialog({
		autoOpen: false,
		width:    400,
		open:     function() {
			Search.autoRefresh = false;
			if (acknowledgeItGroupObject) {
				Search.AcknowledgeItHideIconsGroup();
			}
			else {
				Search.AcknowledgeItHideIcons($(this).attr('data-call'));
			}
		},
		close:    function() {
			if (Search.currentReload == 'auto') reloadTimer = setTimeout(function () { Search.getContent(); }, 0);
			else reloadTimer = setTimeout(function () { Search.autoReloadData(); }, Search.currentReload*1000);

			if (acknowledgeItGroupObject) {
				Search.AcknowledgeItShowIconsGroup();
			}
			else {
				Search.AcknowledgeItShowIcons();
			}
			Search.autoRefresh = true;
		},
		closeOnEscape: true,				
		buttons: [
			{
				text:  'Acknowledge',
				id:    'acknowledgeDialogButton',
				click: function() {
					if ('mass' == $(this).attr('data-call')) {
						Search.AcknowledgeItMassServices();
					}
					if ('custom' == $(this).attr('data-call')) {
						Search.AcknowledgeItCustomService();
					}
				}
			},
			{
				text:  'Cancel',							
				click: function() {
					$(this).dialog('close');
				}
			}
		]
	});
}
Search.SchedItHideIconsGroup = function(dataCall) {
	if (!sheduleItGroupObject) {
		return;
	}
	
	$('#mainTable thead tr[data-group="'+ sheduleItGroupObject +'"] .icons.scheduleIt, #mainTable thead tr[data-group="'+ sheduleItGroupObject +'"] .icons.scheduleItGroup').hide();
}
Search.SchedItHideIcons = function(dataCall) {
	if ('custom' == dataCall) {
		if (!sheduleItObject) {
			return;
		}
		
		sheduleItObject.find('img.scheduleIt').hide();
	}
	
	if ('mass' == dataCall) {
		$('#mainTable img.scheduleIt').hide();
		$('#'+ Search.sdButtonId).attr('disabled', 'disabled').addClass('ui-state-disabled');
	}
}
Search.SchedItShowIcons = function() {
	$('#'+ Search.sdButtonId).removeAttr('disabled').removeClass('ui-state-disabled');
	$('#mainTable img.scheduleIt').show();
}
Search.SchedItShowIconsGroup = function() {
	$('#mainTable thead tr[data-group="'+ sheduleItGroupObject +'"] .icons.scheduleIt, #mainTable thead tr[data-group="'+ sheduleItGroupObject +'"] .icons.scheduleItGroup').show();
	
	sheduleItGroupObject = null;
}
Search.AcknowledgeItHideIcons = function(dataCall) {
	if ('custom' == dataCall) {
		if (!acknowledgeItObject) {
			return;
		}
		
		acknowledgeItObject.find('img.acknowledgeIt').hide();
		$('#dialogAck p.validateTips').html('Alert "'+ Search.getService(acknowledgeItObject) +'" on "'+ Search.getHost(acknowledgeItObject) +'" will be acknowledged in nagios.');
	}
	
	if ('mass' == dataCall) {
		$('#mainTable img.acknowledgeIt').hide();
		$('#'+ Search.ackButtonId).attr('disabled', 'disabled').addClass('ui-state-disabled');
		$('#dialogAck p.validateTips').html('All matched alerts will be acknowledged in nagios.');
	}
}
Search.AcknowledgeItHideIconsGroup = function() {
	if (!acknowledgeItGroupObject) {
		return;
	}
	
	$('#mainTable thead tr[data-group="'+ acknowledgeItGroupObject +'"] .icons.acknowledgeIt, #mainTable thead tr[data-group="'+ acknowledgeItGroupObject +'"] .icons.acknowledgeItGroup').hide();
}
Search.AcknowledgeItShowIcons = function() {
	$('#'+ Search.ackButtonId).removeAttr('disabled').removeClass('ui-state-disabled');
	$('#mainTable img.acknowledgeIt').show();
	$('#dialogAck p.validateTips').html('');
}
Search.AcknowledgeItShowIconsGroup = function() {
	$('#mainTable thead tr[data-group="'+ acknowledgeItGroupObject +'"] .icons.acknowledgeIt, #mainTable thead tr[data-group="'+ acknowledgeItGroupObject +'"] .icons.acknowledgeItGroup').show();
	
	acknowledgeItGroupObject = null;
}

Search.AcknowledgeItCustomService = function() {
	if (!acknowledgeItObject) {
		console.log("no row were found: acknowledge service won't be run");
		return;
	}
	
	if (!Search.AcknowledgeItHandlePopup()) {
		return;
	}
	
	var request             = Search.returnAckRequest(acknowledgeItObject);
		request['com_data'] = $('input[name="ack_comment_extension"]').val();

	$.when.apply($, [Search.sendAjax(request)])
		.then(
			function() {},
			function(data, textStatus, jqXHR) {
				alert('server error: '+ jqXHR);
			}
		)
		.always(
			function () {
				acknowledgeItObject = null;
				$('input[name="ack_comment_extension"]').val('');
				$('#dialogAck').dialog('close');
			}
		);
}
Search.AcknowledgeItMassServices = function() {
	if ((!acknowledgeItGroupObject && !Search.tableLength) || (acknowledgeItGroupObject && !$('#mainTable thead tr[data-group="'+ acknowledgeItGroupObject +'"] .icons.acknowledgeIt').length)) {
		console.log("no rows were found: acknowledge service won't be run");
		return;
	}
	
	if (!Search.AcknowledgeItHandlePopup()) {
		return;
	}
	
	var itemsList = [];
	
	if (acknowledgeItGroupObject) {
		$('#mainTable thead tr[data-group="'+ acknowledgeItGroupObject +'"] .icons.acknowledgeIt').each(function () {
			var request = Search.returnAckRequest($(this).closest('tr'));
				request['com_data'] = $('input[name="ack_comment_extension"]').val();
				
			itemsList.push(Search.sendAjax(request));
		});
	}
	else {
		$('#mainTable >tbody >tr[role]').each(function () {
			var request = Search.returnAckRequest($(this));
				request['com_data'] = $('input[name="ack_comment_extension"]').val();
				
			itemsList.push(Search.sendAjax(request));
		});
	}
	
	$.when.apply($, itemsList)
		.then(
			function() {},
			function(data, textStatus, jqXHR) {
				alert('server error: '+ jqXHR);
			}
		)
		.always(
			function () {
				$('input[name="ack_comment_extension"]').val('');
				$('#dialogAck').dialog('close');
			}
		);
}
Search.AcknowledgeItHandlePopup = function() {
	var $form = $('form[name="acknowledge"]');
	$form.find('.ui-state-error').each(function(){			
		$(this).removeClass('ui-state-error');
	})
	
	$comment = $('input[name="ack_comment_extension"]');
	if ($comment.val() == '' || typeof($comment.val()) != 'string') {
		$comment.addClass('ui-state-error');		
	}
	
	if ($form.find('.ui-state-error').length > 0) {			
		return false;
	}
	
	return true;
}

Search.ScheduleDowntimeHandlePopup = function() {
	var $form = $('form[name=scheduleDowntime]');
	$form.find('.ui-state-error').each(function(){			
		$(this).removeClass('ui-state-error');
	})
	
	$interval = $('input[name=sched_interval_extension]');
	if (!parseInt($interval.val()) || parseInt($interval.val()) < 1) {
		$interval.addClass('ui-state-error');
	}
	
	$comment = $('input[name=sched_comment_extension]');
	if ($comment.val() == '' || typeof($comment.val()) != 'string') {
		$comment.addClass('ui-state-error');		
	}
	
	if ($form.find('.ui-state-error').length > 0) {			
		return false;
	}

	$('#timeShift').html(parseInt($interval.val()));
	$('#downtimeComment').html($comment.val());
	
	return true;
}

Search.getServerLocalTime = function() {
	$('#lastUpdated').html('');
	
	return $.get($('#nagiosConfigFile').html(), function(data) {
		var regex       = new RegExp(/Last Updated:\s*([^<]+)/i),
			results     = regex.exec(data);
		
		$('#lastUpdated').html(results[1]);
	});
}
Search.getServerLocalTimeDialog = function() {
	$('#openDialogServerTime').html('');
	
	$.get($('#nagiosConfigFile').html(), function(data) {
		var regex       = new RegExp(/Last Updated:\s*([^<]+)/i),
			results     = regex.exec(data);
		
		$('#openDialogServerTime').html(results[1]);
		
		var currentServerDate = $('#openDialogServerTime').html().replace(/UTC|EDT|C?EST|GMT/gi, '');
		
		$('#sched_finish_date_time').datetimepicker({
			minDate:        new Date(currentServerDate).format('mm-dd-yyyy'),
			formatDate:     'm-d-Y',
			formatTime:     'H:i',
			allowTimes:     Search.getDefaultMinutes(new Date(currentServerDate).format('MM')),
			value:          new Date(currentServerDate).format('mm-dd-yyyy HH:MM'),
			format:         'm-d-Y H:i',
			validateOnBlur: false,
			yearStart:      parseInt(new Date(currentServerDate).format('yyyy')),
			yearEnd:        parseInt(new Date(currentServerDate).format('yyyy')) + 3,
			scrollMonth:    false,
			dayOfWeekStart: 1,
		});
	});
}
Search.getDefaultMinutes = function(minutes) {
	var allowTimes = [];
	
	for (i=0; i<24; i++) {
		var value = '';
		
		if (i < 10) {
			value += '0';
		}
		value += i+':'+minutes;
		allowTimes.push(value);
	}
	
	return allowTimes;
}

Search.getScheduleDowntimeRequest = function(row) {
	var currentServerDate = $('#lastUpdated').html().replace(/UTC|EDT|C?EST|GMT/gi, ''),
		hours             = parseInt($('#timeShift').html(),10);
	
	return {
		cmd_typ:    56,
		cmd_mod:    2,
		trigger:    0,
		fixed:      1,
		minutes:    0,
		hours:      hours,
		start_time: new Date(currentServerDate).format('mm-dd-yyyy HH:MM:ss'),
		end_time:   new Date(currentServerDate).addHours(hours).format('mm-dd-yyyy HH:MM:ss'),
		com_data:   $('#downtimeComment').html(),
		host:       Search.getHost(row),
		service:    Search.getService(row),
	}
}

Search.ScheduleDowntimeServices = function() {
	if ((!sheduleItGroupObject && !Search.tableLength) || (sheduleItGroupObject && !$('#mainTable thead tr[data-group="'+ sheduleItGroupObject +'"] .icons.scheduleIt').length)) {
		console.log("no rows were found: schedule service won't be run");
		return;
	}
	
	if (!Search.ScheduleDowntimeHandlePopup()) {
		return;
	}
	
	$.when.apply($, [Search.getServerLocalTime()])
		.then(
			function() {
				var button    = $('#'+ Search.sdButtonId),
					itemsList = [];
				
				button.attr('disabled', 'disabled').addClass('ui-state-disabled');
				
				if (sheduleItGroupObject) {
					$('#mainTable thead tr[data-group="'+ sheduleItGroupObject +'"] .icons.scheduleIt').each(function () {
						itemsList.push(Search.sendAjax(Search.getScheduleDowntimeRequest($(this).closest('tr'))));
					});
				}
				else {
					$('#mainTable >tbody >tr[role]').each(function () {
						itemsList.push(Search.sendAjax(Search.getScheduleDowntimeRequest($(this))));
					});
				}
				
				$.when.apply($, itemsList)
					.then(
						function() {},
						function(data, textStatus, jqXHR) {
							alert('server error: '+ jqXHR);
						}
					)
					.always(
						function () {
							button.removeAttr('disabled').removeClass('ui-state-disabled');
						}
					);
			},
			function(data, textStatus, jqXHR) {
				alert('server error: '+ jqXHR);
			}
		);
	
	return true;
}

Search.ScheduleDowntimeCustomService = function() {
	if (!sheduleItObject) {
		console.log("no row were found: schedule service won't be run");
		return;
	}
	
	if (!Search.ScheduleDowntimeHandlePopup()) {
		return;
	}
	
	$.when.apply($, [Search.getServerLocalTime()])
		.then(
			function() {
				var button = sheduleItObject.find('.scheduleIt');
			
				button.hide();
				
				$.when.apply($, [Search.sendAjax(Search.getScheduleDowntimeRequest(sheduleItObject))])
					.then(
						function() {
							sheduleItObject = null;
						},
						function(data, textStatus, jqXHR) {
							alert('server error: '+ jqXHR);
						}
					)
					.always(
						function () {
							button.show();
						}
					);
			},
			function(data, textStatus, jqXHR) {
				alert('server error: '+ jqXHR);
			}
		);
	
	return true;	
}

Search.clearScheduleDowntimeForm = function($dialog) {
	$('form[name=scheduleDowntime] input').val('');
	$('form[name=scheduleDowntime] .ui-state-error').removeClass('ui-state-error');
	$dialog.dialog('close');
}

Search.extensionVisibility = function () {
	if (Search.searchInput.val() && Search.tableLength) {
		$(Search.filterButtons).show();
		(Search.currentTab != 'acked' && $('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck:not([src*="'+ Search.currentUser +'"])').length) ? $('#'+ Search.quickAckButtonId).show() : $('#'+ Search.quickAckButtonId).hide();
		(Search.currentTab != 'acked' && $('#mainTable tbody .icons.quickUnAck').length) ? $('#'+ Search.quickUnAckButtonId).show() : $('#'+ Search.quickUnAckButtonId).hide();
		(Search.currentTab == 'acked' && $('#mainTable tbody .icons.unAckThis').length) ? $('#'+ Search.unackButtonId).show() : $('#'+ Search.unackButtonId).hide();
	}
	else {
		$(Search.filterButtons).hide();
	}
}

Search.getService = function(row) {
	return (row.length && row.find('td.service ul li:first-child a').html()) ? row.find('td.service ul li:first-child a').html() : '';
}

Search.getHost = function(row) {
	return (row.length && row.find('td.host a').html()) ? row.find('td.host a').html() : '';
}

Search.getLastCheck = function(row) {
	return (row.length && row.find('td.last_check').html()) ? row.find('td.last_check').html() : '';
} 

Search.returnRecheckRequest = function(row) {
	return {
		cmd_typ:     7,
		cmd_mod:     2,
		force_check: 'on',
		start_time:  Search.getLastCheck(row),
		host:        Search.getHost(row),
		service:     Search.getService(row),
	};
}

Search.returnAckRequest = function(row) {
	return {
		cmd_typ:           34,
		cmd_mod:           2,
		sticky_ack:        'on',
		send_notification: 'on',
		service:           Search.getService(row),
		host:              Search.getHost(row),
	};
}

Search.returnUnAckRequest = function(row) {
	return {
		cmd_typ:           52,
		cmd_mod:           2,
		service:           Search.getService(row),
		host:              Search.getHost(row),
	};
}

Search.returnDowntimeRequest = function(down_id) {
	return {
		cmd_typ: 79,
		cmd_mod: 2,
		down_id: down_id,
	};
}

Search.sendAjax = function(reqData) {		
	return $.ajax({
		crossDomain: true,
		url:    $('#nagiosPostFile').html(),
		method: 'POST',
		data:   reqData,
	});
}

Search.countRecords = function() {
	$('#radio label[for="normal"] em').text($('#mainTable tr:contains("__normal__")').length);
	$('#radio label[for="acked"] em').text($('#mainTable tr:contains("__acked__")').length);
	$('#radio label[for="sched"] em').text($('#mainTable tr:contains("__sched__")').length);
	$('#radio label[for="EMERGENCY"] em').text($('#mainTable tr:contains("EMERGENCY")').length);
}

Search.countRecordsMinus = function(buttonID) {
	var count = parseInt($('#radio label[for="'+ buttonID +'"] em').text()) - 1;
	$('#radio label[for="'+ buttonID +'"] em').text(count);
}

Search.countRecordsPlus = function(buttonID) {
	var count = parseInt($('#radio label[for="'+ buttonID +'"] em').text()) + 1;
	$('#radio label[for="'+ buttonID +'"] em').text(count);
}

Search.reorderData = function(reloadAllData) {
	if (reloadAllData) {
		$('#mainTable thead tr').not(':first').remove();
	} else {
		$('#mainTable thead tr').not(':first').hide();
	}
	
	if (Search.currentTab == 'normal') {
		Search.allDataTable.order([[1,'asc'], [2,'asc']]).draw();

		$('#mainTable tr[data-group]').each(function() {
			var newRow = $(this).clone(),
				oldRow = $(this);
			
			$('#mainTable thead').append(newRow);
			$(oldRow).remove();
		});
		
		$('#mainTable tr[data-group]').hide();
		$('#mainTable thead tr.group-list').removeClass('open').show();
		
		$('#mainTable tr[data-group]').each(function() {
			if (localStorage.getItem(Search.currentTab + '_' + $(this).attr('data-group'))) {
				$('#mainTable tr[data-group="'+ $(this).attr('data-group') +'"]').show();
				$('#mainTable tr.group-list[data-group="'+ $(this).attr('data-group') +'"]').addClass('open');
				$('#mainTable tr[data-group="'+  $(this).attr('data-group') +'"]:not(.group-list):last').addClass('group-list-bottom');
			}
		});
		
		$('#radio label[for="normal"] em').text($('#mainTable tr:contains("__normal__")').length);
	}
}

Search.init = function() {
	var typingTimer,
		doneTypingInterval = ($('#mainTable tr').length > 1000) ? 350 : 0,
		refreshValues      = [],
		reloadValue        = (parseInt(Search.currentReload) > 0) ? parseInt(Search.currentReload) : Search.autoRefreshTime;

	$('#' + Search.currentTab).attr('checked', 'checked');
	$('#radio').buttonset();
	Search.countRecords();
	Search.allDataTable.draw();
	Search.searchInput.val(Search.getParameterByName('search')).trigger('keyup');
	Search.filterDataTable();
	Search.addDialog();
	$('#loading').hide();
	$('#infoHolder').show();
	Search.searchInput.focus();
	

	Search.allDataTable.on('order.dt', function () {
		$('#mainTable tbody tr[data-group]').remove();
	});
	
	Search.allDataTable.on('search.dt', function () {
		$('#mainTable tbody tr[data-group]').remove();
	});
	
	Search.searchInput.unbind('propertychange change keyup input paste keydown').bind('propertychange change keyup input paste keydown', function (e) {
		var val = $(this).val();

		typingTimer = setTimeout(function(){
			Search.allDataTable.search(val).draw();
			Search.tableLength = $('#mainTable >tbody >tr[role]').length;
			Search.extension();
			Search.emptyHosts();
		}, doneTypingInterval);
		
		if (e.keyCode && e.keyCode == 13) {
			window.location.href = Search.addParameterToUrl('search', val);
		}
	});
	
	$('#normal, #acked, #sched, #EMERGENCY').on('click', function() {
		$('td.host').css('visibility', 'visible');
		
		if (Search.currentTab == $(this).attr('id')) {
		    location.reload();
		    return false;
		}
		
		localStorage.setItem('currentTabNew', $(this).attr('id'));
		Search.currentTab = localStorage.getItem('currentTabNew');
		
		Search.filterDataTable();
		Search.emptyHosts();
	});
	
	$('#mainTable').on('click', '.downtime_id', function () {
		Search.autoRefresh = false;
		
		var button    = $(this),
			rowRemove = button.closest('tr'),
			request   = Search.returnDowntimeRequest(button.find('span').html());
			
		button.hide();
			
		$.when.apply($, [Search.sendAjax(request)])
			.then(
				function() {
					Search.countRecordsMinus(Search.currentTab);
					Search.allDataTable.row(rowRemove).remove().draw();
					Search.emptyHosts();
				},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
					button.show();
				}
			)
			.always(
				function () {
					Search.filterDataTable();
					Search.emptyHosts();
					Search.autoRefresh = true;
				}
			);
	});
	
	$('#mainTable').on('click', 'thead .quickAckGroup', function () {
		Search.autoRefresh = false;
		
		var dataGroup = $(this).closest('tr').attr('data-group'),
			itemsList = [];
		
		if (!$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck').length) {
			console.log("no rows were found: quick ack won't be run");
			Search.autoRefresh = true;
			return;
		}
		
		$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAckGroup').hide();
		
		$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck').each(function () {
			var request = Search.returnAckRequest($(this).closest('tr'));
				request['com_data'] = 'temp';

			itemsList.push(Search.sendAjax(request));
		});
		
		
		$.when.apply($, itemsList)
			.then(
				function() {
					$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAckGroup')
					.attr('alt', Search.currentUser + ' unack')
					.attr('title', Search.currentUser + ' unack')
					.attr('src', 'images/avatars/'+ Search.currentUser +'.jpeg')
					.removeClass('quickAck')
					.removeClass('quickAckGroup')
					.addClass('quickUnAck')
					.show();
					
					$('#mainTable thead tr.group-list[data-group="'+ dataGroup +'"] .quickUnAck').removeClass('quickUnAck').addClass('quickUnAckGroup');
				},
				function(data, textStatus, jqXHR) {
					$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickAckGroup').show();
					alert('server error: '+ jqXHR);
				}
			)
			.always(
				function () {
					Search.autoRefresh = true;
					quickAckUnAckGroup();
				}
			);

		
		return false;
	});
	$('#mainTable').on('click', '.quickAck', function () {
		Search.autoRefresh = false;
		
		var button  = $(this),
			request = Search.returnAckRequest(button.closest('tr'));
			
		button.hide();
		request['com_data'] = 'temp';
		
		$.when.apply($, [Search.sendAjax(request)])
			.then(
				function() {
					button.removeClass('quickAck').addClass('quickUnAck');
					button.attr('alt', Search.currentUser + ' unack').attr('title', Search.currentUser + ' unack').attr('src', 'images/avatars/'+ Search.currentUser +'.jpeg').show();
				},
				function(data, textStatus, jqXHR) {
					button.show();
					alert('server error: '+ jqXHR);
				}
			)
			.always(
				function () {
					Search.autoRefresh = true;
					quickAckUnAckGroup();
				}
			);
	});
	$(document).on('click', '#'+ Search.quickAckButtonId, function () {
		Search.autoRefresh = false;
		
		if (!$('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck').length) {
			console.log("no rows were found: quick ack won't be run");
			Search.autoRefresh = false;
			return;
		}
		
		var button    = $(this),
			itemsList = [];
			
		button.attr('disabled', 'disabled').addClass('ui-state-disabled');
		$('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck').hide();
		
		$('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck').each(function () {
			var request = Search.returnAckRequest($(this).closest('tr'));
				request['com_data'] = 'temp';

			itemsList.push(Search.sendAjax(request));
		}); 
		
		$.when.apply($, itemsList)
			.then(
				function() {
					$('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck')
					.attr('alt', Search.currentUser + ' unack')
					.attr('title', Search.currentUser + ' unack')
					.attr('src', 'images/avatars/'+ Search.currentUser +'.jpeg')
					.removeClass('quickAck')
					.addClass('quickUnAck')
					.show();
				},
				function(data, textStatus, jqXHR) {
					$('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck').show();
					alert('server error: '+ jqXHR);
				}
			)
			.always(
				function () {
					button.removeAttr('disabled').removeClass('ui-state-disabled');
					Search.autoRefresh = true;
					quickAckUnAckGroup();
				}
			);
	});
	
	$('#mainTable').on('click', 'thead .quickUnAckGroup', function () {
		Search.autoRefresh = false;
		
		var dataGroup = $(this).closest('tr').attr('data-group');
			itemsList = [];
		
		if (!$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck').length) {
			console.log("no rows were found: quick unack won't be run");
			Search.autoRefresh = true;
			return;
		}
		
		$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAckGroup').hide();

		$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck').each(function () {
			itemsList.push(Search.sendAjax(Search.returnUnAckRequest($(this).closest('tr'))));
		});
		
		$.when.apply($, itemsList)
			.then(
				function() {
					$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAckGroup')
						.attr('alt', 'Quick Acknowledge')
						.attr('title', 'Quick Acknowledge')
						.attr('src', 'images/ok.png')
						.removeClass('quickUnAck')
						.removeClass('quickUnAckGroup')
						.addClass('quickAck')
						.show();
						
					$('#mainTable thead tr.group-list[data-group="'+ dataGroup +'"] .quickAck').removeClass('quickAck').addClass('quickAckGroup');
				},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
					$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAck, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.quickUnAckGroup').show();
				}
			)
			.always(
				function () {
					Search.autoRefresh = true;
					quickAckUnAckGroup();
				}
			);
			
		return false;
	});
	$('#mainTable').on('click', '.quickUnAck', function () {
		Search.autoRefresh = false;
		
		var button  = $(this),
			request = Search.returnUnAckRequest(button.closest('tr'));
			
		button.hide();
		
		$.when.apply($, [Search.sendAjax(request)])
			.then(
				function() {
					button.removeClass('quickUnAck').addClass('quickAck');
					button.attr('alt', 'Quick Acknowledge').attr('title', 'Quick Acknowledge').attr('src', 'images/ok.png').show();
				},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
					button.show();
				}
			)
			.always(
				function () {
					Search.autoRefresh = true;
					quickAckUnAckGroup();
				}
			);
	});
	$(document).on('click', '#'+ Search.quickUnAckButtonId, function () {
		Search.autoRefresh = false;
		
		if (!$('#mainTable tbody .icons.quickUnAck').length) {
			console.log("no rows were found: quick unack won't be run");
			return;
		}
		
		var button    = $(this),
			itemsList = [];
			
		button.attr('disabled', 'disabled').addClass('ui-state-disabled');
		$('#mainTable tbody .icons.quickUnAck').hide();
		
		$('#mainTable tbody .icons.quickUnAck').each(function () {
			itemsList.push(Search.sendAjax(Search.returnUnAckRequest($(this).closest('tr'))));
		});
		
		$.when.apply($, itemsList)
			.then(
				function() {
					$('#mainTable tbody .icons.quickUnAck')
						.attr('alt', 'Quick Acknowledge')
						.attr('title', 'Quick Acknowledge')
						.attr('src', 'images/ok.png')
						.removeClass('quickUnAck')
						.addClass('quickAck')
						.show();
				},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
					$('#mainTable tbody .icons.quickUnAck').show();
				}
			)
			.always(
				function () {
					button.removeAttr('disabled').removeClass('ui-state-disabled');
					Search.autoRefresh = true;
					quickAckUnAckGroup();
				}
			);
	});
	
	$('#mainTable').on('click', '.unAckThis', function () {
		Search.autoRefresh = false;
		
		var button  = $(this),
			thisRow = button.closest('tr'),
			request = Search.returnUnAckRequest(thisRow);
			
		button.hide();
		
		$.when.apply($, [Search.sendAjax(request)])
			.then(
				function() {
					var newRow = thisRow.clone();
						newRow.find('.unAckThis').closest('li').remove();
						newRow.find('.comment span.ack').html('');
					
					var statusText = newRow.find('.comment span').first().text().replace('__acked__', '');
					
					if (!statusText) {
						statusText = '__normal__';
						Search.countRecordsPlus('normal');
					}
					
					newRow.find('.comment span').first().text(statusText);
						
					Search.countRecordsMinus('acked');
					Search.allDataTable.row.add(newRow);
					Search.allDataTable.row(thisRow).remove();
					Search.allDataTable.draw();
					Search.emptyHosts();
				},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
					button.show();
				}
			)
			.always(
				function () {
					Search.filterDataTable();
					Search.emptyHosts();
					Search.autoRefresh = true;
				}
			);
	});
	$(document).on('click', '#'+ Search.unackButtonId, function () {
		Search.autoRefresh = false;
		
		if (!$('#mainTable tbody .icons.unAckThis').length) {
			console.log("no rows were found: unack won't be run");
			return;
		}
		
		var button    = $(this),
			itemsList = [];
			
		button.attr('disabled', 'disabled').addClass('ui-state-disabled');
		$('#mainTable tbody .icons.unAckThis').hide();
		
		$('#mainTable tbody .icons.unAckThis').each(function () {
			itemsList.push(Search.sendAjax(Search.returnUnAckRequest($(this).closest('tr'))));
		});
		
		$.when.apply($, itemsList)
			.then(
				function() {
					$('#mainTable tbody .icons.unAckThis').each(function () {
						var newRow = $(this).closest('tr').clone();
							newRow.find('.unAckThis').closest('li').remove();
							newRow.find('.comment span.ack').html('');
						
						var statusText = newRow.find('.comment span').first().text().replace('__acked__', '');
						
						if (!statusText) {
							statusText = '__normal__';
							Search.countRecordsPlus('normal');
						}
				
						newRow.find('.comment span').first().text(statusText);
						
						Search.countRecordsMinus('acked');
						Search.allDataTable.row.add(newRow);
						Search.allDataTable.row($(this).closest('tr')).remove();
						Search.allDataTable.draw();
						Search.emptyHosts();
					});
				},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
					$('#mainTable tbody .icons.unAckThis').show();
				}
			)
			.always(
				function () {
					button.removeAttr('disabled').removeClass('ui-state-disabled');
					Search.filterDataTable();
					Search.emptyHosts();
					Search.autoRefresh = true;
				}
			);
	});
	
	$('#hosts').on("click", function() {
        window.open($('#nagiosFullListUrl').html().replace('&amp;', '&'), '_blank');
	});
	
	$('#mainTable').on('click', 'thead .recheckItGroup', function () {
		Search.autoRefresh = false;
		
		var dataGroup = $(this).closest('tr').attr('data-group');
			itemsList = [];
		
		if (!$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.recheckIt').length) {
			console.log("no rows were found: re-check won't be run");
			Search.autoRefresh = true;
			return;
		}
		
		$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.recheckIt, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.recheckItGroup').hide();
		
		$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.recheckIt').each(function () {
			itemsList.push(Search.sendAjax(Search.returnRecheckRequest($(this).closest('tr'))));
		});
		
		$.when.apply($, itemsList)
			.then(
				function() {},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
				}
			)
			.always(
				function () {
					$('#mainTable thead tr[data-group="'+ dataGroup +'"] .icons.recheckIt, #mainTable thead tr[data-group="'+ dataGroup +'"] .icons.recheckItGroup').show();
					Search.autoRefresh = true;
				}
			);
			
		return false;
	});
	$('#mainTable').on('click', '.recheckIt', function () {
		Search.autoRefresh = false;
		
		var button  = $(this),
			request = Search.returnRecheckRequest(button.closest('tr'));
		
		button.hide();
		
		$.when.apply($, [Search.sendAjax(request)])
			.then(
				function() {},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
				}
			)
			.always(
				function () {
					button.show();
					Search.autoRefresh = true;
				}
			);
	});
	$(document).on('click', '#'+ Search.recheckButtonId, function () {
		Search.autoRefresh = false;
		
		if (!Search.tableLength) {
			console.log("no rows were found: re-check won't be run");
			return;
		}
		
		var button    = $(this),
			itemsList = [];
			
		button.attr('disabled', 'disabled').addClass('ui-state-disabled');
		$('#mainTable tbody .icons.recheckIt').hide();
		
		$('#mainTable >tbody >tr[role]').each(function () {
			itemsList.push(Search.sendAjax(Search.returnRecheckRequest($(this))));
		});
		
		$.when.apply($, itemsList)
			.then(
				function() {},
				function(data, textStatus, jqXHR) {
					alert('server error: '+ jqXHR);
				}
			)
			.always(
				function () {
					button.removeAttr('disabled').removeClass('ui-state-disabled');
					$('#mainTable tbody .icons.recheckIt').show();
					Search.autoRefresh = true;
				}
			);
	});
	
	$('#mainTable').on('click', 'thead .acknowledgeItGroup', function () {
		acknowledgeItGroupObject = $(this).closest('tr').attr('data-group');
		$('#dialogAck').attr('data-call', 'mass').dialog('open');
		
		return false;
	});
	$('#mainTable').on('click', '.acknowledgeIt', function () {		
		acknowledgeItObject = $(this).closest('tr');
		$('#dialogAck').attr('data-call', 'custom').dialog('open');
	});
	$(document).on('click', '#'+ Search.ackButtonId, function () {
		$('#dialogAck').attr('data-call', 'mass').dialog('open');
	});
	
	$('#mainTable').on('click', 'thead .scheduleItGroup', function () {
		sheduleItGroupObject = $(this).closest('tr').attr('data-group');
		$('#dialog').attr('data-call', 'mass').dialog('open');
		
		return false;
	});
	$('#mainTable').on('click', '.scheduleIt', function () {
		sheduleItObject = $(this).closest('tr');
		$('#dialog').attr('data-call', 'custom').dialog('open');
	});
	$(document).on('click', '#'+ Search.sdButtonId, function () {
		$('#dialog').attr('data-call', 'mass').dialog('open');
	});
	
	$(document).on('submit','form[name=scheduleDowntime]', function() {
		return false;
	});
	
	$(document).on('submit','form[name="acknowledge"]', function() {
		return false;
	});

	$('#sched_comment_extension, #sched_interval_extension').on('keypress', function (e) {
		if (e.keyCode && e.keyCode == 13) {
			$('#scheduleDowntimeButton').trigger('click');
		}
	});
	
	$('#ack_comment_extension').on('keypress', function (e) {
		if (e.keyCode && e.keyCode == 13) {
			$('#acknowledgeDialogButton').trigger('click');
		}
	});
	
	$('#refreshTime select option').each(function () {
		refreshValues.push($(this).val());	
	});
	
	if ($.inArray(Search.currentReload, refreshValues) !== -1) {
		$('#refreshTime select option[value="'+ Search.currentReload +'"]').attr('selected', 'selected');
	} else {
		$('#refreshTime select option[value="custom"]').text(Search.reloadCustomText + ' ('+ parseInt(Search.currentReload) +')').attr('selected', 'selected');
	}
	

	if (Search.currentReload == 'auto') {
		reloadTimer = setTimeout(function () { Search.getContent(); }, 0);
	}
	else {
		reloadTimer = setTimeout(function () { Search.autoReloadData(); }, Search.currentReload*1000);
	}
	
	
	$('#refreshTimeSelect').selectmenu({
		select: function (event, data) {
			if (data.item.value == 'auto') {
				Search.backgroundReload = true;
				clearTimeout(reloadTimer);
				localStorage.setItem('currentReloadNew', data.item.value);
				reloadTimer = setTimeout(function () { Search.getContent(); }, 0);
				return;
			}
			
			Search.backgroundReload = false;
			
			if (data.item.value == 'custom') {
				var reload = prompt('Enter page reload time (minutes):', '');
				
				Search.autoRefresh = false;
				
				if (parseInt(reload)*60 > 0) {
					localStorage.setItem('currentReloadNew', parseInt(reload)*60);
					Search.currentReload = localStorage.getItem('currentReloadNew');
					$('#refreshTime select option[value="custom"]').text(Search.reloadCustomText + ' ('+ parseInt(Search.currentReload) +')');
				}
				
				Search.autoRefresh = true;
			}
			else {
				localStorage.setItem('currentReloadNew', data.item.value);
				Search.currentReload = localStorage.getItem('currentReloadNew');
				$('#refreshTime select option[value="custom"]').text(Search.reloadCustomText);
			}
			
			if ($.inArray(Search.currentReload, refreshValues) !== -1) {
				$('#refreshTime select option[value="'+ Search.currentReload +'"]').attr('selected', 'selected');
			} else {
				$('#refreshTime select option[value="custom"]').attr('selected', 'selected');
			}
			
			$('#refreshTimeSelect').selectmenu('refresh');
			
			clearTimeout(reloadTimer);
			reloadTimer = setTimeout(function () { Search.autoReloadData(); }, Search.currentReload*1000);
		}
	});
	
	$('#sched_finish_date_time').on('change', function() {
		var currentServerDate = $('#openDialogServerTime').html().replace(/UTC|EDT|C?EST|GMT/gi, ''),
			selectedDate      = $('#sched_finish_date_time').val(),
			differenceDate    = new Date(selectedDate) - new Date(currentServerDate);
		
		if (differenceDate && differenceDate > 0) {
			differenceDate = Math.ceil(differenceDate / 3600000);
			$('#sched_interval_extension').val(differenceDate);
		}
		else {
			$('#sched_interval_extension').val(0);
			$('#sched_finish_date_time').datetimepicker({value: new Date(currentServerDate).format('mm-dd-yyyy HH:MM')});
		}
	});
	
	$('#sched_interval_extension').on('change', function() {
		var currentServerDate = $('#openDialogServerTime').html().replace(/UTC|EDT|C?EST|GMT/gi, ''),
			selectedDate      = parseInt($('#sched_interval_extension').val());
		
		if (selectedDate && selectedDate > 0) {
			$('#sched_interval_extension').val(selectedDate);
			$('#sched_finish_date_time').datetimepicker({value: new Date(currentServerDate).addHours(selectedDate).format('mm-dd-yyyy HH:MM')});
		}
		else {
			$('#sched_interval_extension').val(0);
			$('#sched_finish_date_time').datetimepicker({value: new Date(currentServerDate).format('mm-dd-yyyy HH:MM')});
		}
	});
	
	Date.prototype.format = function (mask, utc) {
		return dateFormat(this, mask, utc);
	};
	Date.prototype.addHours = function(h){
		this.setHours(this.getHours()+h);
		return this;
	}

	$(document).on('click', '.group-list', function () {
		var attr = $(this).attr('data-group');
		
		if ($(this).hasClass('open')) {
			localStorage.removeItem(Search.currentTab + '_' + attr);
			$('#mainTable tr[data-group="'+ attr +'"]:not(.group-list)').removeClass('group-list-bottom').hide();
			$(this).removeClass('open');
		}
		else {
			localStorage.setItem(Search.currentTab + '_' + attr, true);
			$('#mainTable tr[data-group="'+ attr +'"]:not(.group-list)').show();
			$('#mainTable tr[data-group="'+ attr +'"]:not(.group-list):last').addClass('group-list-bottom');
			$(this).addClass('open');
		}
		
	});
	
	$('img').error(function(){
        $(this).attr('src', 'images/avatars/empty.jpeg');
	});
}

$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
	return (Search.currentTab && (data.join(' ').search((Search.currentTab == 'EMERGENCY') ? Search.currentTab : '__' + Search.currentTab + '__') >= 0)) ? true : false;
});

function quickAckUnAckGroup() {
	$('#mainTable thead tr.group-list[data-group]').each(function() {
		var dataGroup = $(this).attr('data-group'),
			unAckIcons  = [];
			
		$('#mainTable thead tr[data-group="'+ dataGroup +'"]:not(.group-list)').each(function() {
			if ($(this).find('.quickUnAck').length) {
				unAckIcons.push($(this).find('.quickUnAck').clone());
			}
		});
		
		if ($('#mainTable thead tr[data-group="'+ dataGroup +'"]:not(.group-list)').length == unAckIcons.length) {
			$('#mainTable thead tr.group-list[data-group="'+ dataGroup +'"] .quickAckUnAckIcon')
				.html(unAckIcons[0])
				.find('.icons')
				.attr('alt', 'Quick UnAcknowledge All')
				.attr('title', 'Quick UnAcknowledge All')
				.removeClass('quickUnAck')
				.addClass('quickUnAckGroup');  
		}
		else {
			$('#mainTable thead tr.group-list[data-group="'+ dataGroup +'"] .quickAckUnAckIcon')
				.html('<img class="icons quickAckGroup" src="images/ok.png" alt="Quick Acknowledge" title="Quick Acknowledge">');
		}
	});
}

function getSeconds(str) {
	var seconds = 0,
		days    = str.match(/(\d+)\s*d/),
		hours   = str.match(/(\d+)\s*h/),
		minutes = str.match(/(\d+)\s*m/);
	
	if (days) { seconds += parseInt(days[1])*86400; }
	if (hours) { seconds += parseInt(hours[1])*3600; }
	if (minutes) { seconds += parseInt(minutes[1])*60; }
  
  return seconds;
}