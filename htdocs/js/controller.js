if (!localStorage.getItem('currentTabNew')) {
	localStorage.setItem('currentTabNew', 'normal');
}
if (!localStorage.getItem('currentReloadNew')) {
	localStorage.setItem('currentReloadNew', 'auto');
}
if (!localStorage.getItem('currentGroup')) {
	localStorage.setItem('currentGroup', '0');
}
if (!localStorage.getItem('canceledReloads')) {
	localStorage.setItem('canceledReloads', '0');
}

var tmpTab    = localStorage.getItem('currentTabNew'),
	tmpReload = localStorage.getItem('currentReloadNew'),
	tmpGroup  = localStorage.getItem('currentGroup');
	
localStorage.clear();
localStorage.setItem('currentTabNew', tmpTab);
localStorage.setItem('currentReloadNew', tmpReload);
localStorage.setItem('currentGroup', tmpGroup);
localStorage.setItem('canceledReloads', '0');

lastTime = (new Date()).getTime();

Search = {}
	Search.hideMoreArray      = [];
	Search.allHeaderRows      = {}
	Search.currentTab         = localStorage.getItem('currentTabNew');
	Search.currentGroup       = localStorage.getItem('currentGroup');
	Search.currentReload      = localStorage.getItem('currentReloadNew');
	Search.reloadCustomText   = 'Refresh: Custom';
	Search.autoRefresh        = true;
	Search.backgroundReload   = true;
	Search.firstLoad          = true;
	Search.tableLength        = 0;
	Search.doneTypingInterval = 0;
	Search.recheckButtonId    = 'recheckIt_button';
	Search.quickAckButtonId   = 'quickAck_button';
	Search.quickUnAckButtonId = 'quickUnAck_button';
	Search.ackButtonId        = 'acknowledgeIt_button';
	Search.unackButtonId      = 'unAck_button'; 
	Search.sdButtonId         = 'scheduleIt_button';
	Search.searchValue        = '';
	Search.lastUpdateAgo      = 0;
	Search.filterButtons      = '#'+ Search.recheckButtonId +', #'+ Search.ackButtonId +', #'+ Search.sdButtonId +', #'+ Search.quickAckButtonId +', #'+ Search.quickUnAckButtonId +', #'+ Search.unackButtonId + ', #unScheduleIt_button, #unAcknowledgeIt_button';
	Search.orderBy = {
		'normal'        : [[2,'desc'],[4,'desc']],
		'acked'         : [[1, 'asc'],[0, 'asc']],
		'sched'         : [[1, 'asc'],[0, 'asc']],
		'EMERGENCY'     : [[2,'desc'],[4,'desc']],
		'planned'       : [[2,'desc'],[4,'desc']],
	};
	Search.additionalFile     = (getParameterByName('file')) ? '&file=' + getParameterByName('file') : '';
	Search.allDataTable       = $('#mainTable').DataTable({
		'paging':      false,
		'ordering':    true,
		'order':       Search.orderBy[Search.currentTab],
		'ajax':        'json.php?filter=' + Search.currentTab + Search.additionalFile,
		'deferRender': true,
		'processing':  false,
        'serverSide':  true,
		'columns':     [
            {
				data:      'host',
				className: 'host',
				render: function ( data, type, full, meta ) {
					return '<a data-host="'+ data.host +'" href="'+ data.url +'" target="_blank">'+ data.name +'</a><span class="hide-more"><br /><span class="more-info-icon"></span><span class="more-comment-icon"></span></span>';
				},
			},
            {
				data:      'service',
				className: 'service',
				render: {
					_:     'name',
					display: function ( data, type, full, meta ) {
						var unAck = (data.unAck)           ? '<li><span class="list-unack-icon icons unAck" alt="Unacknowledge this Service" title="Unacknowledge this Service"></span></li>' : '',
							down  = (data.down)            ? '<li><span class="list-downtime-icon"></span></li>' : '',
							notes = (data.notes)           ? '<li><a href="'+ data.notes +'" target="_blank" class="list-notes-icon"></a></li>' : '',
							pAuth = (data.pAuth)           ? '<img class="icons" src="http://www.gravatar.com/avatar/'+ data.pAuth +'?size=19" />' : '';
							qAck  = (data.qAck && !pAuth)  ? '<span class="list-qack-icon icons quickAck" alt="Quick Acknowledge" title="Quick Acknowledge"></span></li>' : '',
							qUAck = (data.qUAck && !pAuth) ? '<img class="icons quickUnAck" src="http://www.gravatar.com/avatar/'+ data.qUAck +'?size=19" alt="'+ data.qAuth +' unack" title="'+ data.qAuth +' unack" />' : '',
							ack   = (!data.info) ? '<li><span class="list-ack-icon icons acknowledgeIt" alt="Acknowledge this Service" title="Acknowledge this Service"></span></li>' : '',
							sched = (!data.info) ? '<li><span class="list-sched-icon icons scheduleIt" data-id="'+ data.downId +'" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></span></li>' : '';
							
						return '' +
							'<div class="likeTable">' +
							'	<ul>' +
							'		<li><a href="'+ data.url +'" class="service-name">'+ data.name +'</a></li>' +
									notes  +
							'		<li>'  +
										qAck  +
										qUAck +
										pAuth +
							'		</li>' +
									ack +
									sched +
							'		<li><span class="list-recheck-icon icons recheckIt" alt="Refresh Service Status" title="Refresh Service Status"></span></li>' +
							'	</ul>' +
							'</div>';
					},
				},
			},
			
			{
				data:      'status',
				className: 'status',
				render: {
					_:     'name',
					sort:  'order',
					type:  'num',
					display: function ( data, type, full, meta ) {
						return data.name;
					},
				},
			},
			{
				data: {
					_:     'last.name',
					sort:  'last.order',
					type:  'string',
				},
				className: 'last_check',
			},
			{
				data: {
					_:     'duration.name',
					sort:  'duration.order',
					type:  'string',
				},
				className: 'duration',
			},
			{
				data:      'info',
				className: 'status_information main',
			},
			{
				data:      'comment',
				className: 'comment',
				render: function ( data, type, full, meta ) {
					return '<span class="ack">'+ data.ack +'" </span><span class="sched">'+ data.sched +'</span>';
				},
			},
			{
				data:      'type',
				visible:   false
			},
			{
				className: 'more',
				render: function () {
					return '<button class="button-more">></button>';
				},
			}
        ],
		'createdRow': function(row, data, index) {
			if (data.state) {
				$(row).find('.service, .status, .last_check, .duration, .status_information, .comment, .more').addClass(data.state);
            }
			if (!data.service.info && data.service.sched) {
				$(row).find('.host, .service, .status, .last_check, .duration, .status_information, .comment, .more').addClass('grey-text');
			}
			if (data.service.info && (data.state == 'WARNING' || data.state == 'UNKNOWN')) {
				$(row).find('.host, .service, .status, .last_check, .duration, .status_information, .comment, .more').addClass('blue-text');
			}
			if (data.service.info && data.state == 'CRITICAL') {
				$(row).find('.host, .service, .status, .last_check, .duration, .status_information, .comment, .more').addClass('brown-text');
			}
        },
		"drawCallback": function( settings ) {
			Search.filterDataTable($('#mainTable_filter input').val());
			Search.countRecords();
		},
		'initComplete': function(settings, json) {
			$('#loading').hide();
			$('#infoHolder').show();
			
			if (Search.firstLoad) {
				$('#nagiosConfigFile').text(json.additional.nagiosConfigFile);
				$('#nagiosFullListUrl').text(json.additional.nagiosFullListUrl);
				$('#updateHash').text(json.additional.updateHash);
				$('#groupByService').text(json.additional.groupByService);
				$('#groupByHost').text(json.additional.groupByHost);
				$('#refreshArray').text(json.additional.refreshArray);
				
				var refreshData = $('#refreshArray').text().split(';');
				var refreshList = '';
					refreshList += '<option value="auto">Refresh: Auto</option>';
					refreshList += '<optgroup label="---">';
					
					$(refreshData).each(function () {
						var refreshValue = this.split(',');
						refreshList += '<option value="'+ refreshValue[0] +'">Refresh: '+ refreshValue[1] +'</option>';
					});
					
					refreshList += '<option value="custom">Refresh: Custom</option>';
					refreshList += '</optgroup>';
					refreshList += '<optgroup label="----">';
					refreshList += '<option value="10000000">Refresh: Disable</option>';
					refreshList += '</optgroup>';
					
				$('#refreshTimeSelect').html(refreshList);
				
				Search.doneTypingInterval = (Search.allDataTable.rows().count() > 1000) ? 350 : 0;
				Search.firstLoad          = false;
				whatWeChangeObject        = null;
				whatWeChangeDataObject    = null;
				Search.currentUser        = $('#userName').text();
				Search.updateHash         = $('#updateHash').text();
				Search.avatarUrl          = $('#userAvatar').text();
				Search.groupByService     = $('#groupByService').text();
				Search.groupByHost        = $('#groupByHost').text();
				
				$('#' + Search.currentTab).attr('checked', 'checked');
				$('#radio').buttonset();
				Search.addDialog();
				
				refreshValues = [];
				$('#refreshTime select option').each(function () { refreshValues.push($(this).val()); });
				
				if ($.inArray(Search.currentReload, refreshValues) !== -1) {
					$('#refreshTime select option[value="'+ Search.currentReload +'"]').attr('selected', 'selected');
				} else {
					$('#refreshTime select option[value="custom"]').text(Search.reloadCustomText + ' ('+ parseInt(Search.currentReload) / 60 +'min)').attr('selected', 'selected');
				}

				$('#refreshTimeSelect').selectmenu({
					select: function (event, data) {
						Search.stopReloads();
						
						if (data.item.value == 'custom') {
							var reload = prompt('Enter page reload time (minutes):', ''),
								newVal = (parseInt(reload) > 0) ? parseInt(reload)*60 : 'auto',
								custom = (newVal == 'auto') ? Search.reloadCustomText : (Search.reloadCustomText + ' ('+ parseInt(reload) +'min)');
							
							localStorage.setItem('currentReloadNew', newVal);
							$('#refreshTime select option[value="custom"]').text(custom);
						} else {
							localStorage.setItem('currentReloadNew', data.item.value);
							$('#refreshTime select option[value="custom"]').text(Search.reloadCustomText);
						}
						
						Search.currentReload = localStorage.getItem('currentReloadNew');
						
						if ($.inArray(Search.currentReload, refreshValues) !== -1) {
							$('#refreshTime select option[value="'+ Search.currentReload +'"]').attr('selected', 'selected');
						} else {
							$('#refreshTime select option[value="custom"]').attr('selected', 'selected');
						}
						
						$('#refreshTimeSelect').selectmenu('refresh');
						Search.startReloads();
					}
				});
				
				Search.startReloads();
			}
			
			Search.filterDataTable(); 
		}
	});
	

function getGroupNormalCount(columnData, limit) {
	var counts       = [],
		returnCounts = [];
	
	$.each(columnData, function(i, val) {
		counts[columnData[i]] = 1 + (counts[columnData[i]] || 0);
	});
	
	$.each(columnData, function(i, val) {
		if (counts[columnData[i]] >= limit) {
			returnCounts[columnData[i]] = counts[columnData[i]];
		}
	});
	
	return returnCounts;
}
function getGroupNormalHeaders(rows, countsService, countsHost) {
	var returnData    = [],
		returnOrdered = {},
		returnArray   = [];
	
	if ($(rows).length > 0) {
		$(rows).each(function() {
			var rowData     = $(this)[0],
				serviceName = rowData.service.name,
				hostName    = rowData.host.name;
					
			if (countsService[serviceName] || countsHost[hostName]) {
				var type           = (countsService[serviceName]) ? 'service' : 'host',
					count          = (countsService[serviceName]) ? countsService[serviceName] : countsHost[hostName],
					statusOrder    = rowData.status.order,
					status         = rowData.status.name,
					lastCheckOrder = rowData.last.order,
					lastCheck      = rowData.last.name,
					durationOrder  = rowData.duration.order,
					duration       = rowData.duration.name,
					information    = rowData.info,
					comment        = (Search.currentTab == 'acked') ? rowData.comment.ack : ((Search.currentTab == 'sched') ? rowData.comment.sched : ''),
					groupBy        = (countsService[serviceName]) ? serviceName.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase() : hostName.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase();
	
				returnData.push({
					'type':           type,
					'service':        serviceName,
					'host':           hostName,
					'count':          count,
					'status':         status,
					'statusOrder':    statusOrder,
					'lastCheck':      lastCheck,
					'lastCheckOrder': lastCheckOrder,
					'duration':       duration,
					'durationOrder':  durationOrder,
					'information':    information,
					'comment':        comment,
					'groupBy':        groupBy,
					'isHost':         rowData.host.host,
				});
			}
		});
	
		var firstCount = 0;
		$(returnData).each(function() {
			var rowData = $(this)[0];
			
			if (!returnOrdered[rowData.groupBy]) {
				returnOrdered[rowData.groupBy] = rowData;
			}
			
			if (returnOrdered[rowData.groupBy].statusOrder < rowData.statusOrder) {
				returnOrdered[rowData.groupBy].statusOrder = rowData.statusOrder;
				returnOrdered[rowData.groupBy].status      = rowData.status;
			}
	
			if (returnOrdered[rowData.groupBy].durationOrder < rowData.durationOrder) {
				returnOrdered[rowData.groupBy].durationOrder = rowData.durationOrder;
				returnOrdered[rowData.groupBy].duration      = rowData.duration;
			}
			
			if (returnOrdered[rowData.groupBy].lastCheckOrder > rowData.lastCheckOrder) {
				returnOrdered[rowData.groupBy].lastCheckOrder = rowData.lastCheckOrder;
				returnOrdered[rowData.groupBy].lastCheck      = rowData.lastCheck;
			}
			
			if (!firstCount) {
				returnOrdered[rowData.groupBy].information = rowData.information;
				returnOrdered[rowData.groupBy].comment     = rowData.comment;
			}
			
			if (firstCount && returnOrdered[rowData.groupBy].information != rowData.information) {
				returnOrdered[rowData.groupBy].information = '';
			}
			
			if (firstCount && returnOrdered[rowData.groupBy].comment != rowData.comment) {
				returnOrdered[rowData.groupBy].comment = '';
			}
			
			firstCount++;
		});
		
		$.each(returnOrdered, function(){
			returnArray.push($(this)[0]);
		});
		
		returnArray.sort(function(a,b) {
			if (parseInt(a.count) < parseInt(b.count)) {
				return 1;
			} else if (parseInt(a.count) > parseInt(b.count)) {
			   return -1;
			} else if (parseInt(a.statusOrder) < parseInt(b.statusOrder)) {
				return 1;
			} else if (parseInt(a.statusOrder) > parseInt(b.statusOrder)) {
				return -1;
			} else if (parseInt(a.durationOrder) < parseInt(b.durationOrder)) {
				return 1;
			} else if (parseInt(a.durationOrder) > parseInt(b.durationOrder)) {
				return -1;
			} else {
				return 0;
			}
		});

	}
	
	return returnArray;
}
function getGroupNormalThead(rowsHeader) {
	Search.allHeaderRows = {};
	
	$(rowsHeader).each(function() {
		var rowData        = $(this)[0],
			trClass        = rowData.status,
			groupNameSmall = rowData.groupBy,
			hostValue      = (rowData.type != 'service') ? rowData.host : rowData.count,
			serviceValue   = (rowData.type == 'service') ? rowData.service : rowData.count,
			css            = ' style="text-align: center; font-size: 12px; font-weight: bold;"',
			contains       = (rowData.type == 'service') ? rowData.service : rowData.host,
			liClass        = (Search.currentTab == 'acked') ? 'unAckIcon' : 'quickAckUnAckIcon',
			liImgClass     = (Search.currentTab == 'acked') ? 'unAckGroup' : 'quickAckGroup',
			liImgSrc       = (Search.currentTab == 'acked') ? 'list-unack-icon' : 'list-qack-icon',
			liImgTitle     = (Search.currentTab == 'acked') ? 'Unacknowledge All Services' : 'Quick Acknowledge',
			subRows        = $('#mainTable tbody tr:contains("'+ contains +'")').length,
			subRowsGrey    = $('#mainTable tbody tr:contains("'+ contains +'") .host.grey-text').length,
			mainGreyClass  = (subRowsGrey == subRows) ? ' grey-text' : '',
			avatar         = (mainGreyClass) ? $('#mainTable tbody tr:contains("'+ contains +'") .service.grey-text img:first-child').first().attr('src') : '',
			subRowsBlue    = $('#mainTable tbody tr:contains("'+ contains +'") .host.blue-text').length,
			subRowsBrown   = $('#mainTable tbody tr:contains("'+ contains +'") .host.brown-text').length,
			subRowsInfo    = ((subRowsBlue + subRowsBrown) == subRows) ? true : false;
			subRowsClass   = (subRowsInfo) ? ((subRowsBrown) ? ' brown-text' : ' blue-text') : '';
			ackIconBlock   = (subRowsClass) ? '' : '<li><span class="icons acknowledgeItGroup list-ack-icon" alt="Acknowledge this Service" title="Acknowledge this Service"></span></li>',
			schedIconBlock = (subRowsClass) ? '' : '<li><span class="icons scheduleItGroup list-sched-icon" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></span></li>';
			
			if (avatar) {
				var quickAck = '<li><img class="icons" src="'+ avatar +'"></li>';
			} else {
				var quickAck = '<li class="'+ liClass +'"><span class="icons '+ liImgClass +' '+ liImgSrc +'" alt="'+ liImgTitle +'" title="'+ liImgTitle +'"></span></li>';
			}
		
		$('#mainTable thead').append(
			'<tr class="group-list group-list-bottom" data-group="' + groupNameSmall + '">' +
			'	<td class="host'+ mainGreyClass + subRowsClass +'"'+ css +'><span data-host="'+ rowData.isHost +'">' + hostValue + '</span><span class="hide-more"><br /><span class="more-info-icon"></span><span class="more-comment-icon"></span></span></td>' +
			'	<td class="service '+ trClass + mainGreyClass + subRowsClass +'"'+ css +'>' +
			'		<div class="likeTable">' +
			'			<ul>' +
			'				<li>' + serviceValue + '</li>' + quickAck +
							ackIconBlock +
							schedIconBlock +
			'				<li><span class="icons recheckItGroup list-recheck-icon" alt="Refresh Service Status" title="Refresh Service Status"></span></li>' +
			'			</ul>' +
			'		</div>' +
			'	</td>' +
			'	<td class="status '+ trClass + mainGreyClass + subRowsClass +'">'+ rowData.status +'</td>' +
			'	<td class="last_check '+ trClass + mainGreyClass + subRowsClass +'">'+ rowData.lastCheck +'</td>' +
			'	<td class="duration-sec" style="display: none;"></td>' +
			'	<td class="duration '+ trClass + mainGreyClass + subRowsClass +'">'+ rowData.duration +'</td>' +
			'	<td class="status_information '+ trClass + mainGreyClass + subRowsClass +'">'+ rowData.information +'</td>' +
			'	<td class="comment '+ trClass + mainGreyClass + subRowsClass +'">'+ rowData.comment +'</td>' +
			'	<td class="more '+ trClass + mainGreyClass + subRowsClass +'"><button class="button-more">></button></td>' +
			'</tr>'
		);
		
		var prevHost = '',
			allRows  = [];
		
		$('#mainTable tbody tr:contains("'+ contains +'")').each(function() {
			var row        = $(this).clone(),
				verifyName = (rowData.type == 'service') ? 'td.service li:first a' : 'td.host a:first',
				verify     = row.find(verifyName).text();
			
			if (verify == contains) {
                var	host = row.find('td.host').text();
			
				row.attr('data-group', groupNameSmall);
				row.find('td.host').css('visibility', (host == prevHost) ? 'hidden' : 'visible');
				
				if (Search.currentTab == 'normal') {
					row.find('td.comment').hide();
				}
				
				if (Search.currentTab == 'acked') {
					row.find('td.comment .sched').hide();
				}
				
				if (Search.currentTab == 'sched') {
					row.find('td.comment .ack').hide();
				}
				
				prevHost = host;
				allRows.push(row);
				
				$(this).find('td.host').addClass('toRemove');
            }
		});
		
		Search.allHeaderRows[Search.currentTab + '_' + groupNameSmall + '_rows'] = allRows;
		
		$('#mainTable thead').append('' +
			'<tr data-group="'+ groupNameSmall +'">' +
			'	<td class="host no-border-th">&nbsp;</td>' +
			'	<td class="service no-border-th">&nbsp;</td>' +
			'	<td class="status no-border-th">&nbsp;</td>' +
			'	<td class="last_check no-border-th">&nbsp;</td>' +
			'	<td class="duration no-border-th">&nbsp;</td>' +
			'	<td class="status_information no-border-th">&nbsp;</td>' +
			'	<td class="comment no-border-th">&nbsp;</td>' +
			'	<td class="more no-border-th">&nbsp;</td>' +
			'</tr>'
		); 
	});
	
	$('#mainTable tbody .toRemove').closest('tr').remove();
	$('#mainTable thead tr[data-group]:not(.group-list)').hide();
	$('#mainTable thead tr.group-list').removeClass('open');
	
	$('#mainTable thead tr[data-group].group-list').each(function() {
		var attr = $(this).attr('data-group');
		
		if (localStorage.getItem(Search.currentTab + '_' + attr)) {
			for (var i = 0; i < Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length; i++) {
				$(Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i]).insertBefore('#mainTable thead tr[data-group="'+ attr +'"]:last');
			}
			
			$('#mainTable thead tr[data-group="'+ attr +'"]:not(.group-list):last').addClass('group-list-bottom').show();
			
			$(this).addClass('open');
		}
	});
	
	quickAckUnAckGroup();
}
function getGroupNormalServices (rows) {
	var columnData = [];
	
	$(rows).each(function() {
		columnData.push($(this)[0].service.name);
	});
	
	return columnData;
}
function getGroupNormalHosts (rows) {
	var columnData = [];
	
	$(rows).each(function() {
		columnData.push($(this)[0].host.name);
	});
	
	return columnData;
}
function quickAckUnAckGroup() {
	$('#mainTable thead tr.group-list[data-group]').each(function() {
		var dataGroup = $(this).attr('data-group'),
			selected  = Search.allHeaderRows[Search.currentTab + '_' + dataGroup + '_rows'],
			unAckIcons  = [];
			
		for (var i = 0; i < selected.length; i++) {
			var item = selected[i].find('.quickUnAck');
			
			if (item.length) {
                unAckIcons.push(item.clone());
            }
		}
		
		if (selected.length == unAckIcons.length) {
            $('#mainTable thead tr.group-list[data-group="'+ dataGroup +'"] .quickAckUnAckIcon')
				.html(unAckIcons[0])
				.find('.icons')
				.attr('alt', 'Quick UnAcknowledge All')
				.attr('title', 'Quick UnAcknowledge All')
				.removeClass('quickUnAck')
				.addClass('quickUnAckGroup');
        } else {
			$('#mainTable thead tr.group-list[data-group="'+ dataGroup +'"] .quickAckUnAckIcon')
				.html('<span class="icons quickAckGroup list-qack-icon" alt="Quick Acknowledge" title="Quick Acknowledge"></span>');
		}
		
		$('#mainTable thead tr .quickAckUnAckIcon').show();
		
		if (Search.currentTab != 'normal') {
            $('#mainTable thead tr .quickAckUnAckIcon').hide();
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
Search.reorderData = function() {
	$('#mainTable thead tr').not(':first').remove();
	$('#mainTable tbody tr').show();
	
	var tabsArray = ['normal', 'acked', 'sched'];
	if (tabsArray.indexOf(Search.currentTab) !== -1) {		
		var rows          = Search.allDataTable.rows({ page:'current', search:'applied' }).data(),
			rowsService   = getGroupNormalServices(rows),
			rowsHost      = getGroupNormalHosts(rows),
			countsService = getGroupNormalCount(rowsService, Search.groupByService),
			countsHost    = getGroupNormalCount(rowsHost, Search.groupByHost),
			rowsHeader    = getGroupNormalHeaders(rows, countsService, countsHost);

		getGroupNormalThead(rowsHeader);
	}
}


Search.stopReloads = function(stop) {
	$.stopPendingAjax.abortAll(stop);
	clearTimeout(reloadTimer);
	Search.backgroundReload = false;
	Search.autoRefresh      = false;
}
Search.startReloads = function() {
	if (localStorage.getItem('canceledReloads') == '0') {
        if (Search.currentReload == 'auto') {
			reloadTimer             = setTimeout(function () { Search.getContent(); }, 0);
			Search.backgroundReload = true;
		} else {
			reloadTimer        = setTimeout(function () { Search.autoReloadData(); }, Search.currentReload*1000);
			Search.autoRefresh = true;
		}
    }
}
Search.getContent = function() {
	if (Search.backgroundReload) {
		$.ajax({
			type:    'GET',
			url:     'update.php',
			data:    {'hash' : Search.updateHash},
			success: function(data){
				Search.resetAgo();
				Search.stopReloads();
				Search.updateHash = data;
				Search.allDataTable.ajax.reload();
				Search.startReloads();
			},
			error: function() {
				if (!Search.updateHash) {
					location.reload();
				} else {
					Search.startReloads();
				}
			},
		});
	}
}
Search.autoReloadData = function() {
	if (Search.autoRefresh) {
		Search.resetAgo();
		Search.stopReloads();
		Search.allDataTable.ajax.reload();
		Search.startReloads();
	}
}


Search.filterDataTable = function(val, startReload) {
	if (!Search.allDataTable.ajax.json()) {
        return;
    }

	var value = (val) ? val : '';
	
	Search.tableLength = Search.allDataTable.rows({ page:'current', search:'applied' }).count();
	Search.ajaxData    = Search.allDataTable.ajax.json().additional;

	if (Search.currentGroup != 0) {
		Search.reorderData(value);
		quickAckUnAckGroup();
	} else {
		$('#mainTable thead tr').not(':first').remove();
		$('#mainTable tbody tr').show();
	}

	Search.extension();
	Search.emptyHosts();
	
	if ($(window).width() > 560) {
		$('.comment').toggle(Search.currentTab == 'acked' || Search.currentTab == 'sched');
		$('.comment span.ack').toggle(Search.currentTab == 'acked');
		$('.comment span.sched').toggle(Search.currentTab == 'sched');
	} else {
		$('.comment').hide();
	}
	
	Search.recheckIcons();
	Search.drawTinycon();
	
	if (startReload) {
		Search.startReloads();
	}
}
Search.recheckIcons = function() {
	$('.icons.quickAck, .icons.quickUnAck').closest('li').toggle(Search.currentTab != 'acked' && Search.currentTab != 'sched');
	$('.quickAckUnAckIcon').closest('li').toggle(Search.currentTab != 'acked' && Search.currentTab != 'sched');
	$('.status .downtime_id').toggle(Search.currentTab == 'sched');
	$('.service .list-downtime-icon').closest('li').toggle(Search.currentTab != 'sched');
	$('.service .list-unack-icon').closest('li').toggle(Search.currentTab != 'acked');
	
	if (Search.currentTab == 'acked') {
		$('.service .acknowledgeIt').attr('title', 'Unacknowledge this Service').attr('alt', 'Unacknowledge this Service').removeClass('acknowledgeIt').addClass('unAcknowledgeIt');
		$('.service .acknowledgeItGroup').attr('title', 'Unacknowledge this Services Group').attr('alt', 'Unacknowledge this Services Group').removeClass('acknowledgeItGroup').addClass('unAcknowledgeItGroup');
		$('#acknowledgeIt_button').attr('title', 'Unacknowledge All Services').attr('alt', 'Uncknowledge All Services').attr('id', 'unAcknowledgeIt_button');
	} else {
		$('.service .unAcknowledgeIt').attr('title', 'Acknowledge this Service').attr('alt', 'Acknowledge this Service').removeClass('unAcknowledgeIt').addClass('acknowledgeIt');
		$('.service .unAcknowledgeItGroup').attr('title', 'Acknowledge this Services Group').attr('alt', 'Acknowledge this Services Group').removeClass('unAcknowledgeItGroup').addClass('acknowledgeItGroup');
		$('#unAcknowledgeIt_button').attr('title', 'Acknowledge All Services').attr('alt', 'Acknowledge All Services').attr('id', 'acknowledgeIt_button');
	}
	
	if (Search.currentTab == 'sched') {
		$('.service .scheduleIt').attr('title', 'Unschedule Downtime for this Service').attr('alt', 'Unschedule Downtime for this Service').removeClass('scheduleIt').addClass('unScheduleIt');
		$('.service .scheduleItGroup').attr('title', 'Unschedule Downtime for this Group').attr('alt', 'Unschedule Downtime for this Group').removeClass('scheduleItGroup').addClass('unScheduleItGroup');
		$('#scheduleIt_button').attr('title', 'Unschedule Downtime for All Services').attr('alt', 'Unschedule Downtime for All Services').attr('id', 'unScheduleIt_button');
	} else {
		$('.service .unScheduleIt').attr('title', 'Schedule Downtime for this Service').attr('alt', 'Schedule Downtime for this Service').removeClass('unScheduleIt').addClass('scheduleIt');
		$('.service .unScheduleItGroup').attr('title', 'Schedule Downtime for this Group').attr('alt', 'Sechedule Downtime for this Group').removeClass('unScheduleItGroup').addClass('scheduleItGroup');
		$('#unScheduleIt_button').attr('title', 'Schedule Downtime for All Services').attr('alt', 'Schedule Downtime for All Services').attr('id', 'scheduleIt_button');
	}
	
	if (Search.currentTab == 'EMERGENCY') {
		$('#mainTable tbody tr').each(function() {
			var d = Search.allDataTable.row(this).data();
			
			if (d && d.type.search('__acked__') > -1) {
                $(this).find('.service .acknowledgeIt').attr('title', 'Unacknowledge this Service').attr('alt', 'Unacknowledge this Service').removeClass('acknowledgeIt').addClass('unAcknowledgeIt');
            }
		});
	}
}
Search.emptyHosts = function () {
    var prevHost = '';
        
	$('tbody td.host:visible').each(function() {
		$(this).css('visibility', ($(this).find('a').text() == prevHost) ? 'hidden' : 'visible');
			
        prevHost = $(this).find('a').text();
    });
}
Search.extension = function () {
	if ($(document).find('#mainTable_filter input').val() && Search.tableLength && !$('#ext_search').length) {
		$('#mainTable_filter').after('<div id="ext_search"></div>');
		$('#ext_search').append('<span id="'+ Search.quickAckButtonId +'" class="list-qack-icon" alt="Quick Acknowledge All" title="Quick Acknowledge All"></span>');
		$('#ext_search').append('<img id="'+ Search.quickUnAckButtonId +'" src="http://www.gravatar.com/avatar/'+ Search.avatarUrl +'?size=19" alt="Quick UnAcknowledge All" title="Quick Unacknowledge All">');
		$('#ext_search').append('<span id="'+ Search.ackButtonId +'" class="list-ack-icon" alt="Acknowledge All Services" title="Acknowledge All Services"></span>');
		$('#ext_search').append('<span id="'+ Search.sdButtonId +'" class="list-sched-icon" alt="Schedule Downtime for All Services" title="Schedule Downtime for All Services"></span>');
		$('#ext_search').append('<span id="'+ Search.recheckButtonId +'" class="list-recheck-icon" alt="Refresh Services Status" title="Refresh Services Status"></span>');
	}
	Search.extensionVisibility();
}
Search.extensionVisibility = function () {
	if ($(document).find('#mainTable_filter input').val() && Search.tableLength) {
		$(Search.filterButtons).show();
		
		var subRowsBlue    = $('#mainTable tbody tr .host.blue-text').length,
			subRowsBrown   = $('#mainTable tbody tr .host.brown-text').length;
			
		(Search.currentTab != 'acked' && Search.currentTab != 'sched' && $('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck:not([src*="'+ Search.avatarUrl +'"])').length) ? $('#'+ Search.quickAckButtonId).show() : $('#'+ Search.quickAckButtonId).hide();
		(Search.currentTab != 'acked' && Search.currentTab != 'sched' && $('#mainTable tbody .icons.quickUnAck').length) ? $('#'+ Search.quickUnAckButtonId).show() : $('#'+ Search.quickUnAckButtonId).hide();
		if ((subRowsBlue + subRowsBrown) == Search.tableLength) {
            $('#' + Search.ackButtonId).hide();
			$('#' + Search.sdButtonId).hide();
        } else {
			$('#' + Search.ackButtonId).show();
			$('#' + Search.sdButtonId).show();
		}
	}
	else {
		$(Search.filterButtons).hide();
	}
}
Search.addDialog = function() {
	var dialog = '';
	dialog += '<div id="dialog" title="Schedule Downtime">'
	dialog += '  <p class="validateTips">All form fields are required.</p>';
	dialog += '  <form name="scheduleDowntime">';
	dialog += '    <fieldset>';
	dialog += '      <table><tr><td>';
	dialog += '        <label for="sched_interval_extension">Interval, hours</label>';
	dialog += '      </td><td style="text-align: right;">';
	dialog += '        <input type="text" name="sched_interval_extension" id="sched_interval_extension" class="text ui-widget-content">';
	dialog += '      </td></tr><tr><td>';
	dialog += '        <label for="sched_comment_extension">Comment</label>';
	dialog += '      </td><td>';
	dialog += '        <div class="select-comment"><span>Select</span><select name="comment_select"></select></div>';
	dialog += '        <div class="write-comment"><span>Write</span><input type="text" name="sched_comment_extension" id="sched_comment_extension" class="text ui-widget-content"></div>';
	dialog += '      </td></tr><tr><td>';
	dialog += '        <label for="sched_finish_date_time">Finish date/time</label>';
	dialog += '      </td><td style="text-align: right;">';
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
	dialog += '        <label for="ack_comment_extension">Comment</label>';
	dialog += '      </td><td>';
	dialog += '        <div class="select-comment"><span>Select</span><select name="comment_select"></select></div>';
	dialog += '        <div class="write-comment"><span>Write</span><input type="text" name="ack_comment_extension" id="ack_comment_extension" class="text ui-widget-content"></div>';
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
		modal:    true,
		width:    400,
		position: { my: "center center", at: "center top+200"},
		open:     function() { Search.getServerLocalTimeDialog(); $('body').css("overflow", "hidden"); $('#dialog .select-comment').hide(); },
		close:    function() { Search.tempShowButtons(); $('body').css("overflow", "auto"); },
		create:   function() {
			$(this).closest('.ui-dialog').on('keydown', function(ev) {
			    if (ev.keyCode === $.ui.keyCode.ESCAPE) {
					if ($('.xdsoft_datetimepicker').is(':visible')) {
						$('#sched_finish_date_time').datetimepicker('hide');
					}
					else {
						$('#dialog').dialog('close');
					}
			    }
			});
		},
		closeOnEscape: false,				
		buttons: [
			{
				text:  'Schedule Downtime',
				id:    'scheduleDowntimeButton',
				click: function() { Search.SheduleServices() },
			},
			{
				text:  'Cancel',							
				click: function() { $('#dialog').dialog('close'); },
			}
		]
	});
	
	$('#dialogAck').dialog({
		autoOpen: false,
		modal:    true,
		width:    400,
		position: { my: "center center", at: "center top+200"},
		close:    function() { Search.tempShowButtons(); $('body').css("overflow", "auto"); },
		open:	  function() { $('body').css("overflow", "hidden"); $('#ack_comment_extension').focus(); $('#dialogAck .select-comment').hide(); },
		closeOnEscape: true,
		buttons: [
			{
				text:  'Acknowledge',
				id:    'acknowledgeDialogButton',
				click: function() { Search.AcknowledgeServices() },
			},
			{
				text:  'Cancel',							
				click: function() { $('#dialogAck').dialog('close'); },
			}
		]
	});
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


Search.tmpHideIcon = function(item, type) {
	item.find('.icons.'+ type).hide();
}
Search.tmpShowIcon = function(item, type) {
	item.find('.icons.'+ type).show();
}
Search.tmpHideIconArray = function(attr, type, i) {
	Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i].find('.icons.'+ type).hide();
}
Search.tempHideButtons = function () {
	Search.stopReloads(true);
	
	if (whatWeChangeObject.what == 'group') {
		var attr        = (whatWeChangeObject.service) ? whatWeChangeObject.service.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase() : whatWeChangeObject.host.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase(),
			returnArray = [],
			infoCheck   = (whatWeChangeObject.type == 'acknowledgeIt' || whatWeChangeObject.type == 'scheduleIt') ? true : false,
			item        = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'];
		
		for (var i = 0; i < item.length; i++) {
			var checkInfo = (infoCheck) ? ((item[i].find('td.host').hasClass('blue-text') || item[i].find('td.host').hasClass('brown-text')) ? false : true) : true;
			
			if (checkInfo) {
				var host        = Search.getHost(item[i]),
					service     = Search.getService(item[i]),
					check       = Search.getLastCheck(item[i]),
					isHost      = item[i].find('.host a').attr('data-host'),
					infoService = (item[i].find('td.host').hasClass('blue-text') || item[i].find('td.host').hasClass('brown-text')) ? '_' : '';
					
				if (whatWeChangeObject.host) {
					if (host == whatWeChangeObject.host) {
						Search.tmpHideIconArray(attr, whatWeChangeObject.type, i);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				} else if (whatWeChangeObject.service) {
					if (service == whatWeChangeObject.service) {
						Search.tmpHideIconArray(attr, whatWeChangeObject.type, i);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				}
			}
		}
		
		$('#mainTable thead tr[data-group="'+ attr +'"]:not(:last)').each(function() {
			var row     = $(this),
				host    = Search.getHost(row),
				service = Search.getService(row);
			
			if (whatWeChangeObject.host) {
				if (host == whatWeChangeObject.host) {
					Search.tmpHideIcon(row, whatWeChangeObject.type +'Group');
				}
			} else if (whatWeChangeObject.service) {
				if (service == whatWeChangeObject.service) {
					Search.tmpHideIcon(row, whatWeChangeObject.type +'Group');
				}
			}
		});
    }
	else if (whatWeChangeObject.what == 'all') {
		var returnArray = [],
			infoCheck   = (whatWeChangeObject.type == 'acknowledgeIt' || whatWeChangeObject.type == 'scheduleIt') ? true : false;
			
		$('#mainTable tbody tr').each(function() {
			var checkInfo = (infoCheck) ? (($(this).find('td.host').hasClass('blue-text') || $(this).find('td.host').hasClass('brown-text')) ? false : true) : true;
			if (checkInfo) {
				var row         = $(this),
					host        = Search.getHost(row),
					service     = Search.getService(row),
					check       = Search.getLastCheck(row),
					isHost      = row.find('.host a').attr('data-host'),
					infoService = (row.find('td.host').hasClass('blue-text') || row.find('td.host').hasClass('brown-text')) ? '_' : '';
					
				if (whatWeChangeObject.host && whatWeChangeObject.service) {
					if (host == whatWeChangeObject.host && service == whatWeChangeObject.service) {
						Search.tmpHideIcon(row, whatWeChangeObject.type);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				} else if (whatWeChangeObject.host) {
					if (host == whatWeChangeObject.host) {
						Search.tmpHideIcon(row, whatWeChangeObject.type);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				} else if (whatWeChangeObject.service) {
					if (service == whatWeChangeObject.service) {
						Search.tmpHideIcon(row, whatWeChangeObject.type);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				} else {
					Search.tmpHideIcon(row, whatWeChangeObject.type);
					returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
				}
			}
		});
		
		var groupNames = [];
		
		$('#mainTable thead tr').each(function() {
			var attr = $(this).attr('data-group');
				
			if (attr && groupNames.indexOf(attr) === -1) {
				groupNames.push(attr);
			}
		});
		
		for (var a = 0; a < groupNames.length; a++) {
            if (Search.allHeaderRows[Search.currentTab + '_' + groupNames[a] + '_rows'].length) {
				var headerRows = Search.allHeaderRows[Search.currentTab + '_' + groupNames[a] + '_rows'];
					
				for (var i = 0; i < headerRows.length; i++) {
					var checkInfo = (infoCheck) ? (($(this).find('td.host').hasClass('blue-text') || $(this).find('td.host').hasClass('brown-text')) ? false : true) : true;
					
					if (checkInfo) {
						var row         = headerRows[i],
							host        = Search.getHost(row),
							service     = Search.getService(row),
							check       = Search.getLastCheck(row),
							isHost      = row.find('.host a').attr('data-host'),
							infoService = (row.find('td.host').hasClass('blue-text') || row.find('td.host').hasClass('brown-text')) ? '_' : '';
							
						if (whatWeChangeObject.host && whatWeChangeObject.service) {
							if (host == whatWeChangeObject.host && service == whatWeChangeObject.service) {
								Search.tmpHideIcon(row, whatWeChangeObject.type);
								returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
							}
						} else if (whatWeChangeObject.host) {
							if (host == whatWeChangeObject.host) {
								Search.tmpHideIcon(row, whatWeChangeObject.type);
								returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
							}
						} else if (whatWeChangeObject.service) {
							if (service == whatWeChangeObject.service) {
								Search.tmpHideIcon(row, whatWeChangeObject.type);
								returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
							}
						} else {
							Search.tmpHideIcon(row, whatWeChangeObject.type);
							returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
						}
					}
				}
			}
        }
	}
	else {
		var returnArray = [],
			infoCheck   = (whatWeChangeObject.type == 'acknowledgeIt' || whatWeChangeObject.type == 'scheduleIt') ? true : false;
			
		$('#mainTable tr').each(function() {
			var checkInfo = (infoCheck) ? (($(this).find('td.host').hasClass('blue-text') || $(this).find('td.host').hasClass('brown-text')) ? false : true) : true;
			if (checkInfo) {
				var row         = $(this),
					host        = Search.getHost(row),
					service     = Search.getService(row),
					check       = Search.getLastCheck(row),
					isHost      = row.find('.host a').attr('data-host'),
					infoService = (row.find('td.host').hasClass('blue-text') || row.find('td.host').hasClass('brown-text')) ? '_' : '';
	
				if (whatWeChangeObject.host && whatWeChangeObject.service) {
					if (host == whatWeChangeObject.host && service == whatWeChangeObject.service) {
						Search.tmpHideIcon(row, whatWeChangeObject.type);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				} else if (whatWeChangeObject.host) {
					if (host == whatWeChangeObject.host) {
						Search.tmpHideIcon(row, whatWeChangeObject.type);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				} else if (whatWeChangeObject.service) {
					if (service == whatWeChangeObject.service) {
						Search.tmpHideIcon(row, whatWeChangeObject.type);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				} else {
					Search.tmpHideIcon(row, whatWeChangeObject.type);
					returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
				}
			}
		});
		
		if (whatWeChangeObject.what == 'this') {
			$('#mainTable thead tr').each(function() {
				var row         = $(this),
					host        = Search.getHost(row),
					service     = Search.getService(row),
					check       = Search.getLastCheck(row),
					isHost      = row.find('.host a').attr('data-host'),
					infoService = (row.find('td.host').hasClass('blue-text') || row.find('td.host').hasClass('brown-text')) ? '_' : '';
				
				if (whatWeChangeObject.host && whatWeChangeObject.service) {
					if (host == whatWeChangeObject.host && service == whatWeChangeObject.service) {
						Search.tmpHideIcon(row, whatWeChangeObject.type);
						returnArray.push({ 'host': host, 'service': infoService + service, 'check': check, 'isHost': isHost });
					}
				}
			});
		}
	}
	
	whatWeChangeDataObject = returnArray;
	
	return true;
}
Search.prepareSendData = function () {
	var requestData = [];
	
	$(whatWeChangeDataObject).each(function() {
		if (whatWeChangeObject.type == 'recheckIt') {
			requestData.push({
				'start_time':  $(this)[0].check,
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'isHost':      $(this)[0].isHost,
			});
		}
		else if (whatWeChangeObject.type == 'quickAck') {
			requestData.push({
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'com_data':    'temp',
				'author':      Search.currentUser,
				'isHost':      $(this)[0].isHost,
			});
		}
		else if (whatWeChangeObject.type == 'quickUnAck' || whatWeChangeObject.type == 'unAck' || whatWeChangeObject.type == 'unAcknowledgeIt') {
			requestData.push({
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'isHost':      $(this)[0].isHost,
			});
		}
		else if (whatWeChangeObject.type == 'acknowledgeIt') {
			requestData.push({
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'com_data':    $('input[name="ack_comment_extension"]').val(),
				'author':      Search.currentUser,
				'isHost':      $(this)[0].isHost,
			});
		}
		else if (whatWeChangeObject.type == 'scheduleIt') {
			var currentServerDate = $('#lastUpdated').html().replace(/UTC|EDT|C?EST|GMT/gi, ''),
				hours             = parseInt($('#timeShift').html(),10);
				
			requestData.push({
				'hours':       hours,
				'start_time':  new Date(currentServerDate).format('mm-dd-yyyy HH:MM:ss'),
				'end_time':    new Date(currentServerDate).addHours(hours).format('mm-dd-yyyy HH:MM:ss'),
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'com_data':    $('#downtimeComment').html(),
				'author':      Search.currentUser,
				'isHost':      $(this)[0].isHost,
			});
		}
	});
	
	if (whatWeChangeObject.type == 'scheduleIt' || whatWeChangeObject.type == 'acknowledgeIt') {
		$.ajax({
			url:    'post.php',
			method: 'POST',
			data:   { data: requestData, type: 'unAck' },
		})
		.always(function() {
			$.ajax({
				url:    'post.php',
				method: 'POST',
				data:   { data: requestData, type: whatWeChangeObject.type },
			})
			.fail(function(jqXHR, textStatus) {
				console.log( "Request failed: " + textStatus + ' - ' + jqXHR );
				Search.tempShowButtons();
			})
			.done(function() {
				Search.restoreAllData();
			});
		});
	}
	else {
		$.ajax({
			url:    'post.php',
			method: 'POST',
			data:   { data: requestData, type: whatWeChangeObject.type },
		})
		.fail(function(jqXHR, textStatus) {
			console.log( "Request failed: " + textStatus + ' - ' + jqXHR );
			Search.tempShowButtons();
		})
		.done(function() {
			Search.restoreAllData();
		});
	}
}
Search.restoreAllData = function() {
	var commentDate = '';
	
	Search.allDataTable.rows({ page:'current', search:'applied' }).every(function (rowIdx, tableLoop, rowLoop) {
		var d      = this.data(),
			change = 0;
		
		if (whatWeChangeObject.what == 'all') {
			change = 1;
		}
		else if (whatWeChangeObject.what == 'this' && whatWeChangeObject.service == d.service.name && whatWeChangeObject.host == d.host.name) {
			change = 1;
		}
		else if (whatWeChangeObject.what == 'group' && whatWeChangeObject.service == d.service.name) {
			change = 1;
		}
 
		
		if (change) {
			if (whatWeChangeObject.type == 'quickAck') {
				d.service.qUAck = Search.avatarUrl;
				d.service.qAck  = false;
				d.service.qAuth = Search.currentUser;
			}
			else if (whatWeChangeObject.type == 'quickUnAck') {
				d.service.qUAck = false;
				d.service.qAck  = true;
				d.service.qAuth = false;
			}
			else if (whatWeChangeObject.type == 'unAck' || whatWeChangeObject.type == 'unAcknowledgeIt') {
				d.service.unAck = false;
				d.service.qUAck = false;
				d.service.qAck  = true;
				d.service.qAuth = false;
				d.comment.ack   = '';
				
				if (whatWeChangeObject.what == 'this') {
                    $('#mainTable tbody tr').each(function() {
						var host    = $(this).find('td.host a').text(),
							service = $(this).find('td.service a.service-name').text();
							
						if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
                            $(this).remove();
							Search.countRecordsPlus('normal');
							Search.countRecordsMinus('acked');
                        }
					});
					
					$('#mainTable thead tr').each(function() {
						var host    = $(this).find('td.host a').text(),
							service = $(this).find('td.service a.service-name').text(),
							attr    = $(this).attr('data-group');
						
						if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
							var count = parseInt($('#mainTable thead tr[data-group="'+ attr +'"]:first span:first').text()) - 1;
							$('#mainTable thead tr[data-group="'+ attr +'"]:first span:first').text(count);
							$(this).remove();
							Search.countRecordsPlus('normal');
							Search.countRecordsMinus('acked');
							
							if (Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length) {
								for (var i = 0; i < Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length; i++) {
									var host    = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i].find('td.host a').text(),
										service = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i].find('td.service a.service-name').text()
							
									if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
										Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].splice(i, 1);
									}
								}
							}
						}
					});	
                }
				
				if (whatWeChangeObject.what == 'all') {
                    $('#mainTable tbody tr').each(function() {
						$(this).remove();
					});
					
					$('#mainTable thead tr:not(:first)').each(function() {
						$(this).remove();
						Search.allHeaderRows = {};
					});
					
					var oldCount = parseInt($('#radio label[for="acked"] em').text()),
						newCount = parseInt($('#radio label[for="normal"] em').text());
						
					$('#radio label[for="normal"] em').text(oldCount + newCount);
					$('#radio label[for="acked"] em').text('0');
                }
				
				if (whatWeChangeObject.what == 'group') {
					var attr     = (whatWeChangeObject.service) ? whatWeChangeObject.service.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase() : whatWeChangeObject.host.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase();
					
					if ($('#mainTable thead tr[data-group="'+ attr +'"]').length) {
                        var count    = parseInt($('#mainTable thead tr[data-group="'+ attr +'"]:first td.host span:first').text()),
							oldCount = parseInt($('#radio label[for="normal"] em').text()),
							newCount = parseInt($('#radio label[for="acked"] em').text());
						
						$('#radio label[for="normal"] em').text(oldCount + count);
						$('#radio label[for="acked"] em').text(newCount - count);
						
						$('#mainTable thead tr[data-group="'+ attr +'"]').remove();
                    }
                }
				

			}
			else if (whatWeChangeObject.type == 'acknowledgeIt') {
				if (!commentDate) {
					commentDate = Search.commentsDateFromat(new Date());
				}
				
				var newComment  = "'"+ $('input[name="ack_comment_extension"]').val() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;
				d.comment.ack   = (d.comment.ack) ? (d.comment.ack +'<br /><br />'+ newComment) : newComment;
				d.service.unAck = true;
				d.service.qAck  = true;
				
				if (whatWeChangeObject.what == 'this') {
                    $('#mainTable tbody tr').each(function() {
						var host    = $(this).find('td.host a').text(),
							service = $(this).find('td.service a.service-name').text();
							
						if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
                            $(this).remove();
							Search.countRecordsMinus(Search.currentTab);
							Search.countRecordsPlus('acked');
                        }
					});
					
					$('#mainTable thead tr').each(function() {
						var host    = $(this).find('td.host a').text(),
							service = $(this).find('td.service a.service-name').text(),
							attr    = $(this).attr('data-group');
						
						if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
							var count = parseInt($('#mainTable thead tr[data-group="'+ attr +'"]:first span:first').text()) - 1;
							$('#mainTable thead tr[data-group="'+ attr +'"]:first span:first').text(count);
							$(this).remove();
							Search.countRecordsMinus(Search.currentTab);
							Search.countRecordsPlus('acked');
							
							if (Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length) {
								for (var i = 0; i < Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length; i++) {
									var host    = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i].find('td.host a').text(),
										service = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i].find('td.service a.service-name').text()
							
									if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
										Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].splice(i, 1);
									}
								}
							}
						}
					});	
                }
				
				if (whatWeChangeObject.what == 'all') {
                    $('#mainTable tbody tr').each(function() {
						$(this).remove();
					});
					
					$('#mainTable thead tr:not(:first)').each(function() {
						$(this).remove();
						Search.allHeaderRows = {};
					});
					
					var oldCount = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
						newCount = parseInt($('#radio label[for="acked"] em').text());
						
					$('#radio label[for="' + Search.currentTab + '"] em').text('0');
					$('#radio label[for="acked"] em').text(oldCount + newCount);
                }
				
				if (whatWeChangeObject.what == 'group') {
					var attr     = (whatWeChangeObject.service) ? whatWeChangeObject.service.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase() : whatWeChangeObject.host.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase();
					
					if ($('#mainTable thead tr[data-group="'+ attr +'"]').length) {
                        var count    = parseInt($('#mainTable thead tr[data-group="'+ attr +'"]:first td.host span:first').text()),
							oldCount = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
							newCount = parseInt($('#radio label[for="acked"] em').text());
						
						$('#radio label[for="' + Search.currentTab + '"] em').text(oldCount - count);
						$('#radio label[for="acked"] em').text(newCount + count);
						
						$('#mainTable thead tr[data-group="'+ attr +'"]').remove();
                    }
                }
			}
			else if (whatWeChangeObject.type == 'scheduleIt') {
				if (!commentDate) {
					commentDate = Search.commentsDateFromat(new Date());
				}
				
				var newComment  = "'"+ $('#downtimeComment').text() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;
				d.comment.sched = (d.comment.sched) ? (d.comment.sched +'<br /><br />'+ newComment) : newComment;
				d.service.down  = true;
				d.service.qUAck = false;
				d.service.qAck  = true;
				d.service.qAuth = false;
				
				if (whatWeChangeObject.what == 'this') {
                    $('#mainTable tbody tr').each(function() {
						var host    = $(this).find('td.host a').text(),
							service = $(this).find('td.service a.service-name').text();
							
						if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
                            $(this).remove();
							Search.countRecordsMinus(Search.currentTab);
							Search.countRecordsPlus('sched');
                        }
					});
					
					$('#mainTable thead tr').each(function() {
						var host    = $(this).find('td.host a').text(),
							service = $(this).find('td.service a.service-name').text(),
							attr    = $(this).attr('data-group');
						
						if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
							var count = parseInt($('#mainTable thead tr[data-group="'+ attr +'"]:first span:first').text()) - 1;
							$('#mainTable thead tr[data-group="'+ attr +'"]:first span:first').text(count);
							$(this).remove();
							Search.countRecordsMinus(Search.currentTab);
							Search.countRecordsPlus('sched');
							
							if (Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length) {
								for (var i = 0; i < Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length; i++) {
									var host    = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i].find('td.host a').text(),
										service = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i].find('td.service a.service-name').text()
							
									if (whatWeChangeObject.service == service && whatWeChangeObject.host == host) {
										Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].splice(i, 1);
									}
								}
							}
						}
					});	
                }
				
				if (whatWeChangeObject.what == 'all') {
                    $('#mainTable tbody tr').each(function() {
						$(this).remove();
					});
					
					$('#mainTable thead tr:not(:first)').each(function() {
						$(this).remove();
						Search.allHeaderRows = {};
					});
					
					var oldCount = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
						newCount = parseInt($('#radio label[for="sched"] em').text());
						
					$('#radio label[for="' + Search.currentTab + '"] em').text('0');
					$('#radio label[for="sched"] em').text(oldCount + newCount);
                }
				
				if (whatWeChangeObject.what == 'group') {
					var attr     = (whatWeChangeObject.service) ? whatWeChangeObject.service.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase() : whatWeChangeObject.host.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase();
					
					if ($('#mainTable thead tr[data-group="'+ attr +'"]').length) {
                        var count    = parseInt($('#mainTable thead tr[data-group="'+ attr +'"]:first td.host span:first').text()),
							oldCount = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
							newCount = parseInt($('#radio label[for="sched"] em').text());
						
						$('#radio label[for="' + Search.currentTab + '"] em').text(oldCount - count);
						$('#radio label[for="sched"] em').text(newCount + count);
						
						$('#mainTable thead tr[data-group="'+ attr +'"]').remove();
                    }
                }
			}
			this.invalidate();
		}
	});
	
	setTimeout(function(){ localStorage.setItem('canceledReloads', '0'); Search.startReloads(); }, 5000);
	quickAckUnAckGroup();
				
	$('#dialogAck').dialog('close');
	$('#dialog').dialog('close');
	$('input[name="ack_comment_extension"]').val('').removeClass('ui-state-error');
	$('#acknowledgeDialogButton').removeAttr('disabled');
	$('#sched_finish_date_time').datetimepicker('destroy');
	$('#openDialogServerTime').html('');
	$('form[name=scheduleDowntime] input').val('');
	$('form[name=scheduleDowntime] .ui-state-error').removeClass('ui-state-error');
	$('#timeShift').html('');
	$('#downtimeComment').html('');
	$('#lastUpdated').html('');
	$('#scheduleDowntimeButton').removeAttr('disabled');
	
	commentDate            = ''
	whatWeChangeDataObject = null;
	whatWeChangeObject     = null;
}
Search.commentsDateFromat = function(d) {
	var month   = d.getMonth(),
		day     = d.getDate(),
		hour    = d.getHours(),
		minutes = d.getMinutes();
	
	if (month == 0) { month = 'Jan' }
	else if (month == 1)  { month = 'Feb' }
	else if (month == 2)  { month = 'Mar' }
	else if (month == 3)  { month = 'Apr' }
	else if (month == 4)  { month = 'May' }
	else if (month == 5)  { month = 'Jun' }
	else if (month == 6)  { month = 'Jul' }
	else if (month == 7)  { month = 'Aug' }
	else if (month == 8)  { month = 'Sep' }
	else if (month == 9)  { month = 'Oct' }
	else if (month == 10) { month = 'Nov' }
	else if (month == 11) { month = 'Dec' }


	return month +' '+ day +' '+ hour +':'+ minutes;
}
Search.tempShowButtons = function() {
	var tableWhere    = (whatWeChangeObject.what == 'group') ? 'thead' : 'tbody',
		tableNot      = (whatWeChangeObject.what == 'group') ? ':not(.group-list)' : '',
		returnArray   = [];   
	
	$('#mainTable '+ tableWhere +' tr' + tableNot).each(function() {
		var row     = $(this),
			host    = Search.getHost(row),
			service = Search.getService(row),
			check   = Search.getLastCheck(row);
			
		if (whatWeChangeObject.host && whatWeChangeObject.service) {
			if (host == whatWeChangeObject.host && service == whatWeChangeObject.service) {
				Search.tmpShowIcon(row, whatWeChangeObject.type);
			}
		} else if (whatWeChangeObject.host) {
			if (host == whatWeChangeObject.host) {
				Search.tmpShowIcon(row, whatWeChangeObject.type);
			}
		} else if (whatWeChangeObject.service) {
			if (service == whatWeChangeObject.service) {
				Search.tmpShowIcon(row, whatWeChangeObject.type);
			}
		} else {
			Search.tmpShowIcon(row, whatWeChangeObject.type);
		}
	});

	
	if (whatWeChangeObject.what == 'group' || whatWeChangeObject.what == 'this') {
		$('#mainTable thead tr').each(function() {
			var row     = $(this),
				host    = Search.getHost(row),
				service = Search.getService(row);
			
			if (whatWeChangeObject.host && whatWeChangeObject.service) {
				if (host == whatWeChangeObject.host && service == whatWeChangeObject.service) {
					Search.tmpShowIcon(row, whatWeChangeObject.type);
				}
			} else if (whatWeChangeObject.host) {
				if (host == whatWeChangeObject.host) {
					Search.tmpShowIcon(row, whatWeChangeObject.type +'Group');
				}
			} else if (whatWeChangeObject.service) {
				if (service == whatWeChangeObject.service) {
					Search.tmpShowIcon(row, whatWeChangeObject.type +'Group');
				}
			}
		});
	}
	
	if ((whatWeChangeObject.what == 'all')) {
		$('#mainTable tr .icons.'+ whatWeChangeObject.type +'Group, #mainTable tr .icons.'+ whatWeChangeObject.type +', #'+ whatWeChangeObject.type +'_button').show();
	}
	
	$('input[name="ack_comment_extension"]').val('').removeClass('ui-state-error');
	$('#acknowledgeDialogButton').removeAttr('disabled');
	$('#sched_finish_date_time').datetimepicker('destroy');
	$('#openDialogServerTime').html('');
	$('form[name=scheduleDowntime] input').val('');
	$('form[name=scheduleDowntime] .ui-state-error').removeClass('ui-state-error');
	$('#timeShift').html('');
	$('#downtimeComment').html('');
	$('#lastUpdated').html('');
	$('#scheduleDowntimeButton').removeAttr('disabled');
	
	whatWeChangeDataObject = null;
	whatWeChangeObject     = null;
	
	Search.startReloads();
	quickAckUnAckGroup();
}
Search.AcknowledgeServices = function() {
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
	
	$('#acknowledgeDialogButton').attr('disabled', 'disabled');
	Search.prepareSendData();
}
Search.SheduleServices = function() {
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
	
	$.get($('#nagiosConfigFile').html(), function(data) {
		var regex       = new RegExp(/Last Updated:\s*([^<]+)/i),
			results     = regex.exec(data);
		
		$('#lastUpdated').html(results[1]);
	})
	.done(function() {
		$('#scheduleDowntimeButton').attr('disabled', 'disabled');
		Search.prepareSendData();
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
Search.getService = function(row) {
	return (row.length && row.find('td.service ul li:first').text()) ? row.find('td.service ul li:first').text() : '';
}
Search.getHost = function(row) {
	return (row.length && row.find('td.host').text()) ? row.find('td.host').text() : '';
}
Search.getLastCheck = function(row) {
	return (row.length && row.find('td.last_check').text()) ? row.find('td.last_check').text() : '';
}

Search.showMoreMobile = function(tr) {
    tr.find('.hide-more').show();
	tr
		.find('.service .likeTable ul li:first')
		.css('float',      'left')
		.css('display',    'block')
		.css('width',      '100%')
		.css('margin',     '2px 0 12px 0')
		.css('text-align', 'left');
		
	tr
		.find('.service .likeTable ul li:not(:first)')
		.css('float',   'left')
		.css('display', 'inline-block')
		.css('margin',  '0 2px 5px 2px') 
		.show();
			
	tr
		.find('.duration')
		.css('vertical-align', 'top')
		.css('padding-top',    '6px');
			
	tr
		.find('.more .button-more')
		.text('<')
		.removeClass('button-more')
		.addClass('button-more-hide');
		
	if (Search.currentTab == 'acked') {
		tr.find('.service .icons.quickUnAck, .service .icons.quickAck').closest('li').hide();
	}
		
	if (Search.currentTab == 'normal' || Search.currentTab == 'EMERGENCY') {
		tr.find('.host .hide-more .more-comment-icon').hide();
	}
		
	if (tr.find('.host').css('visibility') == 'hidden') {
		tr.find('.host').css('visibility', 'visible');
		tr.find('.button-more-hide').addClass('hide-host');
	}
}
Search.hideMoreMobile = function(tr) {
	if (tr) {
		var tmpHost    = (tr.find('.host a').text()) ? tr.find('.host a').text() : tr.find('.host span:first').text(),
			tmpService = (tr.find('.service .service-name').text()) ? tr.find('.service .service-name').text() : tr.find('.service li:first').text(),
			tmpName    = tmpHost + ' ' + tmpService;
			
		Search.hideMoreArray.splice($.inArray(tmpName.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase(), Search.hideMoreArray), 1 );
		
		tr.find('.hide-more').removeAttr('style');
		tr.find('.service .likeTable ul li:first').removeAttr('style');
		tr.find('.service .likeTable ul li:not(:first)').removeAttr('style');
		tr.find('.duration').removeAttr('style');
		tr.find('.more .button-more-hide').text('>').removeClass('button-more-hide').addClass('button-more');
			
		if (Search.currentTab != 'acked') {
			tr.find('.service .icons.quickUnAck, .service .icons.quickAck').closest('li').show();
		}
			
		if (tr.find('.more .button-more').hasClass('hide-host')) {
			tr.find('.more .button-more').removeClass('hide-host');
			tr.find('.host').css('visibility', 'hidden');
		}
	} else {
		$('#mainTable tr').each(function() {
			var tr = $(this);
			
			tr.find('.hide-more').removeAttr('style');
			tr.find('.service .likeTable ul li:first').removeAttr('style');
			tr.find('.service .likeTable ul li:not(:first)').removeAttr('style');
			tr.find('.duration').removeAttr('style');
			tr.find('.more .button-more-hide').text('>').removeClass('button-more-hide').addClass('button-more');
				
			if (Search.currentTab != 'acked') {
				tr.find('.service .icons.quickUnAck, .service .icons.quickAck').closest('li').show();
			}
				
			if (tr.find('.more .button-more').hasClass('hide-host')) {
				tr.find('.more .button-more').removeClass('hide-host');
				tr.find('.host').css('visibility', 'hidden');
			}
		});
	}
}

Search.drawTinycon = function() {
    if (Search.ajaxData.critical) {
        Tinycon.setOptions({ colour: '#ffffff', background: '#ff0000' });
        Tinycon.setBubble(Search.ajaxData.critical);
    } else if (Search.ajaxData.unknown) {
        Tinycon.setOptions({ colour: '#ffffff', background: '#dd8500' });
        Tinycon.setBubble(Search.ajaxData.unknown);
    } else if (Search.ajaxData.warnings) {
        Tinycon.setOptions({ colour: '#000000', background: '#ffff00' });
        Tinycon.setBubble(Search.ajaxData.warnings);
    } else if (typeof Tinycon !== 'undefined') {
    Tinycon.setBubble(0);
    }
}
Search.countRecords = function() {
    $('#radio label[for="normal"] em').text(Search.ajaxData.normal);
    $('#radio label[for="acked"] em').text(Search.ajaxData.acked);
    $('#radio label[for="sched"] em').text(Search.ajaxData.sched);
    $('#radio label[for="EMERGENCY"] em').text(Search.ajaxData.EMERGENCY);
	Search.infoRowCounter();
}
Search.countRecordsMinus = function(buttonID) {
	var count = parseInt($('#radio label[for="'+ buttonID +'"] em').text()) - 1;
	$('#radio label[for="'+ buttonID +'"] em').text(count);
	
	Search.ajaxData.total_tab = Search.ajaxData.total_tab - 1;
	Search.infoRowCounter();
}
Search.countRecordsPlus = function(buttonID) {
	var count = parseInt($('#radio label[for="'+ buttonID +'"] em').text()) + 1;
	$('#radio label[for="'+ buttonID +'"] em').text(count);
}
Search.infoRowCounter = function() {
	var from = (Search.ajaxData.total_tab) ? 1 : 0;
	$('#mainTable_info').text('Showing '+ from +' to '+ Search.ajaxData.total_tab +' of '+ Search.ajaxData.total_tab +' entries (filtered from '+ Search.ajaxData.total +' total entries)');
}

Search.getNewData = function() {
	Search.allDataTable.ajax.url('json.php?filter=' + Search.currentTab + Search.additionalFile).load(function() {
		Search.resetAgo();
        showHidePlanned();
    }).order(Search.orderBy[Search.currentTab]);
}

Search.returnComments = function(modal) {
	if (Search.ajaxData.commentsSelect) {
        $.ajax({
			url:    'comments.php',
			method: 'GET',
			data:   { host: whatWeChangeObject.host, service: whatWeChangeObject.service },
		})
		.success(function(data) {
			if (data.length) {
				var html  = '<select name="select-comment-list">';
					html += '<option value=""></option>';
				
				for (var i = 0; i < data.length; i++) {
					html += '<option value="'+ data[i].name +'">'+ data[i].name +' - '+ moment(data[i].date, 'YYYY-MM-DD HH:mm:ss').fromNow() +'</option>';
				}
	
				html += '</select>';
				
				$(modal + ' .select-comment').show();
				$(modal + ' .select-comment select').html(html);
			}
		});
    }
}
Search.addToAgo = function() {
	Search.lastUpdateAgo++;
	$('#updatedAgo').text(Search.lastUpdateAgo);
}
Search.resetAgo = function() {
	window.clearInterval(Search.agoInterval);
	Search.lastUpdateAgo = 0;
	$('#updatedAgo').text(Search.lastUpdateAgo);
	Search.startAgo();
}
Search.startAgo = function() {
	Search.agoInterval = setInterval(function(){ Search.addToAgo(); }, 1000);
}
selectTimer = null;

function checkSelectedText() {
	clearTimeout(selectTimer);
	
	var selection = getSelectedText();
	
	if (!selection) {
		selectTimer = setTimeout(function(){ checkSelectedText() }, 100);
	} else {
		Search.stopReloads();
	}
}

Search.init = function() {
	Search.startAgo();
	getPlanned();
	
	$(document).mousedown(function() {
		selectTimer = setTimeout(function(){ checkSelectedText() }, 100);
    });
	
	$(document).click(function() {
		var selection = getSelectedText();

		if (selection && (Search.backgroundReload || Search.autoRefresh)) {
			Search.stopReloads();
		} else if (!selection && !Search.backgroundReload && !Search.autoRefresh && !$('.ui-widget-overlay').length) {
			Search.startReloads();
		}
		
		clearTimeout(selectTimer);
    });
	
	$(document).on('change', '.select-comment select', function() {
		$(this).closest('td').find('.write-comment input').val($(this).val()).focus();
	});
	
	function showHidePlanned() {
		if (Search.currentTab == 'planned') {
			$('#planned-maintenance').show();
			$('#mainTable_wrapper').hide();
		} else {
			$('#planned-maintenance').hide();
			$('#mainTable_wrapper').show();
		}
	}
	function getPlanned() {
		showHidePlanned();
		
		$.ajax({
			url:    'planned.php',
			method: 'GET',
		})
		.always(function(data) {
			drawPlanned(data);
			setTimeout(function(){ getPlanned() }, 60000);
		});
	}
	function drawPlanned(data) {
		$('#planned-list').html('');
		$('#planned-list').closest('div').toggle(data.length > 0);
		
		if (data.length > 0) {
			$.each(data, function( index, value ) {
				$('#planned-list').append('<li><small><strong>' + value['command'] + '</strong> (till: '+ value['date'] +')</small> <button data-id="'+ (index + 1) +'" class="save-planned">Delete</button></li>');
			});
		}
	}
	$(document).on('click', '.save-planned', function() {
		var li = $(this).closest('li');

		if (confirm('Are you sure?')) {
			$(this).attr('disabled', 'disabled');
			
			$.ajax({
				url:    'planned.php',
				method: 'POST',
				data:   { text: 'delete', time: 1, line: li.find('button').attr('data-id') },
			})
			.always(function(data) {
				drawPlanned(data);
				Search.stopReloads();
				Search.startReloads();
			});
		}
	});
	$(document).on('click', '#planned-save', function() {
		$('#host-service, #maintenance-time').removeAttr('style');
		
		var text = $('#host-service').val(),
			time = parseInt($('#maintenance-time').val()),
			user = $('#userName').text();
			
		if (text && time > 0) {
			$.ajax({
				url:    'planned.php',
				method: 'POST',
				data:   { text: text, time: time, line: 'new', user: user },
			})
			.always(function(data) {
				$('#host-service, #maintenance-time').val('');
				drawPlanned(data);
				Search.stopReloads();
				Search.startReloads();
			});
		} else {
			if (!text) {
				$('#host-service').css('border-color', 'red');
			}
			if (!time || time < 1) {
				$('#maintenance-time').css('border-color', 'red');
			}
		}
	});
	$('#host-service, #maintenance-time').on('keypress', function(e) {
		if (e.keyCode && e.keyCode == 13) {
			$('#planned-save').trigger('click');
		}
	});
	
	
	$('#normal, #acked, #sched, #EMERGENCY, #planned').on('click', function() {
		if (Search.currentTab == $(this).attr('id')) {
		    location.reload();
		    return false;
		}
		Search.hideMoreArray = [];
		Search.stopReloads();
		
		localStorage.setItem('currentTabNew', $(this).attr('id'));
		Search.currentTab     = localStorage.getItem('currentTabNew');
		
		Search.allDataTable.order(Search.orderBy[Search.currentTab]);
		
		if (Search.currentTab != 'planned') {
            Search.allDataTable.ajax.url('json.php?filter=' + Search.currentTab + Search.additionalFile).load(function() {
				Search.resetAgo();
				showHidePlanned();
			}).order(Search.orderBy[Search.currentTab]);
        } else {
			showHidePlanned();
		}
	});
	$('#mainTable_filter input').unbind().bind('propertychange keyup input paste keydown', function(e) {
		var val = $(this).val();
		
		if (Search.searchValue != $(this).val()) {
			Search.searchValue = val;
			
			Search.allDataTable.search(Search.searchValue).ajax.url('json.php?filter=' + Search.currentTab + Search.additionalFile).load(function () {
				Search.resetAgo();
				showHidePlanned();
					
				setTimeout(function(){
					showHidePlanned();
				}, 400);
			});
        }

		
        if (e.keyCode && e.keyCode == 13) {
			window.location.href = Search.addParameterToUrl('search', val);
		}
    });
	$('#mainTable_filter input').val(Search.getParameterByName('search')).trigger('keyup').focus();
	
	$('#grouping option[value="'+ Search.currentGroup +'"]').attr('selected', 'selected');
	$('#grouping').selectmenu({
		select: function (event, data) {
			localStorage.setItem('currentGroup', data.item.value);
			Search.currentGroup = localStorage.getItem('currentGroup');
			
			if (data.item.value == '1') {
                Search.filterDataTable();
            } else {
				Search.allDataTable.ajax.url('json.php?filter=' + Search.currentTab + Search.additionalFile).load(function() {
					Search.resetAgo();
					showHidePlanned();
				}).order(Search.orderBy[Search.currentTab]);
			}
		}
	});
	$(document).on('click', '.group-list', function () {
		var attr = $(this).attr('data-group');

		if ($(this).hasClass('open')) {
			localStorage.removeItem(Search.currentTab + '_' + attr);
			
			$('#mainTable thead tr[data-group="'+ attr +'"]:not(.group-list-bottom)').remove();
			$('#mainTable thead tr[data-group="'+ attr +'"]:not(.group-list):last').removeClass('group-list-bottom').hide();
			
			$(this).removeClass('open');
		}
		else {
			localStorage.setItem(Search.currentTab + '_' + attr, true);
			
			for (var i = 0; i < Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length; i++) {
				$(Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'][i]).insertBefore('#mainTable thead tr[data-group="'+ attr +'"]:last');
			}
			
			Search.recheckIcons();
			$('#mainTable thead tr[data-group="'+ attr +'"]:not(.group-list):last').addClass('group-list-bottom').show();
			
			$(this).addClass('open');
		}
		
	});
	
	
	$('#mainTable').on('click', 'thead .recheckItGroup', function () {
		var host    = $(this).closest('tr').find('.host').text(),
			service = $(this).closest('tr').find('.service ul li:first').text();
			
		whatWeChangeObject = {
			'type':    'recheckIt',
			'what':    'group',
			'host':    (host    == parseInt(host))    ? '' : host,
			'service': (service == parseInt(service)) ? '' : service,
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
		
		return false;
	});
	$('#mainTable').on('click', '.recheckIt', function () {
		whatWeChangeObject = {
			'type':    'recheckIt',
			'what':    'this',
			'host':    $(this).closest('tr').find('.host').text(),
			'service': $(this).closest('tr').find('.service ul li:first').text(),
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	$(document).on('click', '#'+ Search.recheckButtonId, function () {
		whatWeChangeObject = {
			'type':    'recheckIt',
			'what':    'all',
			'host':    '',
			'service': '',
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	
	
	$('#mainTable').on('click', 'thead .quickAckGroup', function () {
		var host    = $(this).closest('tr').find('.host').text(),
			service = $(this).closest('tr').find('.service ul li:first').text();

		whatWeChangeObject = {
			'type':    'quickAck',
			'what':    'group',
			'host':    (host    == parseInt(host))    ? '' : host,
			'service': (service == parseInt(service)) ? '' : service,
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
		
		return false;
	});
	$('#mainTable').on('click', '.quickAck', function () {
		whatWeChangeObject = {
			'type':    'quickAck',
			'what':    'this',
			'host':    $(this).closest('tr').find('.host').text(),
			'service': $(this).closest('tr').find('.service ul li:first').text(),
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	$(document).on('click', '#'+ Search.quickAckButtonId, function () {
		whatWeChangeObject = {
			'type':    'quickAck',
			'what':    'all',
			'host':    '',
			'service': '',
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	
	
	$('#mainTable').on('click', 'thead .quickUnAckGroup', function () {
		var host    = $(this).closest('tr').find('.host').text(),
			service = $(this).closest('tr').find('.service ul li:first').text();
			
		whatWeChangeObject = {
			'type':    'quickUnAck',
			'what':    'group',
			'host':    (host    == parseInt(host))    ? '' : host,
			'service': (service == parseInt(service)) ? '' : service,
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
			
		return false;
	});
	$('#mainTable').on('click', '.quickUnAck', function () {
		whatWeChangeObject = {
			'type':    'quickUnAck',
			'what':    'this',
			'host':    $(this).closest('tr').find('.host').text(),
			'service': $(this).closest('tr').find('.service ul li:first').text(),
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	$(document).on('click', '#'+ Search.quickUnAckButtonId, function () {
		whatWeChangeObject = {
			'type':    'quickUnAck',
			'what':    'all',
			'host':    '',
			'service': '',
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	
	
	$('#mainTable').on('click', 'thead .unAckGroup', function () {
		var host    = $(this).closest('tr').find('.host').text(),
			service = $(this).closest('tr').find('.service ul li:first').text();
			
		whatWeChangeObject = {
			'type':    'unAck',
			'what':    'group',
			'host':    (host    == parseInt(host))    ? '' : host,
			'service': (service == parseInt(service)) ? '' : service,
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
		
		return false;
	});
	$('#mainTable').on('click', '.unAck', function () {
		whatWeChangeObject = {
			'type':    'unAck',
			'what':    'this',
			'host':    $(this).closest('tr').find('.host').text(),
			'service': $(this).closest('tr').find('.service ul li:first').text(),
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	$(document).on('click', '#'+ Search.unackButtonId, function () {
		whatWeChangeObject = {
			'type':    'unAck',
			'what':    'all',
			'host':    '',
			'service': '',
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});

	
	$(document).on('click', '#unAcknowledgeIt_button', function () {
		whatWeChangeObject = {
			'type':    'unAcknowledgeIt',
			'what':    'all',
			'host':    '',
			'service': '',
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	$('#mainTable').on('click', 'thead .unAcknowledgeItGroup', function () {
		var host    = $(this).closest('tr').find('.host').text(),
			service = $(this).closest('tr').find('.service ul li:first').text();
			
		whatWeChangeObject = {
			'type':    'unAcknowledgeIt',
			'what':    'group',
			'host':    (host    == parseInt(host))    ? '' : host,
			'service': (service == parseInt(service)) ? '' : service,
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
		
		return false;
	});
	$('#mainTable').on('click', '.unAcknowledgeIt', function () {
		whatWeChangeObject = {
			'type':    'unAcknowledgeIt',
			'what':    'this',
			'host':    $(this).closest('tr').find('.host').text(),
			'service': $(this).closest('tr').find('.service ul li:first').text(),
		};
		
		$.when(Search.tempHideButtons()).then(function(){Search.prepareSendData()});
	});
	
	
	$('#mainTable').on('click', 'thead .acknowledgeItGroup', function () {
		var host    = $(this).closest('tr').find('.host').text(),
			service = $(this).closest('tr').find('.service ul li:first').text();
			
		whatWeChangeObject = {
			'type':    'acknowledgeIt',
			'what':    'group',
			'host':    (host    == parseInt(host))    ? '' : host,
			'service': (service == parseInt(service)) ? '' : service,
		};
		
		Search.tempHideButtons();
		$('#dialogAck').dialog('open');
		Search.returnComments('#dialogAck');
		
		return false;
	});
	$('#mainTable').on('click', '.acknowledgeIt', function () {
		whatWeChangeObject = {
			'type':    'acknowledgeIt',
			'what':    'this',
			'host':    $(this).closest('tr').find('.host').text(),
			'service': $(this).closest('tr').find('.service ul li:first').text(),
		};
		
		Search.tempHideButtons();
		$('#dialogAck').dialog('open');
		Search.returnComments('#dialogAck');
	});
	$(document).on('click', '#'+ Search.ackButtonId, function () {
		whatWeChangeObject = {
			'type':    'acknowledgeIt',
			'what':    'all',
			'host':    '',
			'service': '',
		};
		
		Search.tempHideButtons();
		$('#dialogAck').dialog('open');
	});
	$(document).on('keypress', '#ack_comment_extension', function (e) {
		if (e.keyCode && e.keyCode == 13) {
			$('#acknowledgeDialogButton').trigger('click');
		}
	});
	
	$('#mainTable').on('click', 'thead .scheduleItGroup', function () {
		var host    = $(this).closest('tr').find('.host').text(),
			service = $(this).closest('tr').find('.service ul li:first').text();
			
		whatWeChangeObject = {
			'type':    'scheduleIt',
			'what':    'group',
			'host':    (host    == parseInt(host))    ? '' : host,
			'service': (service == parseInt(service)) ? '' : service,
		};
		
		Search.tempHideButtons();
		$('#dialog').dialog('open');
		Search.returnComments('#dialog');
		
		return false;
	});
	$('#mainTable').on('click', '.scheduleIt', function () {
		whatWeChangeObject = {
			'type':    'scheduleIt',
			'what':    'this',
			'host':    $(this).closest('tr').find('.host').text(),
			'service': $(this).closest('tr').find('.service ul li:first').text(),
		};
		
		Search.tempHideButtons();
		$('#dialog').dialog('open');
		Search.returnComments('#dialog');
	});
	$(document).on('click', '#'+ Search.sdButtonId, function () {
		whatWeChangeObject = {
			'type':    'scheduleIt',
			'what':    'all',
			'host':    '',
			'service': '',
		};
		
		Search.tempHideButtons();
		$('#dialog').dialog('open');
	});
	$(document).on('change', '#sched_finish_date_time', function () {
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
	$(document).on('change', '#sched_interval_extension', function () {
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
	$(document).on('keypress', '#sched_comment_extension, #sched_interval_extension', function (e) {
		if (e.keyCode && e.keyCode == 13) {
			$('#scheduleDowntimeButton').trigger('click');
		}
	});
	
	
	Search.allDataTable.on('order.dt', function(e, settings) {
		Search.orderBy[Search.currentTab] = settings.aaSorting;
		Search.allDataTable.order(Search.orderBy[Search.currentTab]);
		Search.emptyHosts();
	});
	$('#hosts').on("click", function() { window.open($('#nagiosFullListUrl').text().replace('&amp;', '&'), '_blank'); });
	$('img').error(function() { $(this).attr('src', 'images/empty.jpeg'); });
	Date.prototype.format   = function(mask, utc) { return dateFormat(this, mask, utc); };
	Date.prototype.addHours = function(h)         { this.setHours(this.getHours()+h); return this; }
	$(document).on('submit','form[name=scheduleDowntime]', function() { return false; });
	$(document).on('submit','form[name="acknowledge"]',    function() { return false; });

	$(document).on('click', '.more-info-icon', function() {
		$('#serviceDialog').text($(this).closest('tr').find('.status_information').text());
		$('#serviceDialog').dialog({
			modal:    true,
			width:    300,
			position: { my: "center top", at: "center top+200"},
			close:    function(event, ui) { $(this).dialog('close').dialog('destroy'); }
		});
		
		return false;
	});
	$(document).on('click', '.more-comment-icon', function() {
		var info = (Search.currentTab == 'acked') ? $(this).closest('tr').find('.comment .ack').html() : $(this).closest('tr').find('.comment .sched').html() ;
		$('#commentDialog').html(info);
		$('#commentDialog').dialog({
			modal:    true,
			width:    300,
			position: { my: "center top", at: "center top+200"},
			close:    function(event, ui) { $(this).dialog('close').dialog('destroy'); }
		});
		
		return false;
	});
	$(document).on('click', '.button-more', function() {
		var tr         = $(this).closest('tr'),
			tmpHost    = (tr.find('.host a').text()) ? tr.find('.host a').text() : tr.find('.host span:first').text(),
			tmpService = (tr.find('.service .service-name').text()) ? tr.find('.service .service-name').text() : tr.find('.service li:first').text(),
			tmpName    = tmpHost + ' ' + tmpService;
		
		Search.hideMoreArray.push(tmpName.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase());
		Search.showMoreMobile(tr);
		
		return false;
	});
	$(document).on('click', '.button-more-hide', function() {
		var tr = $(this).closest('tr');
		
		Search.hideMoreMobile(tr);
		
		return false;
	});
	$(window).resize(function(){
		Search.hideMoreMobile(false);
		if ($(window).width() > 560) {
			$('.comment').toggle(Search.currentTab == 'acked' || Search.currentTab == 'sched');
			$('.comment span.ack').toggle(Search.currentTab == 'acked');
			$('.comment span.sched').toggle(Search.currentTab == 'sched');
		} else {
			$('.comment').hide();
		}
		
		$('.icons.quickAck, .icons.quickUnAck').closest('li').toggle(Search.currentTab != 'acked' && Search.currentTab != 'sched');
		$('.quickAckUnAckIcon').closest('li').toggle(Search.currentTab != 'acked' && Search.currentTab != 'sched');
		$('.status .downtime_id').toggle(Search.currentTab == 'sched');
		$('.service .list-downtime-icon').closest('li').toggle(Search.currentTab != 'sched');
		$('.service .list-unack-icon').closest('li').toggle(Search.currentTab != 'acked');
	})

	
	function unSchedule(type, element) {
		var button  = element,
			request = [],
			ids     = [],
			group   = '';
		
		if (type == 'all') {
			var groupNames = [];
			
			$('#mainTable tr').each(function() {
				var down_id = $(this).find('.service .unScheduleIt').attr('data-id'),
					isHost  = $(this).find('.host a').attr('data-host');
					
				if (down_id && ids.indexOf(down_id) === -1) {
                    request.push({ 'down_id': down_id, 'isHost': isHost });
					ids.push(down_id);
                }
			});
			
			$('#mainTable thead tr').each(function() {
				var attr = $(this).attr('data-group');
				
				if (attr && groupNames.indexOf(attr) === -1) {
					groupNames.push(attr);
				}
			});
			
			for (var a = 0; a < groupNames.length; a++) {
                if (Search.allHeaderRows[Search.currentTab + '_' + groupNames[a] + '_rows'].length) {
					var headerRows = Search.allHeaderRows[Search.currentTab + '_' + groupNames[a] + '_rows'];
					
					for (var i = 0; i < headerRows.length; i++) {
						var down_id = headerRows[i].find('.service [data-id]').attr('data-id'),
							isHost  = headerRows[i].find('.host a').attr('data-host');
							
							
						if (down_id && ids.indexOf(down_id) === -1) {
							request.push({ 'down_id': down_id, 'isHost': isHost });
							ids.push(down_id);
						}
					}
				}
            }
			
			$('#mainTable tr').find('.service .unScheduleIt').css('visibility', 'hidden');
			$('#mainTable tr').find('.service .unScheduleItGroup').css('visibility', 'hidden');
		}
		else if (type == 'group') {
			var attr = button.closest('tr').attr('data-group');
			
			if (Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'].length) {
				var headerRows = Search.allHeaderRows[Search.currentTab + '_' + attr + '_rows'];
					
				for (var i = 0; i < headerRows.length; i++) {
					var down_id = headerRows[i].find('.service [data-id]').attr('data-id'),
						isHost  = headerRows[i].find('.host a').attr('data-host');
							
							
					if (down_id && ids.indexOf(down_id) === -1) {
						request.push({ 'down_id': down_id, 'isHost': isHost });
						ids.push(down_id);
					}
				}
			}
			
			group = attr;
			
			$('#mainTable thead tr[data-group="' + attr + '"]').find('.service .unScheduleIt').css('visibility', 'hidden');
			$('#mainTable thead tr[data-group="' + attr + '"]').find('.service .unScheduleItGroup').css('visibility', 'hidden');
		}
		else {
			var rows     = button.closest('tr'),
				down_id  = rows.find('.service .unScheduleIt').attr('data-id'),
				isHost   = rows.find('.host a').attr('data-host'),
				hasGroup = rows.attr('data-group');
					
			if (down_id && ids.indexOf(down_id) === -1) {
                request.push({ 'down_id': down_id, 'isHost': isHost });
				ids.push(down_id);
            }
			
			if (hasGroup) {
                group = hasGroup;
            }
		}
		
		button.css('visibility', 'hidden');
		
		$.ajax({
			url:    'post.php',
			method: 'POST',
			data:   { data: request, 'type': 'downtime' },
		})
		.fail(function(jqXHR, textStatus) {
			console.log( "Request failed: " + textStatus + ' - ' + jqXHR );
			
			if (type == 'all') {
				rows.find('.service .unScheduleIt').removeAttr('style');
			}
			
			if (type == 'group') {
				$('#mainTable thead tr[data-group="'+ group +'"]:not(:last-child) .service .unScheduleIt').removeAttr('style');
			}
			button.css('visibility', 'visible');
		})
		.done(function() {
			button.removeAttr('style');
			
			var countOK    = 0,
				countTotal = 0;
				
			if (type == 'all') {
				var groupNames = [];
				
				$('#mainTable tbody tr').each(function() {
					var status = $(this).find('td.status').text();
					
					if (status == 'OK') {
                        countOK++;
                    }
					countTotal++;
					
					$(this).remove();
				});
				
				$('#mainTable thead tr').each(function() {
					var attr = $(this).attr('data-group');
					
					if (attr && groupNames.indexOf(attr) === -1) {
						groupNames.push(attr);
					}
					
					$(this).remove();
				});
                
				for (var a = 0; a < groupNames.length; a++) {
					if (Search.allHeaderRows[Search.currentTab + '_' + groupNames[a] + '_rows'].length) {
						var headerRows = Search.allHeaderRows[Search.currentTab + '_' + groupNames[a] + '_rows'];
						
						for (var i = 0; i < headerRows.length; i++) {
							var status = headerRows[i].find('td.status').text();
							
							if (status == 'OK') {
								countOK++;
							}
							countTotal++;
						}
					}
				}
				
				Search.allHeaderRows = {};
				
				$('#radio label[for="sched"] em').text('0');
				$('#radio label[for="normal"] em').text(parseInt($('#radio label[for="normal"] em').text()) + countTotal - countOK);
            }
			else if (type == 'group') {
				var row   = $('#mainTable thead tr[data-group="' + group + '"]:first'),
					count = parseInt(row.find('td.host span:first').text());
					
				$('#radio label[for="sched"] em').text(parseInt($('#radio label[for="sched"] em').text()) - count);
				
				if (row.find('td.status').text() != 'OK') {
                    $('#radio label[for="normal"] em').text(parseInt($('#radio label[for="normal"] em').text()) + count);
                }
				
				$('#mainTable thead tr[data-group="' + group + '"]').remove();
			}
			else {
				if (!group) {
                    var row = $('#mainTable tbody tr [data-id="' + ids[0] + '"]').closest('tr');
					
					$('#radio label[for="sched"] em').text(parseInt($('#radio label[for="sched"] em').text()) - 1);
					
					if (row.find('td.status').text() != 'OK') {
                        $('#radio label[for="normal"] em').text(parseInt($('#radio label[for="normal"] em').text()) + 1);
                    }
					
					row.remove();
                } else {
					var row    = $('#mainTable thead tr [data-id="' + ids[0] + '"]').closest('tr'),
						count  = parseInt($('#mainTable thead tr[data-group="' + group + '"]:first td.host span:first').text());
						
					$('#mainTable thead tr[data-group="' + group + '"]:first td.host span:first').text(count - 1);
					$('#radio label[for="sched"] em').text(parseInt($('#radio label[for="sched"] em').text()) - 1);
					
					if (row.find('td.status').text() != 'OK') {
                        $('#radio label[for="normal"] em').text(parseInt($('#radio label[for="normal"] em').text()) + 1);
                    }
					
					row.remove();
					
					if (Search.allHeaderRows[Search.currentTab + '_' + group + '_rows'].length) {
						var headerRows = Search.allHeaderRows[Search.currentTab + '_' + group + '_rows'];
						
						for (var i = 0; i < headerRows.length; i++) {
							var rowId = parseInt(headerRows[i].find('[data-id]').attr('data-id'));
							
							if (rowId == ids[0]) {
                                Search.allHeaderRows[Search.currentTab + '_' + group + '_rows'].splice(i, 1);
                            }
						}
					}
				}
			}
			
			setTimeout(function(){ localStorage.setItem('canceledReloads', '0'); Search.startReloads(); }, 5000);
			quickAckUnAckGroup();
		});
	}
	$('#mainTable').on('click', '.unScheduleIt', function() {
		Search.stopReloads(true);
		
		unSchedule('this', $(this));
	});
	$('#mainTable').on('click', '.unScheduleItGroup', function() {
		Search.stopReloads(true);
		
		unSchedule('group', $(this));
		
		return false;
	});	
	$(document).on('click', '#unScheduleIt_button', function() {
		Search.stopReloads(true);
		
		unSchedule('all', $(this));
	});
	

	setInterval(function() {
		var currentTime = (new Date()).getTime();
		if (currentTime > (lastTime + 300000)) {
			Search.stopReloads();
			Search.startReloads();
		}
		lastTime = currentTime;
	}, 2000);
	
	$.getScript('js/datetimepicker.min.js');
	
	$(document).on('copy', function(e) {
		$('td.status_information').css('width', '200px');
		setTimeout(function() { $('td.status_information').removeAttr('style') });
	});
}

function getParameterByName (name) {
    name        = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex   = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
		
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

$.stopPendingAjax = (function() {
	var id = 0, Q = {};

	$(document).ajaxSend(function(e, jqx, settings){
		if (settings.url != 'planned.php') {
            jqx._id = ++id;
			Q[jqx._id] = jqx;
        }
	});
	$(document).ajaxComplete(function(e, jqx, settings){
		if (settings.url != 'planned.php') {
			delete Q[jqx._id];
		}
	});
	return {
		abortAll: function(stop){
			var r = [];
			$.each(Q, function(i, jqx){
				r.push(jqx._id);
				jqx.abort();
			});
			if (stop) {
                localStorage.setItem('canceledReloads', '1');
            }
			
			return r;
		}
	};
})();

$.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
	if (data.join(' ').search((Search.currentTab == 'EMERGENCY') ? Search.currentTab : '__' + Search.currentTab + '__') >= 0) {
		return true;
    }
	
	return false;
});
$.fn.dataTable.ext.errMode = 'none';

$('#mainTable').on('error.dt', function(e, settings, techNote, message) {
	if (techNote == 7) {
		$('#loading, #infoHolder').hide();
		$('#noData').show();
    }
})

function getSelectedText() {
    if (window.getSelection) {
        return window.getSelection().toString();
    } else if (document.selection) {
        return document.selection.createRange().text;
    }
    return '';
}

/* dateFormat */
var dateFormat = function () {
	var	token        = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone     = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad          = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		mask = String(dF.masks[mask] || mask || dF.masks["default"]);

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var	_ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();
// Some common format strings
dateFormat.masks = {
	"default":      "ddd mmm dd yyyy HH:MM:ss",
	shortDate:      "m/d/yy",
	mediumDate:     "mmm d, yyyy",
	longDate:       "mmmm d, yyyy",
	fullDate:       "dddd, mmmm d, yyyy",
	shortTime:      "h:MM TT",
	mediumTime:     "h:MM:ss TT",
	longTime:       "h:MM:ss TT Z",
	isoDate:        "yyyy-mm-dd",
	isoTime:        "HH:MM:ss",
	isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
	isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};
// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};
	
	
	
/*!
 * Tinycon - A small library for manipulating the Favicon
 * Tom Moor, http://tommoor.com
 * Copyright (c) 2015 Tom Moor
 * @license MIT Licensed
 * @version 0.6.4
 */
!function(){var a={},b=null,c=null,d=null,e=null,f={},g=window.devicePixelRatio||1,h=16*g,i={width:7,height:9,font:10*g+"px arial",colour:"#ffffff",background:"#F03D25",fallback:!0,crossOrigin:!0,abbreviate:!0},j=function(){var a=navigator.userAgent.toLowerCase();return function(b){return-1!==a.indexOf(b)}}(),k={ie:j("msie"),chrome:j("chrome"),webkit:j("chrome")||j("safari"),safari:j("safari")&&!j("chrome"),mozilla:j("mozilla")&&!j("chrome")&&!j("safari")},l=function(){for(var a=document.getElementsByTagName("link"),b=0,c=a.length;c>b;b++)if((a[b].getAttribute("rel")||"").match(/\bicon\b/))return a[b];return!1},m=function(){for(var a=document.getElementsByTagName("link"),b=document.getElementsByTagName("head")[0],c=0,d=a.length;d>c;c++){var e="undefined"!=typeof a[c];e&&(a[c].getAttribute("rel")||"").match(/\bicon\b/)&&b.removeChild(a[c])}},n=function(){if(!c||!b){var a=l();c=b=a?a.getAttribute("href"):"/favicon.ico"}return b},o=function(){return e||(e=document.createElement("canvas"),e.width=h,e.height=h),e},p=function(a){if(a){m();var b=document.createElement("link");b.type="image/x-icon",b.rel="icon",b.href=a,document.getElementsByTagName("head")[0].appendChild(b)}},q=function(a,b){if(!o().getContext||k.ie||k.safari||"force"===f.fallback)return r(a);var c=o().getContext("2d"),b=b||"#000000",e=n();d=document.createElement("img"),d.onload=function(){c.clearRect(0,0,h,h),c.drawImage(d,0,0,d.width,d.height,0,0,h,h),(a+"").length>0&&s(c,a,b),t()},!e.match(/^data/)&&f.crossOrigin&&(d.crossOrigin="anonymous"),d.src=e},r=function(a){if(f.fallback){var b=document.title;"("===b[0]&&(b=b.slice(b.indexOf(" "))),(a+"").length>0?document.title="("+a+") "+b:document.title=b}},s=function(a,b,c){"number"==typeof b&&b>99&&f.abbreviate&&(b=u(b));var d=(b+"").length-1,e=f.width*g+6*g*d,i=f.height*g,j=h-i,l=h-e-g,m=16*g,n=16*g,o=2*g;a.font=(k.webkit?"bold ":"")+f.font,a.fillStyle=f.background,a.strokeStyle=f.background,a.lineWidth=g,a.beginPath(),a.moveTo(l+o,j),a.quadraticCurveTo(l,j,l,j+o),a.lineTo(l,m-o),a.quadraticCurveTo(l,m,l+o,m),a.lineTo(n-o,m),a.quadraticCurveTo(n,m,n,m-o),a.lineTo(n,j+o),a.quadraticCurveTo(n,j,n-o,j),a.closePath(),a.fill(),a.beginPath(),a.strokeStyle="rgba(0,0,0,0.3)",a.moveTo(l+o/2,m),a.lineTo(n-o/2,m),a.stroke(),a.fillStyle=f.colour,a.textAlign="right",a.textBaseline="top",a.fillText(b,2===g?29:15,k.mozilla?7*g:6*g)},t=function(){o().getContext&&p(o().toDataURL())},u=function(a){for(var b=[["G",1e9],["M",1e6],["k",1e3]],c=0;c<b.length;++c)if(a>=b[c][1]){a=v(a/b[c][1])+b[c][0];break}return a},v=function(a,b){var c=new Number(a);return c.toFixed(b)};a.setOptions=function(a){f={};for(var b in i)f[b]=a.hasOwnProperty(b)?a[b]:i[b];return this},a.setImage=function(a){return b=a,t(),this},a.setBubble=function(a,b){return a=a||"",q(a,b),this},a.reset=function(){p(c)},a.setOptions(i),"function"==typeof define&&define.amd?define(a):"undefined"!=typeof module?module.exports=a:window.Tinycon=a}();


