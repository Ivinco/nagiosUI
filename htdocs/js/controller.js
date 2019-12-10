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
if (!localStorage.getItem('currentServerTab')) {
    localStorage.setItem('currentServerTab', 'All');
}
if (!localStorage.getItem('searchValue')) {
    localStorage.setItem('searchValue', '');
}

var tmpTab    = localStorage.getItem('currentTabNew'),
	tmpReload = localStorage.getItem('currentReloadNew'),
    tmpServer = localStorage.getItem('currentServerTab'),
	tmpGroup  = localStorage.getItem('currentGroup'),
	tmpsearchValue = localStorage.getItem('searchValue');
	
localStorage.clear();
localStorage.setItem('currentTabNew', tmpTab);
localStorage.setItem('currentReloadNew', tmpReload);
localStorage.setItem('currentGroup', tmpGroup);
localStorage.setItem('canceledReloads', '0');
localStorage.setItem('currentServerTab', tmpServer);
localStorage.setItem('searchValue', tmpsearchValue);

lastTime = (new Date()).getTime();
globalTime = 0;
globalReload = true;

Search = {
    serversList: '',
    drawTabsList: function() {
        var tabsList = '';
        var tabsData = this.serversList.split(',');

        $(tabsData).each(function (key, value) {
            var selected = (Search.currentServerTab == value) ? 'selected="selected"' : '';

            tabsList += '<option value="'+ value +'" '+ selected +'>Server: '+ value +'</option>';
        });

        $('#tabsSelect').html(tabsList);
        $('#tabsSelect').selectmenu({
            select: function (event, data) {
                if (Search.currentServerTab != data.item.value) {
                    Search.currentServerTab = data.item.value;
                    localStorage.setItem('currentServerTab', Search.currentServerTab);
                    $('#tabs select option[value="'+ Search.currentServerTab +'"]').attr('selected', 'selected');
                    $('#tabsSelect').selectmenu('refresh');

                    Search.getNewData();
                }
            }
        });
    },
}

Search.whatWeChangeObject      = [{}];
Search.whatWeChangeDataObject  = [{}];
Search.hideMoreArray           = [];
Search.currentTab              = localStorage.getItem('currentTabNew');
Search.currentGroup            = localStorage.getItem('currentGroup');
Search.currentReload           = localStorage.getItem('currentReloadNew');
Search.currentServerTab        = localStorage.getItem('currentServerTab');
Search.reloadCustomText        = 'Refresh: Custom';
Search.autoRefresh             = true;
Search.backgroundReload        = true;
Search.firstLoad               = true;
Search.tableLength             = 0;
Search.doneTypingInterval      = 0;
Search.recheckButtonId         = 'recheckIt_button';
Search.quickAckButtonId        = 'quickAck_button';
Search.quickUnAckButtonId      = 'quickUnAck_button';
Search.ackButtonId             = 'acknowledgeIt_button';
Search.unackButtonId      = 'unAck_button';
Search.sdButtonId         = 'scheduleIt_button';
Search.commentsDate       = '';
Search.lastUpdateAgo      = 0;
Search.editComment        = false;
Search.startedGetData     = false;
Search.editCommentText    = '';
Search.submitDialogButton = true;
Search.plannedTimer       = null;
Search.filterButtons      = '#'+ Search.recheckButtonId +', #'+ Search.ackButtonId +', #'+ Search.sdButtonId +', #'+ Search.quickAckButtonId +', #'+ Search.quickUnAckButtonId +', #'+ Search.unackButtonId + ', #unScheduleIt_button, #unAcknowledgeIt_button';
Search.orderBy = {
    'normal'        : [[3,'desc'],[5,'desc']],
    'acked'         : [[2, 'asc'],[1, 'asc']],
    'sched'         : [[2, 'asc'],[1, 'asc']],
    'hosts'         : [[1,'asc']],
    'EMERGENCY'     : [[3,'desc'],[5,'desc']],
    'planned'       : [[3,'desc'],[5,'desc']],
};
Search.changeNagiosComment = function(comment) {
    var replacedText, replacePattern1, replacePattern2;

    replacePattern1 = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = comment.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    return replacedText;
}
Search.allDataTable       = (getParameterByName('t')) ? false : $('#mainTable').DataTable({
		'paging':      false,
		'ordering':    true,
		'order':       Search.orderBy[Search.currentTab],
        'ajax': {
            url: 'json_new.php?server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue'),
            dataFilter: function(data){
                var tabsArray = ['normal', 'acked', 'sched'];

                if (parseInt(Search.currentGroup) && tabsArray.indexOf(Search.currentTab) !== -1) {
                    var json = $.parseJSON(data);

                    return JSON.stringify({
                        additional: json.additional,
                        data: Grouping.setInfo(json)
                    });
                } else {
                    Grouping.clearData();

                    return data;
                }
            }
        },
		'deferRender': true,
		'processing':  false,
        'serverSide':  true,
		'columns':     [
            {
                data:      'abbreviation',
                className: 'abb',
                render: function (data, type, full, meta) {
                    return '<span title="'+ data.name +'">'+ data.abb +'</span>';
                },
            },
            {
				data:      'host',
				className: 'host',
				render: function ( data, type, full, meta ) {
					return '<a data-tab="'+ data.tab +'" data-host="'+ data.host +'" href="'+ data.url +'" target="_blank">'+ data.name +'</a><span class="hide-more"><br /><span class="more-info-icon"></span><span class="more-comment-icon"></span></span>';
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
							pAuth = (data.pAuth)           ? '<img class="icons" src="https://www.gravatar.com/avatar/'+ data.pAuth +'?size=20" width="19" height="19" />' : '';
							qAck  = (data.qAck && !pAuth)  ? '<span class="list-qack-icon icons quickAck" alt="Quick Acknowledge" title="Quick Acknowledge"></span></li>' : '',
							qUAck = (data.qUAck && !pAuth) ? '<img class="icons quickUnAck" src="https://www.gravatar.com/avatar/'+ data.qUAck +'?size=20" width="19" height="19" alt="'+ data.qAuth +' unack" title="'+ data.qAuth +' unack" />' : '',
							ack   = '<li><span class="list-ack-icon icons acknowledgeIt" alt="Acknowledge this Service" title="Acknowledge this Service"></span></li>',
							sched = (data.schedPlanned) ? '<li><span class="list-sched-icon icons scheduleIt" data-id="'+ data.downId +'" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></span></li>' : '';

						if (data.pending) {
                            return '' +
                                '<div class="likeTable">' +
                                '	<ul>' +
                                '		<li><a href="'+ data.url +'" class="service-name">'+ data.name +'</a></li>' +
                                '		<li><span class="list-recheck-icon icons recheckIt" alt="Refresh Service Status" title="Refresh Service Status"></span></li>' +
                                notes  +
                                '	</ul>' +
                                '</div>';
						}

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
                data:      'duration',
                className: 'duration',
                render: {
                    _:     'name',
                    sort:  'order',
                    type:  'num',
                    display: function ( data, type, full, meta ) {
                        if (Search.currentTab == 'sched') {
                            return '<span title="Check triggered" style="cursor: pointer;">' + data.name + '</span><br /><span title="Remaining downtime" style="cursor: pointer;">' + data.end + '</span>';
                        }

                        return data.name;
                    },
                },
			},
            {
                data:      'info',
                className: 'status_information main',
                render: function ( data, type, full, meta ) {
                    if (data.pending) {
                        return 'Scheduled: ' + moment.unix(data.next).format('YYYY-MM-DD hh:mm:ss');
                    }

                    if (data.planned && Search.currentTab == 'normal') {
                        var hide = (data.comment) ? '' : 'display:none;',
                            comment = '<p style="margin:0;'+ hide +'">Comment: <span>' + data.comment + '</span></p>',
                            commentEdit = (data.schedPlanned) ? ('<li class="planned"><em class="edit_planned_comment" data-command="'+ encodeURIComponent(data.command) +'" alt="Edit comment" title="Edit comment"></em></li>') : '';

                        return '' +
                            '<div class="likeTable">' +
                            '	<ul>' +
                            '		<li class="planned text">' + comment + data.name + '</li>' +
                            '		' + commentEdit +
                            '	</ul>' +
                            '</div>'
                            ;
                    }

                    return data.name;
                },
            },
			{
				data:      'comment',
				className: 'comment',
				render: function ( data, type, full, meta ) {
					var showEdit = (data.schedPlanned) ? '<li class="sched"><em class="edit_scheduleIt" alt="Edit comment" title="Edit comment"></em></li>' : '';
					return  '' +
							'<div class="likeTable">' +
							'	<ul>' +
							'		<li class="ack text">' + data.ack + '</li>' +
							'		<li class="ack"><em class="edit_acknowledgeIt" alt="Edit comment" title="Edit comment"></em></li>' +
							'		<li class="sched text" data-start="'+ data.start +'" data-end="'+ data.end +'" data-duration="'+ data.duration +'">' + data.sched + '</li>' +
									showEdit +
							'	</ul>' +
							'</div>'
					;
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
			},
        ],
		'createdRow': function(row, data, index) {
			if (data.state) {
				$(row).find('.service, .status, .last_check, .duration, .status_information, .comment, .more').addClass(data.state);
            }
            if (data.status.origin) {
                $(row).find('.status').addClass(data.status.origin);
            }
			if (data.service.sched) {
				$(row).find('.host, .service, .status, .last_check, .duration, .status_information, .comment, .more').addClass('grey-text');
			}
			if (data.service.info && (data.state == 'WARNING' || data.state == 'UNKNOWN')) {
				$(row).find('.host, .service, .status, .last_check, .duration, .status_information, .comment, .more').addClass('blue-text');
			}
			if (data.service.info && data.state == 'CRITICAL') {
				$(row).find('.host, .service, .status, .last_check, .duration, .status_information, .comment, .more').addClass('brown-text');
			}

			$(row).attr('data-service', data.service.original);
        },
		"drawCallback": function( settings ) {
            showNoData();
            var colspan = (Search.currentTab == 'normal' || Search.currentTab == 'hosts') ? 6 : 7;

            Grouping.drawGrouping();
            $('#mainTable tbody .dataTables_empty').attr('colspan', colspan);

			Search.filterDataTable(localStorage.getItem('searchValue'));
			Search.countRecords();
			$('#infoHolder').show();
			$('#noData, #loading').hide();
            $('#mainTable').show();
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

                Search.serversList = json.additional.tabsList;
                Search.drawTabsList(json.additional.tabsList);
                Planned.getPlanned();

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
                $('#alerts').prop('checked', true);
                $('#radio-switch').buttonset();
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

Search.stopReloads = function(stop) {
	$.stopPendingAjax.abortAll(stop);
	if (typeof reloadTimer !== 'undefined') {
        clearTimeout(reloadTimer);
	}
	Search.backgroundReload = false;
	Search.autoRefresh      = false;
	Search.startedGetData   = false;
    globalReload            = false;
}
Search.startReloads = function() {
	if (localStorage.getItem('canceledReloads') == '0') {
        if (Search.currentReload == 'auto') {
			reloadTimer             = setTimeout(function () { Search.getContent(); }, ((Search.tableLength > 1000) ? 15000 : ((Search.tableLength > 200) ? 7000 : 3000)));
			Search.backgroundReload = true;
		} else {
			reloadTimer        = setTimeout(function () { Search.autoReloadData(); }, Search.currentReload*1000);
			Search.autoRefresh = true;
		}
    }

    globalReload = true;
}
Search.getContent = function() {
    if (Search.backgroundReload && !Search.startedGetData && Search.updateHash) {
        Search.startedGetData = true;
        $.ajax({
            type:    'GET',
            url:     'update.php',
            data:    {'hash' : Search.updateHash, 'server_tab': Search.currentServerTab},
            success: function(data){
                Search.resetAgo();
                Search.stopReloads();
                Search.updateHash = data;
                Search.allDataTable.ajax.reload();
                Search.startedGetData = true;
                setTimeout(function () {
                    Search.startReloads();
                }, ((Search.tableLength > 1000) ? 15000 : ((Search.tableLength > 200) ? 7000 : 3000)));
            },
            error: function() {
                if (!Search.updateHash) {
                    location.reload();
                } else {
                    setTimeout(function () {
                        Search.startReloads();
                    }, 3000);
                }
            },
        });
    }
}
Search.autoReloadData = function() {
	if (Search.autoRefresh) {
        $.stopPendingAjax.abortAll(stop);
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

    $('#mainTable tbody td.status_information .likeTable .planned.text span').each(function() {
        $(this).html(Search.changeNagiosComment($(this).text()));
    });

    $(".ui-tooltip").remove();
    $("span[title]").tooltip({ track: true });

	Search.tableLength = Search.allDataTable.rows({ page:'current', search:'applied' }).count();
	Search.ajaxData    = Search.allDataTable.ajax.json().additional;

	Search.extension();
	Search.emptyHosts();

	if ($(window).width() > 560) {
		$('.comment').toggle(Search.currentTab == 'acked' || Search.currentTab == 'sched');
		$('.comment .ack').toggle(Search.currentTab == 'acked');
		$('.comment .sched').toggle(Search.currentTab == 'sched');
	} else {
		$('.comment').hide();
	}

    $('.service').toggle(Search.currentTab != 'hosts');

	Search.recheckIcons();
	Search.drawTinycon();

	if (startReload) {
		Search.startReloads();
	}

    Search.startedGetData = false;
    Search.backgroundReload = true;
    Search.getContent();
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

            if (d && d.type.search('__sched__') > -1) {
                $(this).find('.service .scheduleIt').attr('title', 'Unschedule Downtime for this Service').attr('alt', 'Unschedule Downtime for this Service').removeClass('scheduleIt').addClass('unScheduleIt');
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
	if (localStorage.getItem('searchValue') && Search.tableLength && !$('#ext_search').length) {
		$('#mainTable_filter').after('<div id="ext_search"></div>');
		$('#ext_search').append('<span id="'+ Search.quickAckButtonId +'" class="list-qack-icon" alt="Quick Acknowledge All" title="Quick Acknowledge All"></span>');
		$('#ext_search').append('<img id="'+ Search.quickUnAckButtonId +'" src="https://www.gravatar.com/avatar/'+ Search.avatarUrl +'?size=20" width="19" height="19" alt="Quick UnAcknowledge All" title="Quick Unacknowledge All">');
		$('#ext_search').append('<span id="'+ Search.ackButtonId +'" class="list-ack-icon" alt="Acknowledge All Services" title="Acknowledge All Services"></span>');
		$('#ext_search').append('<span id="'+ Search.sdButtonId +'" class="list-sched-icon" alt="Schedule Downtime for All Services" title="Schedule Downtime for All Services"></span>');
		$('#ext_search').append('<span id="'+ Search.recheckButtonId +'" class="list-recheck-icon" alt="Refresh Services Status" title="Refresh Services Status"></span>');
		$('#ext_search').append('<span id="edit_acknowledge" class="list-edit-icon" alt="Edit comment" title="Edit comment"></span>');
		$('#ext_search').append('<span id="edit_scheduled" class="list-edit-icon" alt="Edit comment" title="Edit comment"></span>');
	}
	Search.extensionVisibility();
}
Search.extensionVisibility = function () {
	if (localStorage.getItem('searchValue') && Search.tableLength) {
		$(Search.filterButtons).show();

		var subRowsBlue    = $('#mainTable tbody tr .host.blue-text').length,
			subRowsBrown   = $('#mainTable tbody tr .host.brown-text').length;

		(Search.currentTab != 'acked' && Search.currentTab != 'sched' && $('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck:not([src*="'+ Search.avatarUrl +'"])').length) ? $('#'+ Search.quickAckButtonId).show() : $('#'+ Search.quickAckButtonId).hide();
		(Search.currentTab != 'acked' && Search.currentTab != 'sched' && $('#mainTable tbody .icons.quickUnAck').length) ? $('#'+ Search.quickUnAckButtonId).show() : $('#'+ Search.quickUnAckButtonId).hide();
		$('#edit_acknowledge').toggle(Search.currentTab == 'acked');
		$('#edit_scheduled').toggle(Search.currentTab == 'sched');

		if ((subRowsBlue + subRowsBrown) == Search.tableLength) {
            $('#' + Search.ackButtonId).hide();
			$('#' + Search.sdButtonId).hide();
        } else {
			$('#' + Search.ackButtonId).show();
			$('#' + Search.sdButtonId).show();
		}
	}
	else {
		$(Search.filterButtons + ', #edit_acknowledge, #edit_scheduled').hide();
	}
}
Search.addDialog = function() {
	var dialog = '';
	dialog += '<div id="dialog" title="Schedule Downtime">'
	dialog += '  <p class="validateTips">All form fields are required.</p>';
	dialog += '  <form name="scheduleDowntime">';
	dialog += '    <fieldset>';
	dialog += '      <table style="width: 100%">';
    dialog += '			<tr>';
    dialog += '				<td class="sched_label_col"><label for="sched_permanent">Permanent</label></td>';
    dialog += '				<td class="sched_sublabel_col">&nbsp;</td>';
    dialog += '        		<td class="sched_input_col"><input type="checkbox" name="sched_permanent" id="sched_permanent" value="enabled"></td>';
    dialog += '      	</tr>';
	dialog += '			<tr>';
	dialog += '				<td class="sched_label_col"><label for="sched_interval_extension">Interval, hours</label></td>';
	dialog += '				<td class="sched_sublabel_col">&nbsp;</td>';
	dialog += '        		<td class="sched_input_col"><input type="text" name="sched_interval_extension" id="sched_interval_extension" class="text ui-widget-content"></td>';
	dialog += '      	</tr>';
	dialog += '      	<tr>';
	dialog += '      		<td class="sched_label_col" rowspan="2"><label for="sched_comment_extension">Comment</label></td>';
	dialog += '        		<td class="sched_sublabel_col">Select</td>';
	dialog += '        		<td class="sched_input_col select-comment"><select name="comment_select"></select></td>';
	dialog += '      	</tr>';
	dialog += '      	<tr>';
	dialog += '        		<td class="sched_sublabel_col">Write</td>';
	dialog += '        		<td class="sched_input_col"><input type="text" name="sched_comment_extension" id="sched_comment_extension" class="text ui-widget-content"></td>';
	dialog += '      	</tr>';
	dialog += '			<tr>';
	dialog += '				<td class="sched_label_col"><label for="sched_finish_date_time">Finish date/time</label></td>';
	dialog += '				<td class="sched_sublabel_col">&nbsp;</td>';
	dialog += '        		<td class="sched_input_col"><input type="text" name="sched_finish_date_time" id="sched_finish_date_time" class="text ui-widget-content"></td>';
	dialog += '      	</tr>';
	dialog += '      </table>';
	dialog += '    </fieldset>';
	dialog += '  </form>';
	dialog += '</div>';
	dialog += '<div id="dialogAck" title="Acknowledge">'
	dialog += '  <p class="validateTips"></p>';
	dialog += '  <form name="acknowledge">';
	dialog += '    <fieldset>';
	dialog += '      <table style="width: 100%">';
	dialog += '			<tr>';
	dialog += '				<td class="ack_label_col" rowspan="2"><label for="ack_comment_extension">Comment</label></td>';
	dialog += '				<td class="ack_sublabel_col">Select</td>';
	dialog += '        		<td class="ack_input_col select-comment"><select name="comment_select"></select></td>';
	dialog += '      	</tr>';
	dialog += '			<tr>';
	dialog += '				<td class="ack_sublabel_col">Write</td>';
	dialog += '        		<td class="ack_input_col"><input type="text" name="ack_comment_extension" id="ack_comment_extension" class="text ui-widget-content"></td>';
	dialog += '      	</tr>';
	dialog += '      </table>';
	dialog += '    </fieldset>';
	dialog += '  </form>';
	dialog += '</div>';
	$('body').append(dialog);

	Search.addDialogJs();
}
Search.addDialogJs = function() {
	var windowWidth = ($(window).width() < 600) ? $(window).width() : 600;

	$('#dialog').dialog({
		autoOpen: false,
		modal:    true,
		width:    windowWidth,
		position: { my: "center center", at: "center top+200"},
		open:     function() {
						Search.getServerLocalTimeDialog();
						$('body').css("overflow", "hidden");
						$('#dialog .select-comment').hide();
						$('#sched_comment_extension').val((Search.editComment && Search.editCommentText) ? Search.editCommentText : '');
						if (Search.editComment) {
                            $('#sched_interval_extension').closest('tr').hide();
							$('#sched_finish_date_time').closest('tr').hide();
                            $('#sched_permanent').closest('tr').hide();
                        } else {
							$('#sched_interval_extension').closest('tr').show();
							$('#sched_finish_date_time').closest('tr').show();
                            $('#sched_permanent').closest('tr').show();
                            Search.permanentValues = {
                                'old': 0,
                                'new': 0,
							};
						}
						$('#sched_permanent').prop("checked", false);
		},
		close:    function() { Search.tempShowButtons(lastKeyValue); $('body').css("overflow", "auto"); Search.startedGetData = false; Search.backgroundReload = true; Search.getContent(); },
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
		width:    windowWidth,
		position: { my: "center center", at: "center top+200"},
		close:    function() { Search.tempShowButtons(lastKeyValue); $('body').css("overflow", "auto"); Search.startedGetData = false; Search.backgroundReload = true; Search.getContent(); },
		open:	  function() {
					$('body').css("overflow", "hidden");
					$('#ack_comment_extension').val((Search.editComment && Search.editCommentText) ? Search.editCommentText : '').focus();
					$('#dialogAck .select-comment').hide();
		},
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
Search.tempHideButtons = function (key) {
    Search.stopReloads(true);

    if (Search.whatWeChangeObject[key].what == 'group') {
        var attr        = (Search.whatWeChangeObject[key].service) ? Search.whatWeChangeObject[key].service.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase() : Search.whatWeChangeObject[key].host.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase(),
            returnArray = [],
            infoCheck   = false,
            dataKey     = Search.whatWeChangeObject[key].key,
            type        = Search.whatWeChangeObject[key].type,
            item        = Grouping.listGroups[dataKey].children;

        for (var i = 0; i < item.length; i++) {
            var checkInfo = (infoCheck) ? ((item[i].blueText || item[i].brownText) ? false : true) : true;

            if (checkInfo) {
                var host        = item[i].host,
                    service     = item[i].service,
                    check       = item[i].lastCheck,
                    isHost      = item[i].isHost,
                    original    = item[i].full.service.original,
                    downId      = item[i].full.service.down,
                    start       = item[i].full.comment.start,
                    end         = item[i].full.comment.end,
                    duration    = item[i].full.comment.duration;
                var tab = item[i].full.host.tab;

                returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
            }
        }

        $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type).hide();
        $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type + 'Group').hide();
    }
	else if (Search.whatWeChangeObject[key].what == 'all') {
		var returnArray = [],
			infoCheck   = false;

		$('#mainTable tbody tr').each(function() {
			var checkInfo = (infoCheck) ? (($(this).find('td.host').hasClass('blue-text') || $(this).find('td.host').hasClass('brown-text')) ? false : true) : true;
			if (checkInfo) {
				var row         = $(this),
					host        = Search.getHost(row),
					service     = Search.getService(row),
					check       = Search.getLastCheck(row),
					isHost      = row.find('.host a').attr('data-host'),
                    original    = row.attr('data-service'),
					downId      = (row.find('.unScheduleIt[data-id]').length) ? row.find('.unScheduleIt[data-id]').attr('data-id') : '',
					start       = (row.find('.comment .sched.text').attr('data-start')) ? row.find('.comment .sched.text').attr('data-start') : 0,
					end         = (row.find('.comment .sched.text').attr('data-end')) ? row.find('.comment .sched.text').attr('data-end') : 0,
					duration    = (row.find('.comment .sched.text').attr('data-duration')) ? row.find('.comment .sched.text').attr('data-duration') : 0;
                var tab = row.find('.host a').attr('data-tab');

				if (Search.whatWeChangeObject[key].host && Search.whatWeChangeObject[key].service) {
					if (host == Search.whatWeChangeObject[key].host && service == Search.whatWeChangeObject[key].service) {
						Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
						returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
					}
				} else if (Search.whatWeChangeObject[key].host) {
					if (host == Search.whatWeChangeObject[key].host) {
						Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
						returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
					}
				} else if (Search.whatWeChangeObject[key].service) {
					if (service == Search.whatWeChangeObject[key].service) {
						Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
						returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
					}
				} else {
					Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
					returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
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
                            original    = row.attr('data-service'),
							downId      = (row.find('.service [data-id]').length) ? row.find('.service [data-id]').attr('data-id') : 0,
							start       = (row.find('.comment .sched.text').attr('data-start')) ? row.find('.comment .sched.text').attr('data-start') : 0,
							end         = (row.find('.comment .sched.text').attr('data-end')) ? row.find('.comment .sched.text').attr('data-end') : 0,
							duration    = (row.find('.comment .sched.text').attr('data-duration')) ? row.find('.comment .sched.text').attr('data-duration') : 0;

						if (Search.whatWeChangeObject[key].host && Search.whatWeChangeObject[key].service) {
							if (host == Search.whatWeChangeObject[key].host && service == Search.whatWeChangeObject[key].service) {
								Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
								returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration });
							}
						} else if (Search.whatWeChangeObject[key].host) {
							if (host == Search.whatWeChangeObject[key].host) {
								Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
								returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration });
							}
						} else if (Search.whatWeChangeObject[key].service) {
							if (service == Search.whatWeChangeObject[key].service) {
								Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
								returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration });
							}
						} else {
							Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
							returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration });
						}
					}
				}
			}
        }
	}
	else {
		var returnArray = [],
			infoCheck   = false;

		$('#mainTable tbody tr').each(function() {
			var checkInfo = (infoCheck) ? (($(this).find('td.host').hasClass('blue-text') || $(this).find('td.host').hasClass('brown-text')) ? false : true) : true;
			if (checkInfo) {
				var row         = $(this),
					host        = Search.getHost(row),
					service     = Search.getService(row),
					check       = Search.getLastCheck(row),
					isHost      = row.find('.host a').attr('data-host'),
					original    = row.attr('data-service'),
					downId      = (row.find('.unScheduleIt[data-id]').length) ? row.find('.unScheduleIt[data-id]').attr('data-id') : '',
					start       = (row.find('.comment .sched.text').attr('data-start')) ? row.find('.comment .sched.text').attr('data-start') : 0,
					end         = (row.find('.comment .sched.text').attr('data-end')) ? row.find('.comment .sched.text').attr('data-end') : 0,
					duration    = (row.find('.comment .sched.text').attr('data-duration')) ? row.find('.comment .sched.text').attr('data-duration') : 0;
                var tab = row.find('.host a').attr('data-tab');

				if (Search.whatWeChangeObject[key].host && Search.whatWeChangeObject[key].service) {
					if (host == Search.whatWeChangeObject[key].host && service == Search.whatWeChangeObject[key].service) {
						Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
						returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
					}
				} else if (Search.whatWeChangeObject[key].host) {
					if (host == Search.whatWeChangeObject[key].host) {
						Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
						returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
					}
				} else if (Search.whatWeChangeObject[key].service) {
					if (service == Search.whatWeChangeObject[key].service) {
						Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
						returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
					}
				} else {
					Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
					returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
				}
			}
		});

		if (Search.whatWeChangeObject[key].what == 'this') {
			$('#mainTable thead tr').each(function() {
				var row         = $(this),
					host        = Search.getHost(row),
					service     = Search.getService(row),
					check       = Search.getLastCheck(row),
					isHost      = row.find('.host a').attr('data-host'),
                    original    = row.attr('data-service'),
					downId      = (row.find('.unScheduleIt[data-id]').length) ? row.find('.unScheduleIt[data-id]').attr('data-id') : '',
					start       = (row.find('.comment .sched.text').attr('data-start')) ? row.find('.comment .sched.text').attr('data-start') : 0,
					end         = (row.find('.comment .sched.text').attr('data-end')) ? row.find('.comment .sched.text').attr('data-end') : 0,
					duration    = (row.find('.comment .sched.text').attr('data-duration')) ? row.find('.comment .sched.text').attr('data-duration') : 0;
                var tab = row.find('.host a').attr('data-tab');

				if (Search.whatWeChangeObject[key].host && Search.whatWeChangeObject[key].service) {
					if (host == Search.whatWeChangeObject[key].host && service == Search.whatWeChangeObject[key].service) {
						Search.tmpHideIcon(row, Search.whatWeChangeObject[key].type);
						returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
					}
				}
			});
		}
	}

	Search.whatWeChangeDataObject[key] = returnArray;

	return true;
}
Search.prepareSendData = function (key) {
	var requestData = [];

	$(Search.whatWeChangeDataObject[key]).each(function() {
		if (Search.whatWeChangeObject[key].type == 'recheckIt') {
			requestData.push({
				'start_time':  $(this)[0].check,
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'isHost':      $(this)[0].isHost,
                'tab':         $(this)[0].tab,
			});
		}
		else if (Search.whatWeChangeObject[key].type == 'quickAck') {
			requestData.push({
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'com_data':    'temp',
				'author':      Search.currentUser,
				'isHost':      $(this)[0].isHost,
                'tab':         $(this)[0].tab,
			});
		}
		else if (Search.whatWeChangeObject[key].type == 'quickUnAck' || Search.whatWeChangeObject[key].type == 'unAck' || Search.whatWeChangeObject[key].type == 'unAcknowledgeIt') {
			requestData.push({
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'isHost':      $(this)[0].isHost,
                'tab':         $(this)[0].tab,
			});
		}
		else if (Search.whatWeChangeObject[key].type == 'acknowledgeIt') {
			requestData.push({
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'com_data':    $('input[name="ack_comment_extension"]').val(),
				'author':      Search.currentUser,
				'isHost':      $(this)[0].isHost,
                'tab':         $(this)[0].tab,
			});
		}
		else if (Search.whatWeChangeObject[key].type == 'scheduleIt') {
			if (Search.editComment) {
                var start    = $(this)[0].start,
					end      = $(this)[0].end,
					duration = $(this)[0].duration,
                    tab      = $(this)[0].tab;
            } else {
				var currentServerDate = $('#lastUpdated').html().replace(/UTC|EDT|C?EST|GMT/gi, ''),
					duration          = parseInt($('#timeShift').html(),10),
					start             = new Date(currentServerDate).format('mm-dd-yyyy HH:MM:ss'),
					end               = new Date(currentServerDate).addHours(duration).format('mm-dd-yyyy HH:MM:ss'),
                    tab               = $(this)[0].tab;
			}

			requestData.push({
				'hours':       duration,
				'start_time':  start,
				'end_time':    end,
				'host':        $(this)[0].host,
				'service':     $(this)[0].service,
				'com_data':    $('#downtimeComment').html(),
				'author':      Search.currentUser,
				'isHost':      $(this)[0].isHost,
				'downId':      $(this)[0].downId,
                'tab':         $(this)[0].tab,
			});
		}
	});

	if (Search.whatWeChangeObject[key].type == 'scheduleIt' && Search.editComment) {
		var schedulesRequest = [],
			scheduledIds     = [];

		for (var i = 0; i < requestData.length; i++) {
            var downId = requestData[i].downId,
				isHost = requestData[i].isHost;

			if (downId) {
                downId = downId.split(',');

				for (var y = 0; y < downId.length; y++) {
					if (scheduledIds.indexOf(downId[y]) === -1) {
						schedulesRequest.push({ 'down_id': downId[y], 'isHost': isHost });
						scheduledIds.push(downId[y]);
					}
				}
            }
        }

        $.ajax({
            url:    'post.php',
            method: 'POST',
            data:   { data: schedulesRequest, 'type': 'downtime', server: Search.currentServerTab },
        })
        .always(function() {
            $.ajax({
                url:    'post.php',
                method: 'POST',
                data:   { data: requestData, type: 'scheduleItTime', server: Search.currentServerTab },
            })
            .fail(function(jqXHR, textStatus) {
                alert("Request failed: " + textStatus + ' - ' + jqXHR.statusText + '. Try later.');
                Search.tempShowButtons(key);
            })
            .done(function() {
                Search.restoreAllData(key);
            });
        });
    }
    else if (Search.whatWeChangeObject[key].type == 'acknowledgeIt' || (Search.whatWeChangeObject[key].type == 'scheduleIt' && !Search.editComment)) {
        $.ajax({
            url:    'post.php',
            method: 'POST',
            data:   { data: requestData, type: Search.whatWeChangeObject[key].type, server: Search.currentServerTab },
        })
        .fail(function(jqXHR, textStatus) {
            alert("Request failed: " + textStatus + ' - ' + jqXHR.statusText + '. Try later.');
            Search.tempShowButtons(key);
        })
        .done(function() {
            Search.restoreAllData(key);
        });
    }
	else {
		$.ajax({
			url:    'post.php',
			method: 'POST',
			data:   { data: requestData, type: Search.whatWeChangeObject[key].type, server: Search.currentServerTab },
		})
		.fail(function(jqXHR, textStatus) {
			if (jqXHR.responseText == 'offline') {
                alert("Quick ack can't be set, because you're offline in Slack. Please try later.");
			} else {
                alert("Request failed: " + textStatus + ' - ' + jqXHR.statusText + '. Try later.');
			}

			Search.tempShowButtons(key);
		})
		.done(function() {
			Search.restoreAllData(key);
		});
	}
}
Search.restoreAllData = function(key) {
    var mainObj = Search.whatWeChangeObject[key];

    $.get($('#nagiosConfigFile').html(), function(data) {
        var regex       = new RegExp(/Last Updated:\s*([^<]+)/i),
            results     = regex.exec(data),
            pieces      = results[1].split(' '),
            time        = pieces[3].split(':'),
            commentDate = pieces[1] + ' ' + pieces[2] + ' ' + time[0] + ':' + time[1];

        if (mainObj.what == 'group') {
            if (mainObj.type == 'unAck' || mainObj.type == 'unAcknowledgeIt') {
                var count       = Grouping.listGroups[mainObj.key].children.length,
                    normalCount = parseInt($('#radio label[for="normal"] em').text()),
                    ackedCount  = parseInt($('#radio label[for="acked"] em').text());

                $('#radio label[for="normal"] em').text(normalCount + count);
                $('#radio label[for="acked"] em').text(ackedCount - count);

                delete Grouping.listGroups[mainObj.key];
            }
            else if (mainObj.type == 'acknowledgeIt' && !Search.editComment) {
                var count      = Grouping.listGroups[mainObj.key].children.length,
                    oldCount   = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
                    ackedCount = parseInt($('#radio label[for="acked"] em').text());

                $('#radio label[for="' + Search.currentTab + '"] em').text(oldCount - count);
                $('#radio label[for="acked"] em').text(ackedCount + count);

                delete Grouping.listGroups[mainObj.key];
            }
            else if (mainObj.type == 'scheduleIt' && !Search.editComment) {
                var count      = Grouping.listGroups[mainObj.key].children.length,
                    oldCount   = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
                    schedCount = parseInt($('#radio label[for="sched"] em').text());

                $('#radio label[for="' + Search.currentTab + '"] em').text(oldCount - count);
                $('#radio label[for="sched"] em').text(schedCount + count);

                delete Grouping.listGroups[mainObj.key];
            }
            else {
                for (var i = 0; i < Grouping.listGroups[mainObj.key].children.length; i++) {
                    if (mainObj.type == 'quickAck') {
                        Grouping.listGroups[mainObj.key].children[i].full.service.qUAck = Search.avatarUrl;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = false;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAuth = Search.currentUser;
                    }
                    else if (mainObj.type == 'quickUnAck') {
                        Grouping.listGroups[mainObj.key].children[i].full.service.qUAck = false;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAuth = false;
                    }
                    else if (mainObj.type == 'acknowledgeIt' && Search.editComment) {
                        var newComment = "'"+ $('input[name="ack_comment_extension"]').val() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;

                        if (Grouping.listGroups[mainObj.key].children[i].full.comment.ack) {
                            newComment = Grouping.listGroups[mainObj.key].children[i].full.comment.ack + '<br /><br />' + newComment;
                        }

                        Grouping.listGroups[mainObj.key].children[i].full.comment.ack   = newComment;
                        Grouping.listGroups[mainObj.key].children[i].full.service.unAck = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = true;
                    }
                    else if (mainObj.type == 'scheduleIt' && Search.editComment) {
                        var newComment  = "'"+ $('#downtimeComment').text() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;

                        if (Grouping.listGroups[mainObj.key].children[i].full.comment.sched) {
                            newComment = Grouping.listGroups[mainObj.key].children[i].full.comment.sched + '<br /><br />' + newComment;
                        }

                        Grouping.listGroups[mainObj.key].children[i].full.comment.sched = newComment;
                        Grouping.listGroups[mainObj.key].children[i].full.service.down  = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qUAck = false;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAuth = false;
                    }
                }
            }

            Grouping.redrawInfo();
        }
        else if (mainObj.what == 'this' && mainObj.key) {
            var deleteMainGroup = [];

            for (var i = 0; i < Grouping.listGroups[mainObj.key].children.length; i++) {
                var host    = Grouping.listGroups[mainObj.key].children[i].host,
                    service = Grouping.listGroups[mainObj.key].children[i].service;

                if (mainObj.host == host && mainObj.service == service) {
                    if (mainObj.type == 'quickAck') {
                        Grouping.listGroups[mainObj.key].children[i].full.service.qUAck = Search.avatarUrl;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = false;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAuth = Search.currentUser;
                    }
                    else if (mainObj.type == 'quickUnAck') {
                        Grouping.listGroups[mainObj.key].children[i].full.service.qUAck = false;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAuth = false;
                    }
                    else if (mainObj.type == 'acknowledgeIt' && Search.editComment) {
                        var newComment = "'"+ $('input[name="ack_comment_extension"]').val() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;

                        if (Grouping.listGroups[mainObj.key].children[i].full.comment.ack) {
                            newComment = Grouping.listGroups[mainObj.key].children[i].full.comment.ack + '<br /><br />' + newComment;
                        }

                        Grouping.listGroups[mainObj.key].children[i].full.comment.ack   = newComment;
                        Grouping.listGroups[mainObj.key].children[i].full.service.unAck = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = true;
                    }
                    else if (mainObj.type == 'scheduleIt' && Search.editComment) {
                        var newComment  = "'"+ $('#downtimeComment').text() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;

                        if (Grouping.listGroups[mainObj.key].children[i].full.comment.sched) {
                            newComment = Grouping.listGroups[mainObj.key].children[i].full.comment.sched + '<br /><br />' + newComment;
                        }

                        Grouping.listGroups[mainObj.key].children[i].full.comment.sched = newComment;
                        Grouping.listGroups[mainObj.key].children[i].full.service.down  = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qUAck = false;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAck  = true;
                        Grouping.listGroups[mainObj.key].children[i].full.service.qAuth = false;
                    }
                    else {
                        if (mainObj.type == 'unAck' || mainObj.type == 'unAcknowledgeIt') {
                            Search.countRecordsPlus('normal');
                            Search.countRecordsMinus('acked');
                        }
                        else if (mainObj.type == 'acknowledgeIt' && !Search.editComment) {
                            Search.countRecordsPlus('acked');
                            Search.countRecordsMinus(Search.currentTab);
                        }
                        else if (mainObj.type == 'scheduleIt' && !Search.editComment) {
                            Search.countRecordsMinus(Search.currentTab);
                            Search.countRecordsPlus('sched');
                        }

                        Grouping.listGroups[mainObj.key].children.splice(i, 1);

                        if (Grouping.listGroups[mainObj.key].children && Grouping.listGroups[mainObj.key].children.length) {
                            Grouping.listGroups[mainObj.key].data.count--;

                            if (Number.isInteger(Grouping.listGroups[mainObj.key].data.host)) {
                                Grouping.listGroups[mainObj.key].data.host--;
                            }
                            else {
                                Grouping.listGroups[mainObj.key].data.service--;
                            }
                        }
                        else {
                            deleteMainGroup.push(mainObj.key);
                        }
                    }
                }
            }

            for (var i = 0; i < deleteMainGroup.length; i++) {
                delete Grouping.listGroups[deleteMainGroup[i]];
            }

            Grouping.redrawInfo();
        }
        else {
            Search.allDataTable.rows({ page:'current', search:'applied' }).every(function (rowIdx, tableLoop, rowLoop) {
                var d      = this.data(),
                    change = 0;

                if (mainObj.what == 'all') {
                    change = 1;
                }
                else if (mainObj.what == 'this' && mainObj.service == d.service.name && mainObj.host == d.host.name) {
                    change = 1;
                }

                if (change) {
                    if (mainObj.type == 'quickAck') {
                        d.service.qUAck = Search.avatarUrl;
                        d.service.qAck  = false;
                        d.service.qAuth = Search.currentUser;
                    }
                    else if (mainObj.type == 'quickUnAck') {
                        d.service.qUAck = false;
                        d.service.qAck  = true;
                        d.service.qAuth = false;
                    }
                    else if (mainObj.type == 'unAck' || mainObj.type == 'unAcknowledgeIt') {
                        d.service.unAck = false;
                        d.service.qUAck = false;
                        d.service.qAck  = true;
                        d.service.qAuth = false;
                        d.comment.ack   = '';

                        if (mainObj.what == 'this') {
                            $('#mainTable tbody tr').each(function() {
                                var host    = $(this).find('td.host a').text(),
                                    service = $(this).find('td.service a.service-name').text();

                                if (mainObj.service == service && mainObj.host == host) {
                                    $(this).remove();
                                    Search.countRecordsPlus('normal');
                                    Search.countRecordsMinus('acked');
                                }
                            });
                        }

                        if (mainObj.what == 'all') {
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
                    }
                    else if (mainObj.type == 'acknowledgeIt') {
                        var newComment  = "'"+ $('input[name="ack_comment_extension"]').val() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;
                        d.comment.ack   = (d.comment.ack) ? (d.comment.ack +'<br /><br />'+ newComment) : newComment;
                        d.service.unAck = true;
                        d.service.qAck  = true;

                        if (mainObj.what == 'this') {
                            $('#mainTable tbody tr').each(function() {
                                var host    = $(this).find('td.host a').text(),
                                    service = $(this).find('td.service a.service-name').text();

                                if (mainObj.service == service && mainObj.host == host) {
                                    if (Search.editComment) {
                                        d.comment.ack = newComment;
                                    } else {
                                        $(this).remove();
                                        Search.countRecordsMinus(Search.currentTab);
                                        Search.countRecordsPlus('acked');
                                    }
                                }
                            });
                        }

                        if (mainObj.what == 'all') {
                            $('#mainTable tbody tr').each(function() {
                                if (Search.editComment) {
                                    d.comment.ack = newComment;
                                } else {
                                    $(this).remove();
                                }
                            });

                            $('#mainTable thead tr:not(:first)').each(function() {
                                if (Search.editComment) {
                                    $(this).find('td.comment .ack.text').html(newComment);
                                }
                                else {
                                    $(this).remove();
                                    Search.allHeaderRows = {};
                                }
                            });

                            if (Search.editComment) {
                                if (Object.keys(Search.allHeaderRows).length) {
                                    for (var key in Search.allHeaderRows){
                                        if (Search.allHeaderRows[key].length) {
                                            for (var i = 0; i < Search.allHeaderRows[key].length; i++) {
                                                Search.allHeaderRows[key][i].find('td.comment .ack.text').html(newComment);
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                var oldCount = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
                                    newCount = parseInt($('#radio label[for="acked"] em').text());

                                $('#radio label[for="' + Search.currentTab + '"] em').text('0');
                                $('#radio label[for="acked"] em').text(oldCount + newCount);
                            }
                        }
                    }
                    else if (mainObj.type == 'scheduleIt') {
                        var newComment  = "'"+ $('#downtimeComment').text() +"' by "+ Search.currentUser +"<br>added: "+ commentDate;
                        d.comment.sched = (d.comment.sched) ? (d.comment.sched +'<br /><br />'+ newComment) : newComment;
                        d.service.down  = true;
                        d.service.qUAck = false;
                        d.service.qAck  = true;
                        d.service.qAuth = false;

                        if (mainObj.what == 'this') {
                            $('#mainTable tbody tr').each(function() {
                                var host    = $(this).find('td.host a').text(),
                                    service = $(this).find('td.service a.service-name').text();

                                if (mainObj.service == service && mainObj.host == host) {
                                    if (Search.editComment) {
                                        d.comment.sched = newComment;
                                    } else {
                                        $(this).remove();
                                        Search.countRecordsMinus(Search.currentTab);
                                        Search.countRecordsPlus('sched');
                                    }
                                }
                            });
                        }

                        if (mainObj.what == 'all') {
                            $('#mainTable tbody tr').each(function() {
                                if (Search.editComment) {
                                    d.comment.sched = newComment;
                                } else {
                                    $(this).remove();
                                }
                            });

                            $('#mainTable thead tr:not(:first)').each(function() {
                                if (Search.editComment) {
                                    $(this).find('td.comment .sched.text').html(newComment);
                                }
                                else {
                                    $(this).remove();
                                    Search.allHeaderRows = {};
                                }
                            });

                            if (Search.editComment) {
                                if (Object.keys(Search.allHeaderRows).length) {
                                    for (var key in Search.allHeaderRows){
                                        if (Search.allHeaderRows[key].length) {
                                            for (var i = 0; i < Search.allHeaderRows[key].length; i++) {
                                                Search.allHeaderRows[key][i].find('td.comment .sched.text').html(newComment);
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                var oldCount = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
                                    newCount = parseInt($('#radio label[for="sched"] em').text());

                                $('#radio label[for="' + Search.currentTab + '"] em').text('0');
                                $('#radio label[for="sched"] em').text(oldCount + newCount);
                            }
                        }
                    }

                    this.invalidate();


                }
            });
        }

        Search.checkResizedIcons();
        Search.recheckIcons();

        setTimeout(function(){ localStorage.setItem('canceledReloads', '0'); Search.startReloads(); }, 5000);

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

        commentDate            = '';
        Search.editComment     = false;
        Search.editCommentText = '';
        Search.submitDialogButton = true;
    });
}
Search.tempShowButtons = function(key) {
    if (Search.whatWeChangeObject[key].what == 'group') {
        var dataKey     = Search.whatWeChangeObject[key].key,
            type        = Search.whatWeChangeObject[key].type;

        $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type).show();
        $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type + 'Group').show();
    }
    else {
        var tableWhere    = (Search.whatWeChangeObject[key].what == 'group') ? 'thead' : 'tbody',
            tableNot      = (Search.whatWeChangeObject[key].what == 'group') ? ':not(.group-list)' : '',
            returnArray   = [];

        $('#mainTable '+ tableWhere +' tr' + tableNot).each(function() {
            var row     = $(this),
                host    = Search.getHost(row),
                service = Search.getService(row),
                check   = Search.getLastCheck(row);

            if (Search.whatWeChangeObject[key].host && Search.whatWeChangeObject[key].service) {
                if (host == Search.whatWeChangeObject[key].host && service == Search.whatWeChangeObject[key].service) {
                    Search.tmpShowIcon(row, Search.whatWeChangeObject[key].type);
                }
            } else if (Search.whatWeChangeObject[key].host) {
                if (host == Search.whatWeChangeObject[key].host) {
                    Search.tmpShowIcon(row, Search.whatWeChangeObject[key].type);
                }
            } else if (Search.whatWeChangeObject[key].service) {
                if (service == Search.whatWeChangeObject[key].service) {
                    Search.tmpShowIcon(row, Search.whatWeChangeObject[key].type);
                }
            } else {
                Search.tmpShowIcon(row, Search.whatWeChangeObject[key].type);
            }
        });


        if (Search.whatWeChangeObject[key].what == 'group' || Search.whatWeChangeObject[key].what == 'this') {
            $('#mainTable thead tr').each(function() {
                var row     = $(this),
                    host    = Search.getHost(row),
                    service = Search.getService(row);

                if (Search.whatWeChangeObject[key].host && Search.whatWeChangeObject[key].service) {
                    if (host == Search.whatWeChangeObject[key].host && service == Search.whatWeChangeObject[key].service) {
                        Search.tmpShowIcon(row, Search.whatWeChangeObject[key].type);
                    }
                } else if (Search.whatWeChangeObject[key].host) {
                    if (host == Search.whatWeChangeObject[key].host) {
                        Search.tmpShowIcon(row, Search.whatWeChangeObject[key].type +'Group');
                    }
                } else if (Search.whatWeChangeObject[key].service) {
                    if (service == Search.whatWeChangeObject[key].service) {
                        Search.tmpShowIcon(row, Search.whatWeChangeObject[key].type +'Group');
                    }
                }
            });
        }

        if ((Search.whatWeChangeObject[key].what == 'all')) {
            $('#mainTable tr .icons.'+ Search.whatWeChangeObject[key].type +'Group, #mainTable tr .icons.'+ Search.whatWeChangeObject[key].type +', #'+ Search.whatWeChangeObject[key].type +'_button').show();
        }
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
	$("#dialogAck").dialog("close");
	$("#dialog").dialog("close");

	Search.editComment     = false;
	Search.editCommentText = '';

	Search.startReloads();
}
Search.AcknowledgeServices = function() {
	Search.submitDialogButton = false;

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
	Search.prepareSendData(lastKeyValue);
}
Search.SheduleServices = function() {
	Search.submitDialogButton = false;

	var $form = $('form[name=scheduleDowntime]');
		$form.find('.ui-state-error').each(function(){
			$(this).removeClass('ui-state-error');
		});

	if (!Search.editComment) {
        $interval = $('input[name=sched_interval_extension]');
		if (!parseInt($interval.val()) || parseInt($interval.val()) < 1) {
			$interval.addClass('ui-state-error');
		}
    }

	$comment = $('input[name=sched_comment_extension]');
	if ($comment.val() == '' || typeof($comment.val()) != 'string') {
		$comment.addClass('ui-state-error');
	}

	if ($form.find('.ui-state-error').length > 0) {
		return false;
	}

	$('#downtimeComment').html($comment.val());

	if (!Search.editComment) {
		$('#timeShift').html(parseInt($interval.val()));

		$.get($('#nagiosConfigFile').html(), function(data) {
			var regex       = new RegExp(/Last Updated:\s*([^<]+)/i),
				results     = regex.exec(data);

			$('#lastUpdated').html(results[1]);
		})
		.done(function() {
			$('#scheduleDowntimeButton').attr('disabled', 'disabled');
			Search.prepareSendData(lastKeyValue);
		});
	} else {
		$('#scheduleDowntimeButton').attr('disabled', 'disabled');
		Search.prepareSendData(lastKeyValue);
	}

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
    } else if (Search.ajaxData.infoCritical) {
        Tinycon.setOptions({ colour: '#ffffff', background: '#ad7e36' });
        Tinycon.setBubble(Search.ajaxData.infoCritical);
    } else if (Search.ajaxData.infoWarnings) {
        Tinycon.setOptions({ colour: '#ffffff', background: '#676cff' });
        Tinycon.setBubble(Search.ajaxData.infoWarnings);
    } else if (typeof Tinycon !== 'undefined') {
        Tinycon.setBubble(0);
    }
}
Search.countRecords = function() {
    $('#radio label[for="normal"] em').text(Search.ajaxData.normal);
    $('#radio label[for="acked"] em').text(Search.ajaxData.acked);
    $('#radio label[for="sched"] em').text(Search.ajaxData.sched);
    $('#radio label[for="hosts"] em').text(Search.ajaxData.hosts);
    $('#radio label[for="EMERGENCY"] em').text(Search.ajaxData.EMERGENCY);
    $('#radio label[for="planned"] em').text(Search.ajaxData.planned);
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
    Search.stopReloads();
    Search.startedGetData = true;
    Search.allDataTable.ajax.url('json_new.php?server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function() {
        Search.resetAgo();
        Planned.getPlanned();
        Planned.showHidePlanned();
    }).order(Search.orderBy[Search.currentTab]);
}
Search.returnCommentText = function(text) {
	text = text.split(' by ');
	text.pop();
	text = text.join(' ').trim().slice(1, -1);

	return text;
}

Search.returnComments = function(modal, key) {
    $.ajax({
        url:    'comments.php?server='+ Search.currentServerTab,
        method: 'GET',
        data:   { host: Search.whatWeChangeObject[key].host, service: Search.whatWeChangeObject[key].service },
    })
        .success(function(data) {
            if (data.length) {
                var html  = '<select name="select-comment-list">';
                html += '<option value=""></option>';

                for (var i = 0; i < data.length; i++) {
                    html += '<option value="'+ encodeURIComponent(data[i].name) +'">'+ data[i].name +' - '+ moment(data[i].date, 'YYYY-MM-DD HH:mm:ss').fromNow() +'</option>';
                }

                html += '</select>';

                $(modal + ' .select-comment').show();
                $(modal + ' .select-comment').html(html);
            }
        });
}
Search.addToAgo = function() {
	Search.lastUpdateAgo++;
	$('#updatedAgo').text(Search.lastUpdateAgo);

	if (Search.lastUpdateAgo > 300) {
        Search.stopReloads();
		Search.lastUpdateAgo = 0;
		Search.startReloads();
    }
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

Search.changeWhatWeChangeObject = function(data) {
    Search.whatWeChangeObject.push(data);
    Search.whatWeChangeDataObject.push('');

    return Search.whatWeChangeObject.length - 1;
}
Search.checkResizedIcons = function() {
    Search.hideMoreMobile(false);
    if ($(window).width() > 560) {
        $('.comment').toggle(Search.currentTab == 'acked' || Search.currentTab == 'sched');
        $('.comment .ack').toggle(Search.currentTab == 'acked');
        $('.comment .sched').toggle(Search.currentTab == 'sched');
    } else {
        $('.comment').hide();
    }

    $('.icons.quickAck, .icons.quickUnAck').closest('li').toggle(Search.currentTab != 'acked' && Search.currentTab != 'sched');
    $('.quickAckUnAckIcon').closest('li').toggle(Search.currentTab != 'acked' && Search.currentTab != 'sched');
    $('.status .downtime_id').toggle(Search.currentTab == 'sched');
    $('.service .list-downtime-icon').closest('li').toggle(Search.currentTab != 'sched');
    $('.service .list-unack-icon').closest('li').toggle(Search.currentTab != 'acked');
}

Search.getCounts = function() {
    $.ajax({
        url:    'counts.php',
        method: 'GET',
    }).always(function(data) {
        for (var key in data) {
            $(document).find('[data-server-tab="'+ key +'"]').text(' ('+ data[key] +')');
        }

        setTimeout(function(){ Search.getCounts(); }, 30000);
    });
}

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
    Search.startedGetData = true;
	Search.startAgo();
    setTimeout(function(){ Search.getCounts(); }, 3000);

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

    $(document).on('change', '#sched_permanent', function() {
        var checked = $('#sched_permanent').prop("checked");

        $('#sched_interval_extension, #sched_finish_date_time').prop('disabled', checked).toggleClass('ui-state-disabled', checked);

        if (checked) {
            Search.permanentValues.old = (parseInt($('#sched_interval_extension').val())) ? parseInt($('#sched_interval_extension').val()) : 0;
            Search.permanentValues.new = 20000;
        } else {
            Search.permanentValues.new = Search.permanentValues.old;
            Search.permanentValues.old = 0;
        }

        $('#sched_interval_extension').val(Search.permanentValues.new).trigger('change');
    });

    $(document).on('change', '[name="select-comment-list"]', function() {
        $('#sched_comment_extension, #ack_comment_extension').val(decodeURIComponent($('[name="select-comment-list"]').val()));
    });

	$('#normal, #acked, #sched, #EMERGENCY, #hosts').on('click', function() {
		if (Search.currentTab == $(this).attr('id')) {
		    location.reload();
		    return false;
		}
		Search.hideMoreArray = [];
		Search.stopReloads();

		localStorage.setItem('currentTabNew', $(this).attr('id'));
		Search.currentTab     = localStorage.getItem('currentTabNew');

		Search.allDataTable.order(Search.orderBy[Search.currentTab]);

		Search.allDataTable.ajax.url('json_new.php?server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function() {
			Search.resetAgo();
			Planned.showHidePlanned();
		}).order(Search.orderBy[Search.currentTab]);
	});
    $('#mainTable_filter input').unbind().bind('propertychange keyup input paste keydown', function(e) {
        var val = $(this).val();

        if (localStorage.getItem('searchValue') != val) {
            localStorage.setItem('searchValue', val);
            Search.stopReloads();

            Search.allDataTable.ajax.url('json_new.php?server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function () {
                Search.resetAgo();
                Planned.showHidePlanned();

                setTimeout(function(){
                    Planned.showHidePlanned();
                }, 400);
            });
        }
    });
    $('#mainTable_filter input').val(localStorage.getItem('searchValue')).focus();


    $('#mainTable').on('click', '.recheckIt', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'recheckIt',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
            'key': $(this).closest('tr').attr('data-group'),
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });
    $(document).on('click', '#'+ Search.recheckButtonId, function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'recheckIt',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });


    $('#mainTable').on('click', '.quickAck', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'quickAck',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
            'key': $(this).closest('tr').attr('data-group'),
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });
    $(document).on('click', '#'+ Search.quickAckButtonId, function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'quickAck',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });


    $('#mainTable').on('click', '.quickUnAck', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'quickUnAck',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
            'key': $(this).closest('tr').attr('data-group'),
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });
    $(document).on('click', '#'+ Search.quickUnAckButtonId, function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'quickUnAck',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });


    $('#mainTable').on('click', '.unAck', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'unAck',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
            'key': $(this).closest('tr').attr('data-group'),
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });
    $(document).on('click', '#'+ Search.unackButtonId, function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'unAck',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });


    $(document).on('click', '#unAcknowledgeIt_button', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'unAcknowledgeIt',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });
    $('#mainTable').on('click', '.unAcknowledgeIt', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'unAcknowledgeIt',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
            'key': $(this).closest('tr').attr('data-group'),
        });

        $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});
    });


    $('#mainTable').on('click', '.acknowledgeIt', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'acknowledgeIt',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
            'key': $(this).closest('tr').attr('data-group'),
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        $('#dialogAck').dialog('open');
        Search.returnComments('#dialogAck', key);
    });
    $('#mainTable').on('click', '.edit_acknowledgeIt', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'acknowledgeIt',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
            'key': $(this).closest('tr').attr('data-group'),
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        Search.editComment = true;
        Search.editCommentText = Search.returnCommentText($(this).closest('td').find('.ack.text').text());
        $('#dialogAck').dialog('open');
        Search.returnComments('#dialogAck', key);
    });
    $(document).on('click', '#'+ Search.ackButtonId, function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'acknowledgeIt',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        $('#dialogAck').dialog('open');
    });
    $(document).on('click', '#edit_acknowledge', function () {
        var key = Search.changeWhatWeChangeObject({
            'type':    'acknowledgeIt',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        $('#dialogAck').dialog('open');
        Search.editComment = true;
    });
	
	
	$(document).on('keypress', '#ack_comment_extension', function (e) {
		if (e.keyCode && e.keyCode == 13 && Search.submitDialogButton) {
			$('#acknowledgeDialogButton').trigger('click');
		}
	});
	

    $('#mainTable').on('click', '.scheduleIt', function () {
        var key     = Search.changeWhatWeChangeObject({
            'type':    'scheduleIt',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        $('#dialog').dialog('open');
        Search.returnComments('#dialog', key);
    });
    $('#mainTable').on('click', '.edit_scheduleIt', function () {
        var key     = Search.changeWhatWeChangeObject({
            'type':    'scheduleIt',
            'what':    'this',
            'tab':     $(this).closest('tr').find('.host a').attr('data-tab'),
            'host':    $(this).closest('tr').find('.host').text(),
            'service': $(this).closest('tr').find('.service ul li:first').text(),
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        Search.editComment = true;
        Search.editCommentText = Search.returnCommentText($(this).closest('td').find('.sched.text').text());
        $('#dialog').dialog('open');
        Search.returnComments('#dialog', key);
    });
    $(document).on('click', '#'+ Search.sdButtonId, function () {
        var key     = Search.changeWhatWeChangeObject({
            'type':    'scheduleIt',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        $('#dialog').dialog('open');
    });
    $(document).on('click', '#edit_scheduled', function () {
        var key     = Search.changeWhatWeChangeObject({
            'type':    'scheduleIt',
            'what':    'all',
            'tab':     '',
            'host':    '',
            'service': '',
        });

        lastKeyValue = key;
        Search.tempHideButtons(key);
        Search.editComment = true;
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
		if (e.keyCode && e.keyCode == 13 && Search.submitDialogButton) {
			$('#scheduleDowntimeButton').trigger('click');
		}
	});
	
	
	Search.allDataTable.on('order.dt', function(e, settings) {
		Search.orderBy[Search.currentTab] = settings.aaSorting;
		Search.allDataTable.order(Search.orderBy[Search.currentTab]);
		Search.emptyHosts();
	});
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
        Search.checkResizedIcons();
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
					isHost  = $(this).find('.host a').attr('data-host'),
                    tab     = $(this).closest('tr').find('.host a').attr('data-tab');
					
				if (down_id) {
					down_id = down_id.split(',');
					
                    for (var a = 0; a < down_id.length; a++) {
						if (ids.indexOf(down_id[a]) === -1) {
							request.push({ 'down_id': down_id[a], 'isHost': isHost, 'tab': tab });
							ids.push(down_id[a]);
						}
					}
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
							isHost  = headerRows[i].find('.host a').attr('data-host'),
                            tab     = headerRows[i].find('.host [data-tab]').attr('data-tab');
							
						if (down_id) {
                            down_id = down_id.split(',');
							
							for (var b = 0; b < down_id.length; b++) {
								if (ids.indexOf(down_id[b]) === -1) {
									request.push({ 'down_id': down_id[b], 'isHost': isHost, 'tab': tab });
									ids.push(down_id[b]);
								}
							}
                        }
					}
				}
            }
			
			$('#mainTable tr').find('.service .unScheduleIt').css('visibility', 'hidden');
			$('#mainTable tr').find('.service .unScheduleItGroup').css('visibility', 'hidden');
		}
        else if (type == 'group') {
           var attr = button.closest('tr').attr('data-group'),
               returnIds = Grouping.returnIds(attr);

            request = returnIds[1];
            ids     = returnIds[0];
            group   = attr;

            $('#mainTable thead tr[data-group="' + attr + '"]').find('.service .unScheduleIt').css('visibility', 'hidden');
            $('#mainTable thead tr[data-group="' + attr + '"]').find('.service .unScheduleItGroup').css('visibility', 'hidden');
        }
		else {
			var rows     = button.closest('tr'),
				down_id  = rows.find('.service .unScheduleIt').attr('data-id'),
				isHost   = rows.find('.host a').attr('data-host'),
				hasGroup = rows.attr('data-group'),
                tab      = rows.find('.host [data-tab]').attr('data-tab');
					
			if (down_id) {
                down_id = down_id.split(',');
				
				for (var i = 0; i < down_id.length; i++) {
					if (ids.indexOf(down_id[i]) === -1) {
						request.push({ 'down_id': down_id[i], 'isHost': isHost, 'tab': tab });
						ids.push(down_id[i]);
					}
				}
            }
			
			if (hasGroup) {
                group = hasGroup;
            }
		}
		
		button.css('visibility', 'hidden');
		
		$.ajax({
			url:    'post.php',
			method: 'POST',
			data:   { data: request, 'type': 'downtime', server: Search.currentServerTab },
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
                var countTotal = Grouping.listGroups[group].children.length;

                for (var i = 0; i < countTotal; i++) {
                    if (Grouping.listGroups[group].children[i].state == 'OK') {
                        countOK++;
                    }
                }

                $('#radio label[for="sched"] em').text(parseInt($('#radio label[for="sched"] em').text()) - countTotal);
                $('#radio label[for="normal"] em').text(parseInt($('#radio label[for="normal"] em').text()) + countTotal - countOK);

                delete Grouping.listGroups[group];

                Grouping.redrawInfo();
            }
			else {
				if (!group) {
                    var row = $('#mainTable tbody tr [data-id="' + ids.join(',') + '"]').closest('tr');
					
					$('#radio label[for="sched"] em').text(parseInt($('#radio label[for="sched"] em').text()) - 1);
					
					if (row.find('td.status').text() != 'OK') {
                        $('#radio label[for="normal"] em').text(parseInt($('#radio label[for="normal"] em').text()) + 1);
                    }
					
					row.remove();
                }
                else {
                    Search.countRecordsMinus('sched');
                    Search.countRecordsPlus('normal');

                    var deleteMainGroup = [];

                    for (var i = 0; i < Grouping.listGroups[group].children.length; i++) {
                        if (Grouping.listGroups[group].children[i].full.service.downId == ids.join(',')) {
                            Grouping.listGroups[group].children.splice(i, 1);

                            if (Grouping.listGroups[group].children && Grouping.listGroups[group].children.length) {
                                Grouping.listGroups[group].data.count--;

                                if (Number.isInteger(Grouping.listGroups[group].data.host)) {
                                    Grouping.listGroups[group].data.host--;
                                }
                                else {
                                    Grouping.listGroups[group].data.service--;
                                }
                            }
                            else {
                                deleteMainGroup.push(group);
                            }
                        }
                    }

                    for (var i = 0; i < deleteMainGroup.length; i++) {
                        delete Grouping.listGroups[deleteMainGroup[i]];
                    }

                    Grouping.redrawInfo();
                }
			}
			
			setTimeout(function(){ localStorage.setItem('canceledReloads', '0'); Search.startReloads(); }, 5000);
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
        globalTime += 2;

        if (globalTime > 300 && globalReload) {
            location.reload(true);
        }

		var currentTime = (new Date()).getTime();
		if (currentTime > (lastTime + 300000)) {
			Search.stopReloads();
			Search.startReloads();
		}
		lastTime = currentTime;
	}, 2000);
	
	$(document).on('copy', function(e) {
		$('td.status_information').css('width', '200px');
		setTimeout(function() { $('td.status_information').removeAttr('style') });
	});

    $('#history').on('click', function() {
        window.location = window.location.href.split('?')[0] + "?t=1";
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
		if (!settings.url.startsWith('planned.php') && !settings.url.startsWith('counts.php') && settings.url != 'post.php') {
            jqx._id = ++id;
			Q[jqx._id] = jqx;
        }
	});
	$(document).ajaxComplete(function(e, jqx, settings){
		if (!settings.url.startsWith('planned.php') && !settings.url.startsWith('counts.php') && settings.url != 'post.php') {
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

showNoDataBlock = false;
$('#mainTable').on('error.dt', function(e, settings, techNote, message) {
    if (techNote == 7) {
        Search.startReloads();
        if (Search.firstLoad) {
            $('#loading, #infoHolder').hide();
            $('#noData').show();
            showNoDataBlock = true;
        } else {
            hideNoData();
            showNoDataBlock = true;
        }
    }
})

function hideNoData() {
    $('#loading, #refreshTime, #tabs, #normalGrouping, #radio, #mainTable_wrapper').hide();
    $('#updatedAgo').closest('p').hide();
    $('#noDataServer').show();
}
function showNoData() {
    $('#refreshTime, #tabs, #normalGrouping, #radio, #mainTable_wrapper').show();
    $('#updatedAgo').closest('p').show();
    $('#noDataServer').hide();
    showNoDataBlock = false;
}

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


Planned = {
    plannedData: {},
    plannedServersList: '',
    plannedTimer: null,
    showHidePlanned: function() {
        if (Search.currentTab == 'planned') {
            $('#planned-maintenance').show();
            $('#mainTable_wrapper').hide();
        } else {
            $('#planned-maintenance').hide();
            if (!showNoDataBlock) {
                $('#mainTable_wrapper').show();
            }
        }
    },
    getPlanned: function() {
        Planned.showHidePlanned();

        $.ajax({
            url:    'planned.php?server=' + Search.currentServerTab,
            method: 'GET',
        })
            .always(function(data) {
                Planned.drawPlanned(data);
                Planned.plannedTimer = setTimeout(function(){ Planned.getPlanned() }, 30000);
            });
    },
    drawPlanned: function(data) {
        $('#planned-list, #planned-templates-list').html('');
        $('#planned-list').closest('table').toggle(data.file.length > 0);
        $('#planned-templates-list').closest('div').toggle(data.templates && data.templates.length > 0);

        if (this.plannedServersList != data.servers) {
            this.plannedServersList = data.servers;
            $('#maintenance-server').html('');

            var servers = this.plannedServersList.split(',');

            for (var i = 0; i < servers.length; i++) {
                $('#maintenance-server').append('<option value="'+ servers[i] +'">'+ servers[i] +'</option>');
            }
        }

        if (data.file.length > 0) {
            $.each(data.file, function( index, value ) {
                value['status'] = (value['status']) ? value['status'] : '';

                var normal  = (parseInt(value['normal'])) ? 'yes' : 'no',
                    editBtn = ' <button ' +
                        '			data-id="'+ encodeURIComponent(value['host'] + '___' + value['service'] + '___' + value['status']) +'___'+ value['server'] +'" ' +
                        '			data-host="'+ encodeURIComponent(value['host']) +'" ' +
                        '			data-service="'+ encodeURIComponent(value['service']) +'" ' +
                        '			data-status="'+ encodeURIComponent(value['status']) +'" ' +
                        '			data-comment="'+ encodeURIComponent(value['comment']) +'" ' +
                        '			data-normal="'+ encodeURIComponent(parseInt(value['normal'])) +'" ' +
                        '			data-server="'+ encodeURIComponent(value['server']) +'" ' +
                        '			class="edit-planned"' +
                        '		>Edit</button>',
                    button  = ' <button ' +
                        '			data-id="'+ encodeURIComponent(value['host'] + '___' + value['service'] + '___' + value['status']) +'___'+ value['server'] +'" ' +
                        '			class="save-planned"' +
                        '		>Delete</button>',
                    comment = Search.changeNagiosComment(value['comment']);

                $('#planned-list').append(
                '<tr>' +
                    '<td>'+ value['host']    +'</td>' +
                    '<td>'+ value['service'] +'</td>' +
                    '<td>'+ value['status']  +'</td>' +
                    '<td>'+ value['date']    +'</td>' +
                    '<td>'+ comment          +'</td>' +
                    '<td>'+ value['user']    +'</td>' +
                    '<td>'+ normal           +'</td>' +
                    '<td>'+ value['server']  +'</td>' +
                    '<td>'+ editBtn          +'</td>' +
                    '<td>'+ button           +'</td>' +
                '</tr>');
            });
        }

        if (data.templates && data.templates.length > 0) {
            $.each(data.templates, function( index, value ) {
                var host    = (value['host'] && value['host'] != '*')                     ? ('<strong>Host: </strong>'                + value['host'])    : '',
                    service = (value['service'] && value['service'] != '*')               ? ('<strong> Service: </strong>'            + value['service']) : '',
                    status  = (value['status'] && value['status'] != '*')                 ? ('<strong> Status information: </strong>' + value['status']) : '',
                    time    = (parseInt(value['time']) && parseInt(value['time']) > 0)    ? ('<strong> Time: </strong>'               + value['time'])    : '',
                    comment = (value['comment'])                                          ? ('<strong> Comment: </strong>'            + value['comment']) : '',
                    server  = (value['server'])                                           ? ('<strong> Server: </strong>'             + value['server']) : '',
                    normal  = (parseInt(value['normal']))                                 ? ('<strong> Show in Normal</strong>')                          : '';

                $('#planned-templates-list').append('<li><small><strong>' + value['name'] + '</strong> ('+ host + service + status + server +')'+ time + comment + normal +'</small> <button data-time="'+ value['time'] +'" data-comment="'+ encodeURIComponent(value['comment']) +'" data-host="'+ encodeURIComponent(value['host']) +'" data-server="'+ encodeURIComponent(value['server']) +'" data-service="'+ encodeURIComponent(value['service']) +'" data-status="'+ encodeURIComponent(value['status']) +'" data-normal="'+ encodeURIComponent(value['normal']) +'" class="add-from-planned-template" style="margin-top: 0;">Use</button></li>');
            });
        }
    },
    savePlanned: function() {
        var error           = 0,
            host            = $('#planned_host').val(),
            service         = $('#planned_service').val(),
            status          = $('#planned_status').val(),
            server          = $('#planned_server').val(),
            requiredHost    = parseInt($('#planned_host').attr('data-required')),
            requiredService = parseInt($('#planned_service').attr('data-required')),
            requiredStatus  = parseInt($('#planned_status').attr('data-required'));

        if ($('#planned_host').length) {
            $('#planned_host').css('border-color', '#aaa');

            if ((requiredHost && !host) || (!host && ($('#planned_service').length && !service) && ($('#planned_status').length && !status))) {
                error++;
                $('#planned_host').css('border-color', 'red');
            }
        }
        if ($('#planned_service').length) {
            $('#planned_service').css('border-color', '#aaa');

            if ((requiredService && !service) || (!service && ($('#planned_host').length && !host) && ($('#planned_status').length && !status))) {
                error++;
                $('#planned_service').css('border-color', 'red');
            }
        }
        if ($('#planned_status').length) {
            $('#planned_status').css('border-color', '#aaa');

            if ((requiredStatus && !status) || (!status && ($('#planned_host').length && !host) && ($('#planned_service').length && !service))) {
                error++;
                $('#planned_status').css('border-color', 'red');
            }
        }
        if ($('#planned_time').length) {
            $('#planned_time').css('border-color', '#aaa');

            if (!$('#planned_time').val() || !parseInt($('#planned_time').val())) {
                error++;
                $('#planned_time').css('border-color', 'red');
            }
        }
        if ($('#planned_comment').length) {
            $('#planned_comment').css('border-color', '#aaa');

            if (!$('#planned_comment').val()) {
                error++;
                $('#planned_comment').css('border-color', 'red');
            }
        }
        if ($('#planned_server').length) {
            $('#planned_server').css('border-color', '#aaa');

            if (!$('#planned_server').val()) {
                error++;
                $('#planned_server').css('border-color', 'red');
            }
        }

        if (!error) {
            if ($('#planned_host').length) {
                if (requiredHost) {
                    Planned.plannedData.host = Planned.plannedData.host.replace('${host}', host);
                } else {
                    Planned.plannedData.host = host;
                }
            }

            if ($('#planned_service').length) {
                if (requiredService) {
                    Planned.plannedData.service = Planned.plannedData.service.replace('${service}', service);
                } else {
                    Planned.plannedData.service = service;
                }
            }

            if ($('#planned_status').length) {
                if (requiredStatus) {
                    Planned.plannedData.status = Planned.plannedData.status.replace('${status}', status);
                } else {
                    Planned.plannedData.status = status;
                }
            }

            if ($('#planned_time').length) {
                Planned.plannedData.time = parseInt($('#planned_time').val());
            }

            if ($('#planned_comment').length) {
                Planned.plannedData.comment = $('#planned_comment').val();
            }

            if ($('#planned_server').length) {
                Planned.plannedData.server = $('#planned_server').val();
            }

            clearTimeout(Planned.plannedTimer);

            $.ajax({
                url:    'planned.php?server=' + Search.currentServerTab,
                method: 'POST',
                data:   { host: Planned.plannedData.host, service: Planned.plannedData.service, status: Planned.plannedData.status, time: Planned.plannedData.time, comment: Planned.plannedData.comment, line: 'new', user: $('#userName').text(), normal: Planned.plannedData.normal, xserver: Planned.plannedData.server },
            })
                .always(function(data) {
                    if ($('#plannedDialog').html()) {
                        $('#plannedDialog').dialog('close');
                    }
                    Planned.drawPlanned(data);
                    Search.stopReloads();
                    Search.startReloads();
                });
        }
    },
    savePlannedEdit: function(command, refresh) {
        var host    = $('#edit_planned_host').val(),
            service = $('#edit_planned_service').val(),
            status  = $('#edit_planned_status').val(),
            comment = $('#edit_planned_comment').val(),
            server  = $('#edit_planned_server').val(),
            normal  = +$('#edit_planned_normal').prop('checked'),
            user    = $('#userName').text();

        if ((!host && !service && !status) || !comment) {
            $('#edit_planned_host, #edit_planned_service, #edit_planned_status, #edit_planned_comment').css('border-color', '#aaa');

            if (!host) {
                $('#edit_planned_host').css('border-color', 'red');
            }
            if (!service) {
                $('#edit_planned_service').css('border-color', 'red');
            }
            if (!status) {
                $('#edit_planned_status').css('border-color', 'red');
            }
            if (!comment) {
                $('#edit_planned_comment').css('border-color', 'red');
            }
        } else {
            clearTimeout(Planned.plannedTimer);
            Search.stopReloads();

            $.ajax({
                url:    'planned.php?server=' + Search.currentServerTab,
                method: 'POST',
                data:   { text: 'edit', time: 1, line: 'edit', user: user, old: command, host: host, service: service, status: status, comment: comment, normal: normal, server: server },
            })
                .always(function(data) {
                    if ($('#plannedDialog').html()) {
                        $('#plannedDialog').dialog('close');
                    }
                    Planned.drawPlanned(data);
                    Search.startReloads();
                });
        }
    },
    savePlannedEditComment: function(command) {
        $('#edit_planned_host, #edit_planned_service, #edit_planned_status, #edit_planned_comment').css('border-color', '#aaa');

        var comment = $('#edit_planned_comment').val();

        if (!comment) {
            $('#edit_planned_comment').css('border-color', 'red');
        } else {
            clearTimeout(Planned.plannedTimer);
            Search.stopReloads();

            $.ajax({
                url:    'planned.php?server=' + Search.currentServerTab,
                method: 'POST',
                data:   { text: 'comment', line: command, comment: comment },
            })
                .always(function(data) {
                    if ($('#plannedDialog').html()) {
                        $('#plannedDialog').dialog('close');
                    }
                    Planned.drawPlanned(data);
                    Search.startReloads();

                    $('#mainTable tbody td.status_information .likeTable .planned .edit_planned_comment[data-command="'+ encodeURIComponent(command) +'"]').each(function() {
                        $(this).closest('ul').find('.planned.text p').show().find('span').html(Search.changeNagiosComment(comment));
                    });
                });
        }
    },
    init: function() {
        $('#planned').on('click', function() {
            if (Search.currentTab == $(this).attr('id')) {
                location.reload();
                return false;
            }

            Planned.getPlanned();
            localStorage.setItem('currentTabNew', $(this).attr('id'));
            Search.currentTab = localStorage.getItem('currentTabNew');
            Search.stopReloads();
            Planned.showHidePlanned();
            $('#maintenance-normal').prop('checked', true);
        });
        $('#maintenance-host, #maintenance-service, #maintenance-status, #maintenance-time, #maintenance-comment').on('keypress', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $('#planned-save').trigger('click');
            }
        });
        $(document).on('click', '#planned-save', function() {
            $('#maintenance-host, #maintenance-service, #maintenance-status, #maintenance-time, #maintenance-comment').removeAttr('style');

            var host    = $('#maintenance-host').val(),
                service = $('#maintenance-service').val(),
                status  = $('#maintenance-status').val(),
                time    = parseInt($('#maintenance-time').val()),
                comment = $('#maintenance-comment').val(),
                user    = $('#userName').text(),
                normal  = +$('#maintenance-normal').prop('checked'),
                server  = $('#maintenance-server').val();

            if ((host || service || status) && comment && time > 0) {
                $.ajax({
                    url: 'planned.php?server=' + Search.currentServerTab,
                    method: 'POST',
                    data: {host: host, service: service, status: status, comment: comment, time: time, line: 'new', user: user, normal: normal, xserver: server },
                })
                    .always(function (data) {
                        $('#maintenance-host, #maintenance-service, #maintenance-status, #maintenance-time, #maintenance-comment').val('');
                        $('#maintenance-normal').prop('checked', true)
                        Planned.drawPlanned(data);
                        Search.stopReloads();
                        Search.startReloads();
                    });
            } else {
                if (!host && !service && !status) {
                    $('#maintenance-host').css('border-color', 'red');
                    $('#maintenance-service').css('border-color', 'red');
                    $('#maintenance-status').css('border-color', 'red');
                }
                if (!comment) {
                    $('#maintenance-comment').css('border-color', 'red');
                }
                if (!time || time < 1) {
                    $('#maintenance-time').css('border-color', 'red');
                }
            }
        });
        $(document).on('click', '.edit-planned', function() {
            var values  = $(this),
                host    = decodeURIComponent(values.attr('data-host')),
                service = decodeURIComponent(values.attr('data-service')),
                status  = decodeURIComponent(values.attr('data-status')),
                id      = decodeURIComponent(values.attr('data-id')),
                comment = decodeURIComponent(values.attr('data-comment')).replace(/"/g, '&quot;'),
                normal  = parseInt(decodeURIComponent(values.attr('data-normal'))),
                server  = decodeURIComponent(values.attr('data-server')),
                checked = (normal) ? ' checked="checked"' : '',
                html    = '<p style="font-size: 12px;"><strong>Host:</strong> '+ host +' <strong>Service:</strong> '+ service +' <strong>Status information:</strong> '+ status +' <strong>Comment:</strong> '+ comment +' <strong>Server:</strong> '+ server +' </p>';

            var serversList = '';
            var servers = Planned.plannedServersList.split(',');

            for (var i = 0; i < servers.length; i++) {
                var checkedServer = '';

                if (servers[i] == server) {
                    checkedServer = ' selected="selected"';
                }

                serversList += '<option value="'+ servers[i] +'" '+ checkedServer +'>'+ servers[i] +'</option>';
            }

            html+= '<table style="width: 100%">';
            html+= '<tr>';
            html+= '<td style="font-size: 13px; white-space: nowrap;">Host</td>';
            html+= '<td><input type="text" name="edit_planned_host" id="edit_planned_host" class="text ui-widget-content" value="'+ host +'" style="width: 100%; font-size: 14px;"></td>';
            html+= '</tr>';
            html+= '<tr>';
            html+= '<td style="font-size: 13px; white-space: nowrap;">Service</td>';
            html+= '<td><input type="text" name="edit_planned_service" id="edit_planned_service" class="text ui-widget-content" value="'+ service +'" style="width: 100%; font-size: 14px;"></td>';
            html+= '</tr>';
            html+= '<tr>';
            html+= '<td style="font-size: 13px; white-space: nowrap;">Status information</td>';
            html+= '<td><input type="text" name="edit_planned_status" id="edit_planned_status" class="text ui-widget-content" value="'+ status +'" style="width: 100%; font-size: 14px;"></td>';
            html+= '</tr>';
            html+= '<tr>';
            html+= '<td style="font-size: 13px; white-space: nowrap;">Comment</td>';
            html+= '<td><input type="text" name="edit_planned_comment" id="edit_planned_comment" class="text ui-widget-content" value="'+ comment +'" style="width: 100%; font-size: 14px;"></td>';
            html+= '</tr>';
            html+= '<tr>';
            html+= '<td style="font-size: 13px; white-space: nowrap;">Server</td>';
            html+= '<td><select name="edit_planned_server" id="edit_planned_server" class="text ui-widget-content" style="width: 100%; font-size: 14px;">'+ serversList +'</select></td>';
            html+= '</tr>';
            html+= '<tr>';
            html+= '<td style="font-size: 13px; white-space: nowrap;">Visible in Normal</td>';
            html+= '<td><input type="checkbox" name="edit_planned_normal" id="edit_planned_normal" class="text ui-widget-content" '+ checked +'></td>';
            html+= '</tr>';
            html+= '</table>';

            $('#plannedDialog').html(html);
            $('#plannedDialog').dialog({
                modal:    true,
                width:    400,
                position: { my: "center top", at: "center top+200"},
                close:    function(event, ui) { $('#plannedDialog').dialog('close').dialog('destroy'); $('#plannedDialog').html(''); },
                buttons: [
                    {
                        text:  'Save',
                        id:    'save-planned-template',
                        click: function() { Planned.savePlannedEdit(id) },
                    },
                    {
                        text:  'Cancel',
                        click: function() { $('#plannedDialog').dialog('close'); },
                    }
                ],
            });
        });
        $(document).on('click', '.save-planned', function() {
            var li = $(this).closest('tr');

            if (confirm('Are you sure?')) {
                $(this).attr('disabled', 'disabled');

                $.ajax({
                    url:    'planned.php?server=' + Search.currentServerTab,
                    method: 'POST',
                    data:   { text: 'delete', time: 1, line: decodeURIComponent(li.find('button').attr('data-id')), user: $('#userName').text() },
                })
                    .always(function(data) {
                        Planned.drawPlanned(data);
                        Search.stopReloads();
                        Search.startReloads();
                    });
            }
        });
        $(document).on('click', '.add-from-planned-template', function() {
            var host          = decodeURIComponent($(this).attr('data-host')),
                service       = decodeURIComponent($(this).attr('data-service')),
                server        = decodeURIComponent($(this).attr('data-server')),
                status        = decodeURIComponent($(this).attr('data-status'));

            Planned.plannedData = {
                host:          host,
                service:       service,
                status:        status,
                server:        server,
                time:          parseInt($(this).attr('data-time')),
                comment:       decodeURIComponent($(this).attr('data-comment')),
                changeHost:    (host.indexOf('${host}') > -1)       ? 1 : 0,
                changeService: (service.indexOf('${service}') > -1) ? 1 : 0,
                changeStatus:  (status.indexOf('${status}') > -1)   ? 1 : 0,
                normal:        parseInt($(this).attr('data-normal')),
            };

            if (   Planned.plannedData.time
                && Planned.plannedData.comment
                && !Planned.plannedData.changeHost
                && !Planned.plannedData.changeService
                && (
                        (Planned.plannedData.host || Planned.plannedData.service || Planned.plannedData.status)
                    && !(Planned.plannedData.host == '*' && Planned.plannedData.service == '*' && Planned.plannedData.status == '*')
                )
            ) {
                Planned.savePlanned();
            }
            else {
                var title = '';
                    title+= (Planned.plannedData.host)    ? ('<strong> Host:</strong> '               + Planned.plannedData.host)    : '';
                    title+= (Planned.plannedData.service) ? ('<strong> Service:</strong> '            + Planned.plannedData.service) : '';
                    title+= (Planned.plannedData.status)  ? ('<strong> Status Information:</strong> ' + Planned.plannedData.status)  : '';
                    title+= (Planned.plannedData.comment) ? ('<strong> Comment:</strong> '            + Planned.plannedData.comment) : '';
                    title+= '<strong> Server:</strong> ';
                    title+= (Planned.plannedData.time)    ? ('<strong> Time:</strong> '               + Planned.plannedData.time)    : '';

                var html = '<p style="font-size: 12px;">'+ title +'</p>';

                html+= '<table style="width: 100%">';

                if (Planned.plannedData.changeHost || !Planned.plannedData.host) {
                    html+= '<tr>';
                    html+= '<td style="font-size: 13px; white-space: nowrap;">Host</td>';
                    html+= '<td><input type="text" name="planned_host" id="planned_host" class="text ui-widget-content" data-required="'+ Planned.plannedData.changeHost +'" style="width: 100%; font-size: 14px;"></td>';
                    html+= '</tr>';
                }

                if (Planned.plannedData.changeService || !Planned.plannedData.service) {
                    html+= '<tr>';
                    html+= '<td style="font-size: 13px; white-space: nowrap;">Service</td>';
                    html+= '<td><input type="text" name="planned_service" id="planned_service" class="text ui-widget-content" data-required="'+ Planned.plannedData.changeService +'" style="width: 100%; font-size: 14px;"></td>';
                    html+= '</tr>';
                }

                if (Planned.plannedData.changeStatus || !Planned.plannedData.status) {
                    html+= '<tr>';
                    html+= '<td style="font-size: 13px; white-space: nowrap;">Status<br />information</td>';
                    html+= '<td><input type="text" name="planned_status" id="planned_status" class="text ui-widget-content" data-required="'+ Planned.plannedData.changeStatus +'" style="width: 100%; font-size: 14px;"></td>';
                    html+= '</tr>';
                }

                if (!Planned.plannedData.time) {
                    html+= '<tr>';
                    html+= '<td style="font-size: 13px; white-space: nowrap;">Maintenance Time (minutes)</td>';
                    html+= '<td><input type="text" name="planned_time" id="planned_time" class="text ui-widget-content" style="width: 100%; font-size: 14px;"></td>';
                    html+= '</tr>';
                }

                if (!Planned.plannedData.comment) {
                    html+= '<tr>';
                    html+= '<td style="font-size: 13px; white-space: nowrap;">Comment</td>';
                    html+= '<td><input type="text" name="planned_comment" id="planned_comment" class="text ui-widget-content" style="width: 100%; font-size: 14px;"></td>';
                    html+= '</tr>';
                }

                var serversList = '';
                var servers = Planned.plannedServersList.split(',');

                for (var i = 0; i < servers.length; i++) {
                    var checkedServer = '';

                    if (servers[i] == Planned.plannedData.server) {
                        checkedServer = ' selected="selected"';
                    }

                    serversList += '<option value="'+ servers[i] +'" '+ checkedServer +'>'+ servers[i] +'</option>';
                }

                html+= '<tr>';
                html+= '<td style="font-size: 13px; white-space: nowrap;">Server</td>';
                html+= '<td><select name="planned_server" id="planned_server" class="text ui-widget-content" style="width: 100%; font-size: 14px;">'+ serversList +'</select></td>';
                html+= '</tr>';

                html+= '</table>';

                $('#plannedDialog').html(html);
                $('#plannedDialog').dialog({
                    modal:    true,
                    width:    400,
                    position: { my: "center top", at: "center top+200"},
                    close:    function(event, ui) { $('#plannedDialog').dialog('close').dialog('destroy'); $('#plannedDialog').html(''); },
                    buttons: [
                        {
                            text:  'Save',
                            id:    'save-planned-template',
                            click: function() { Planned.savePlanned() },
                        },
                        {
                            text:  'Cancel',
                            click: function() { $('#plannedDialog').dialog('close'); },
                        }
                    ],
                });
            }
        });
        $(document).on('click', '.edit_planned_comment', function() {
            var element      = $(this),
                command      = decodeURIComponent(element.attr('data-command')),
                host         = command.split('___')[0],
                service      = command.split('___')[1],
                status       = command.split('___')[2],
                titleHost    = (host)    ? ('<strong> Host: </strong>'               + host)    : '',
                titleService = (service) ? ('<strong> Service: </strong>'            + service) : '',
                titleStatus  = (status)  ? ('<strong> Status information: </strong>' + status) : '',
                comment      = element.closest('ul').find('.planned.text span').text(),
                html         = '<p style="font-size: 12px;"><strong>Edit comment for:</strong> '+ titleHost + titleService + titleStatus +'</p>';

            html+= '<table style="width: 100%">';
            html+= '<tr>';
            html+= '<td style="font-size: 13px; white-space: nowrap;">Comment</td>';
            html+= '<td><input type="text" name="edit_planned_comment" id="edit_planned_comment" class="text ui-widget-content" value="'+ comment +'" style="width: 100%; font-size: 14px;"></td>';
            html+= '</tr>';
            html+= '</table>';

            $('#plannedDialog').html(html);
            $('#plannedDialog').dialog({
                modal:    true,
                width:    400,
                position: { my: "center top", at: "center top+200"},
                close:    function(event, ui) { $('#plannedDialog').dialog('close').dialog('destroy'); $('#plannedDialog').html(''); },
                buttons: [
                    {
                        text:  'Save',
                        id:    'save-planned-template',
                        click: function() { Planned.savePlannedEditComment(command) },
                    },
                    {
                        text:  'Cancel',
                        click: function() { $('#plannedDialog').dialog('close'); },
                    }
                ],
            });
        });
        $(document).on('keypress', '#edit_planned_comment', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
        $(document).on('keypress', '#edit_planned_host', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
        $(document).on('keypress', '#edit_planned_service', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
        $(document).on('keypress', '#planned_host', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
        $(document).on('keypress', '#planned_service', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
        $(document).on('keypress', '#planned_status', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
        $(document).on('keypress', '#planned_time', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
        $(document).on('keypress', '#planned_comment', function(e) {
            if (e.keyCode && e.keyCode == 13) {
                $(document).find('#save-planned-template').trigger('click');
            }
        });
    }
}
Grouping = {
    redrawInfo: function() {
        $('#mainTable thead tr').not(':first').remove();

        this.sortChildren();
        this.prepareParents();
        this.checkQuickAckIcons();

        Search.filterDataTable(localStorage.getItem('searchValue'));
    },
    checkQuickAckIcons: function() {
        var count = 0,
            icon  = '',
            name  = '';

        for (var key in this.listGroups) {
            for (var i = 0; i < this.listGroups[key].children.length; i++) {
                if (!i) {
                    icon = this.listGroups[key].children[i].full.service.qUAck;
                }

                if (this.listGroups[key].children[i].full.service.qUAck && this.listGroups[key].children[i].full.service.qUAck == icon) {
                    icon = this.listGroups[key].children[i].full.service.qUAck;
                    name = this.listGroups[key].children[i].full.service.qAuth;
                    count++;
                }
            }
        }

        if (count && icon && count == this.listGroups[key].children.length) {
            $('#mainTable thead tr[data-group="'+ key +'"][data-group-type="parent"] .quickAckUnAckIcon').html('<img class="icons quickUnAckGroup" src="https://www.gravatar.com/avatar/'+ icon +'?size=20" width="19" height="19" alt="'+ name +' unack" title="'+ name +' unack" />');
        }
    },
    setInfo: function(data) {
        this.clearData();
        this.fillAditionalInfo(data.additional);
        this.fillHostsAndServices(data.data);
        this.countHosts();
        this.countServices();
        this.prepareData(data.data);

        return this.listReturn;
    },
    clearData: function() {
        this.services = [];
        this.hosts = [];
        this.hostsCount = [];
        this.servicesCount = [];
        this.listByHost = [];
        this.listByService = [];
        this.listReturn = [];
        this.listGroups = [];
        this.listGroupsComments = [];
        this.listGroupsStatusInformation = [];

        $('#mainTable thead tr').not(':first').remove();
    },
    fillAditionalInfo: function(data) {
        this.groupByHost = parseInt(data.groupByHost);
        this.groupByService = parseInt(data.groupByService);
    },
    fillHostsAndServices: function(data) {
        for (var i = 0; i < data.length; i++) {
            this.services.push(data[i].service.name);
            this.hosts.push(data[i].host.name);
        }
    },
    countHosts: function() {
        var counts = [];

        for (var i = 0; i < this.hosts.length; i++) {
            counts[this.hosts[i]] = 1 + (counts[this.hosts[i]] || 0);
        }

        for (var i in counts){
            if (counts[i] >= this.groupByHost) {
                this.hostsCount[i] = counts[i];
            }
        }
    },
    countServices: function() {
        var counts = [];

        for (var i = 0; i < this.services.length; i++) {
            counts[this.services[i]] = 1 + (counts[this.services[i]] || 0);
        }

        for (var i in counts){
            if (counts[i] >= this.groupByService) {
                this.servicesCount[i] = counts[i];
            }
        }
    },
    returnEmptyTheadObj: function() {
        return {
            'type':           null,
            'service':        null,
            'host':           null,
            'count':          null,
            'status':         null,
            'statusOrder':    null,
            'lastCheck':      null,
            'lastCheckOrder': null,
            'duration':       null,
            'durationOrder':  null,
            'information':    null,
            'comment':        null,
            'groupBy':        null,
            'isHost':         null,
            'state':          null
        };
    },
    prepareData: function(data) {
        for (var i = 0; i < data.length; i++) {
            var toReturn = true;

            if (this.hostsCount[data[i].host.name] !== undefined) {
                var host  = data[i].host.name,
                    tab   = data[i].host.tab,
                    count = this.hostsCount[data[i].host.name],
                    key   = host + '|||' + count;

                if (this.listGroups[key] === undefined) {
                    this.listGroups[key] = {
                        data: this.returnEmptyTheadObj(),
                        children: []
                    };

                    this.listGroups[key].data.service = count;
                    this.listGroups[key].data.host    = host;
                    this.listGroups[key].data.count   = count;
                    this.listGroups[key].data.type    = 'host';
                    this.listGroups[key].data.tab     = tab;
                    this.listGroups[key].data.abbreviation_name = data[i].abbreviation.name;
                    this.listGroups[key].data.abbreviation_abb = data[i].abbreviation.abb;
                }

                this.listGroups[key].children.push(data[i]);
                toReturn = false;
            }

            if (this.servicesCount[data[i].service.name] !== undefined) {
                var service = data[i].service.name,
                    tab     = data[i].host.tab,
                    count   = this.servicesCount[data[i].service.name],
                    key     = count + '|||' + service;

                if (this.listGroups[key] === undefined) {
                    this.listGroups[key] = {
                        data: this.returnEmptyTheadObj(),
                        children: []
                    };

                    this.listGroups[key].data.service = service;
                    this.listGroups[key].data.host    = count;
                    this.listGroups[key].data.count   = count;
                    this.listGroups[key].data.type    = 'service';
                    this.listGroups[key].data.tab     = tab;
                    this.listGroups[key].data.abbreviation_name = data[i].abbreviation.name;
                    this.listGroups[key].data.abbreviation_abb = data[i].abbreviation.abb;
                }

                this.listGroups[key].children.push(data[i]);
                toReturn = false;
            }

            if (toReturn) {
                this.listReturn.push(data[i]);
            }
        }
    },
    drawGrouping: function() {
        this.sortParents();
        this.sortChildren();
        this.setAbbreviation();
        this.prepareParents();
        this.checkQuickAckIcons();

        for (var key in this.listGroups) {
            $('#mainTable thead tr[data-group="' + key + '"][data-group-type="parent"] .status_information').text(Grouping.returnStatusInformation(key));
            $('#mainTable thead tr[data-group="' + key + '"][data-group-type="parent"] .comment .likeTable .ack.text').html(Grouping.returnComments(key));
            $('#mainTable thead tr[data-group="' + key + '"][data-group-type="parent"] .comment .likeTable .sched.text').html(Grouping.returnComments(key));
        }
    },
    setAbbreviation: function() {
        for (var key in this.listGroups) {
            var abbreviations = 0,
                childrens = this.listGroups[key].children.length;

            for (var i = 0; i < childrens; i++) {
                if (this.listGroups[key].data.abbreviation_name == this.listGroups[key].children[i].full.abbreviation.name) {
                    abbreviations++;
                }
            }

            if (abbreviations != childrens) {
                this.listGroups[key].data.abbreviation_name = '';
                this.listGroups[key].data.abbreviation_abb = '';
            }
        }
    },
    sortParents: function() {
        var tmp = [];

        for (var key in this.listGroups) {
            var item = this.listGroups[key];

            item.key = key;
            tmp.push(item);
        }
        tmp.sort(function(a,b) {
            if (parseInt(a.data.count) < parseInt(b.data.count)) {
                return 1;
            } else if (parseInt(a.data.count) > parseInt(b.data.count)) {
                return -1;
            } else if (parseInt(a.data.statusOrder) < parseInt(b.data.statusOrder)) {
                return 1;
            } else if (parseInt(a.data.statusOrder) > parseInt(b.data.statusOrder)) {
                return -1;
            } else if (parseInt(a.data.durationOrder) < parseInt(b.data.durationOrder)) {
                return 1;
            } else if (parseInt(a.data.durationOrder) > parseInt(b.data.durationOrder)) {
                return -1;
            } else {
                return 0;
            }
        });

        var result = {};

        for (var i = 0; i < tmp.length; i++) {
            result[tmp[i].key] = tmp[i];
        }

        this.listGroups = result;
    },
    fillEmptyValues: function(key, childrenNewData) {
        this.listGroups[key].data.comment        = childrenNewData.comment;
        this.listGroups[key].data.duration       = childrenNewData.duration;
        this.listGroups[key].data.durationOrder  = childrenNewData.durationOrder;
        this.listGroups[key].data.groupBy        = childrenNewData.groupBy;
        this.listGroups[key].data.information    = childrenNewData.information;
        this.listGroups[key].data.isHost         = childrenNewData.isHost;
        this.listGroups[key].data.lastCheck      = childrenNewData.lastCheck;
        this.listGroups[key].data.lastCheckOrder = childrenNewData.lastCheckOrder;
        this.listGroups[key].data.state          = childrenNewData.state;
        this.listGroups[key].data.status         = childrenNewData.status;
        this.listGroups[key].data.statusOrder    = childrenNewData.statusOrder;
    },
    sortChildren: function() {
        for (var key in this.listGroups) {
            this.listGroups[key].data.greyText      = 0;
            this.listGroups[key].data.plannedAvatar = '';
            this.listGroups[key].data.blueText      = 0;
            this.listGroups[key].data.brownText     = 0;
            this.listGroupsComments[key] = [];
            this.listGroupsStatusInformation[key] = [];

            for (var i = 0; i < this.listGroups[key].children.length; i++) {
                var childrenNewData = this.returnEmptyTheadObj(),
                    item            = this.listGroups[key].children[i];

                if (typeof item.full !== 'undefined') {
                    item = item.full;
                }

                childrenNewData.type           = item.host.host;
                childrenNewData.service        = item.service.name;
                childrenNewData.host           = item.host.name;
                childrenNewData.count          = this.listGroups[key].data.count;
                childrenNewData.status         = item.status.name;
                childrenNewData.statusOrder    = item.status.order;
                childrenNewData.lastCheck      = item.last.name;
                childrenNewData.lastCheckOrder = item.last.order;
                childrenNewData.duration       = item.duration.name;
                childrenNewData.durationOrder  = item.duration.order;
                childrenNewData.information    = item.info;
                childrenNewData.isHost         = item.host.host;
                childrenNewData.state          = item.state;
                childrenNewData.comment        = (Search.currentTab == 'acked') ? item.comment.ack : ((Search.currentTab == 'sched') ? item.comment.sched : '');
                childrenNewData.groupBy        = (Number.isInteger(this.listGroups[key].data.service)) ? item.service.name.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase() : item.host.name.replace(/[^a-z0-9 ]/gi,'').replace(/\s/g, '-').toLowerCase();
                childrenNewData.greyText       = false;
                childrenNewData.blueText       = false;
                childrenNewData.brownText      = false;

                this.listGroupsComments[key].push(childrenNewData.comment);
                this.listGroupsStatusInformation[key].push(childrenNewData.information.name);

                if (item.service.sched) {
                    this.listGroups[key].data.greyText++;
                    childrenNewData.greyText = true;
                }
                if (item.service.pAuth) {
                    this.listGroups[key].data.plannedAvatar = item.service.pAuth;
                }
                if (item.service.info && (item.state == 'WARNING' || item.state == 'UNKNOWN')) {
                    this.listGroups[key].data.blueText++;
                    childrenNewData.blueText = true;
                }
                if (item.service.info && item.state == 'CRITICAL') {
                    this.listGroups[key].data.brownText++;
                    childrenNewData.brownText = true;
                }

                if (!i) {
                    this.fillEmptyValues(key, childrenNewData);
                }

                if (i) {
                    if (this.listGroups[key].data.statusOrder < childrenNewData.statusOrder) {
                        this.listGroups[key].data.statusOrder = childrenNewData.statusOrder;
                        this.listGroups[key].data.status      = childrenNewData.status;
                        this.listGroups[key].data.state       = childrenNewData.state;
                    }

                    if (this.listGroups[key].data.durationOrder < childrenNewData.durationOrder) {
                        this.listGroups[key].data.durationOrder = childrenNewData.durationOrder;

                        if (childrenNewData.duration) {
                            this.listGroups[key].data.duration = childrenNewData.duration;
                        }
                    }

                    if (this.listGroups[key].data.lastCheckOrder > childrenNewData.lastCheckOrder) {
                        this.listGroups[key].data.lastCheckOrder = childrenNewData.lastCheckOrder;
                        this.listGroups[key].data.lastCheck      = childrenNewData.lastCheck;
                    }
                }

                var allValues = item;

                if (typeof allValues.full !== 'undefined') {
                    delete allValues.full;
                }

                this.listGroups[key].children[i]      = childrenNewData;
                this.listGroups[key].children[i].full = allValues;
            }
        }
    },
    uniq: function(a) {
        return a.sort().filter(function(item, pos, ary) {
            return !pos || item != ary[pos - 1];
        })
    },
    returnStatusInformation: function(key) {
        var statuses = this.uniq(this.listGroupsStatusInformation[key]);
        var status = '';

        if (statuses.length < 2) {
            status = statuses[0];
        }

        return status;
    },
    returnComments: function(key) {
        var comments = this.uniq(this.listGroupsComments[key]);
        var comment = '';

        if (comments.length < 2) {
            comment = comments[0];
        }

        return comment;
    },
    prepareParents: function() {
        for (var key in this.listGroups) {
            $('#mainTable thead').append(this.returnParentHtml(key));

            this.returnChildHtml(key);
        }
    },
    returnParentHtml: function(key) {
        var rowData        = this.listGroups[key].data,
            trClass        = rowData.state,
            groupNameSmall = key,
            hostValue      = (rowData.type != 'service') ? rowData.host : rowData.count,
            serviceValue   = (rowData.type == 'service') ? rowData.service : rowData.count,
            css            = ' style="text-align: center; font-size: 12px; font-weight: bold;"',
            contains       = (rowData.type == 'service') ? rowData.service : rowData.host,
            liClass        = (Search.currentTab == 'acked') ? 'unAckIcon' : 'quickAckUnAckIcon',
            liImgClass     = (Search.currentTab == 'acked') ? 'unAckGroup' : 'quickAckGroup',
            liImgSrc       = (Search.currentTab == 'acked') ? 'list-unack-icon' : 'list-qack-icon',
            liImgTitle     = (Search.currentTab == 'acked') ? 'Unacknowledge All Services' : 'Quick Acknowledge',
            subRows        = this.listGroups[key].children.length,
            subRowsGrey    = rowData.greyText,
            mainGreyClass  = (subRowsGrey == subRows) ? ' grey-text' : '',
            avatar         = (mainGreyClass) ? rowData.plannedAvatar : '',
            subRowsBlue    = rowData.blueText,
            subRowsBrown   = rowData.brownText,
            subRowsInfo    = ((subRowsBlue + subRowsBrown) == subRows) ? true : false,
            subRowsClass   = (subRowsInfo) ? ((subRowsBrown) ? ' brown-text' : ' blue-text') : '',
            ackIconBlock   = '<li><span class="icons acknowledgeItGroup list-ack-icon" alt="Acknowledge this Service" title="Acknowledge this Service"></span></li>',
            schedIconBlock = '<li><span class="icons scheduleItGroup list-sched-icon" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></span></li>';

        if (avatar) {
            var quickAck = '<li><img class="icons" src="https://www.gravatar.com/avatar/'+ avatar +'?size=20"></li>';
        } else {
            var quickAck = '<li class="'+ liClass +'"><span class="icons '+ liImgClass +' '+ liImgSrc +'" alt="'+ liImgTitle +'" title="'+ liImgTitle +'"></span></li>';
        }

        return '' +
            '<tr class="group-list group-list-bottom" data-group="' + groupNameSmall + '" data-group-type="parent">' +
            '	<td class="abb" title="'+ rowData.abbreviation_name +'"><span>'+ rowData.abbreviation_abb +'</span></td>' +
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
            '	<td class="status_information '+ trClass + mainGreyClass + subRowsClass +'">'+ rowData.information.name +'</td>' +
            '	<td class="comment '+ trClass + mainGreyClass + subRowsClass +'">' +
            '		<div class="likeTable">' +
            '			<ul>' +
            '				<li class="ack text">' + rowData.comment + '</li>' +
            '				<li class="ack"><em class="edit_acknowledgeGroup" alt="Edit comment" title="Edit comment"></em></li>' +
            '				<li class="sched text">' + rowData.comment + '</li>' +
            '				<li class="sched"><em class="edit_scheduleGroup" alt="Edit comment" title="Edit comment"></em></li>' +
            '			</ul>' +
            '		</div>' +
            '	</td>' +
            '	<td class="more '+ trClass + mainGreyClass + subRowsClass +'"><button class="button-more">></button></td>' +
            '</tr>';
    },
    returnChildHtml: function(key) {
        var result = '';

        if (localStorage.getItem(Search.currentTab + '_' + key)) {
            var prevHost = '';

            for (var i = 0; i < this.listGroups[key].children.length; i++) {
                var item = this.listGroups[key].children[i].full,
                    hostVisibility = (prevHost != item.host.name) ? 'visible' : 'hidden',
                    greyTextClass = (item.service.sched) ? ' grey-text' : '',
                    blueTextClass = (item.service.info && (item.state == 'WARNING' || item.state == 'UNKNOWN')) ? ' blue-text' : '',
                    brownTextClass = (item.service.info && item.state == 'CRITICAL') ? ' brown-text' : '',
                    colorClass = greyTextClass + blueTextClass + brownTextClass;

                prevHost = item.host.name;

                result += '<tr data-service="'+ item.service.original +'" role="row" class="even" data-group="'+ key +'" data-group-type="child">';
                result += '<td class="abb"><span title="'+ item.abbreviation.name +'">'+ item.abbreviation.abb +'</span></td>';

                //host
                result += '<td class="host '+ colorClass +'" style="visibility: '+ hostVisibility +';"><a data-tab="'+ item.host.tab +'" data-host="'+ item.host.host +'" href="'+ item.host.url +'" target="_blank">'+ item.host.name +'</a><span class="hide-more"><br><span class="more-info-icon"></span><span class="more-comment-icon"></span></span></td>';

                //service
                var unAck = (item.service.unAck)           ? '<li><span class="list-unack-icon icons unAck" alt="Unacknowledge this Service" title="Unacknowledge this Service"></span></li>' : '',
                    down  = (item.service.down)            ? '<li><span class="list-downtime-icon"></span></li>' : '',
                    notes = (item.service.notes)           ? '<li><a href="'+ item.service.notes +'" target="_blank" class="list-notes-icon"></a></li>' : '',
                    pAuth = (item.service.pAuth)           ? '<img class="icons" src="https://www.gravatar.com/avatar/'+ item.service.pAuth +'?size=20" width="19" height="19" />' : '',
                    qAck  = (item.service.qAck && !pAuth)  ? '<span class="list-qack-icon icons quickAck" alt="Quick Acknowledge" title="Quick Acknowledge"></span></li>' : '',
                    qUAck = (item.service.qUAck && !pAuth) ? '<img class="icons quickUnAck" src="https://www.gravatar.com/avatar/'+ item.service.qUAck +'?size=20" width="19" height="19" alt="'+ item.service.qAuth +' unack" title="'+ item.service.qAuth +' unack" />' : '',
                    ack   = '<li><span class="list-ack-icon icons acknowledgeIt" alt="Acknowledge this Service" title="Acknowledge this Service"></span></li>',
                    sched = (item.service.schedPlanned) ? '<li><span class="list-sched-icon icons scheduleIt" data-id="'+ item.service.downId +'" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></span></li>' : '';

                result += '<td class="service '+ item.state + colorClass +'">';
                if (item.service.pending) {
                    result += '' +
                        '<div class="likeTable">' +
                        '	<ul>' +
                        '		<li><a href="'+ item.service.url +'" class="service-name">'+ item.service.name +'</a></li>' +
                        '		<li><span class="list-recheck-icon icons recheckIt" alt="Refresh Service Status" title="Refresh Service Status"></span></li>' +
                        notes  +
                        '	</ul>' +
                        '</div>';
                }
                else {
                    result += '' +
                        '<div class="likeTable">' +
                        '	<ul>' +
                        '		<li><a href="'+ item.service.url +'" class="service-name">'+ item.service.name +'</a></li>' +
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
                }
                result += '</td>';

                //status
                result += '<td class="status '+ item.state + colorClass + ' ' + item.status.origin +'">'+ item.status.name +'</td>';

                //last check
                result += '<td class="last_check '+ item.state + colorClass +'">'+ item.last.name +'</td>';

                //duration
                result += '<td class="duration '+ item.state + colorClass +'">';
                if (Search.currentTab == 'sched') {
                    result += '<span title="Check triggered" style="cursor: pointer;">' + item.duration.name + '</span><br /><span title="Remaining downtime" style="cursor: pointer;">' + item.duration.end + '</span>';
                }
                else {
                    result += item.duration.name;
                }
                result += '</td>';

                //status information
                result += '<td class="status_information main '+ item.state + colorClass +'">';
                if (item.info.pending) {
                    result += 'Scheduled: ' + moment.unix(item.info.next).format('YYYY-MM-DD hh:mm:ss');
                }
                else if (item.info.planned && Search.currentTab == 'normal') {
                    var hide = (item.info.comment) ? '' : 'display:none;',
                        comment = '<p style="margin:0;'+ hide +'">Comment: <span>' + item.info.comment + '</span></p>',
                        commentEdit = (item.info.schedPlanned) ? ('<li class="planned"><em class="edit_planned_comment" data-command="'+ encodeURIComponent(item.info.command) +'" alt="Edit comment" title="Edit comment"></em></li>') : '';

                    result += '' +
                        '<div class="likeTable">' +
                        '	<ul>' +
                        '		<li class="planned text">' + comment + item.info.name + '</li>' +
                        '		' + commentEdit +
                        '	</ul>' +
                        '</div>'
                    ;
                }
                else {
                    result += item.info.name;
                }
                result += '</td>';

                //comment
                result += '<td class="comment '+ item.state + colorClass +'">';
                var showEdit = (item.comment.schedPlanned) ? '<li class="sched"><em class="edit_scheduleIt" alt="Edit comment" title="Edit comment"></em></li>' : '';
                result += '' +
                    '<div class="likeTable">' +
                    '	<ul>' +
                    '		<li class="ack text">' + item.comment.ack + '</li>' +
                    '		<li class="ack"><em class="edit_acknowledgeIt" alt="Edit comment" title="Edit comment"></em></li>' +
                    '		<li class="sched text" data-start="'+ item.comment.start +'" data-end="'+ item.comment.end +'" data-duration="'+ item.comment.duration +'">' + item.comment.sched + '</li>' +
                    showEdit +
                    '	</ul>' +
                    '</div>'
                ;
                result += '</td>';

                //more
                result += '<td class="more '+ item.state + colorClass +'"><button class="button-more">></button></td>';
                result += '</tr>';
            }
        }

        if (result) {
            result += ''+
                '<tr data-group="'+ key +'" data-group-type="space">' +
                '	<td class="host no-border-th">&nbsp;</td>' +
                '	<td class="service no-border-th">&nbsp;</td>' +
                '	<td class="status no-border-th">&nbsp;</td>' +
                '	<td class="last_check no-border-th">&nbsp;</td>' +
                '	<td class="duration no-border-th">&nbsp;</td>' +
                '	<td class="status_information no-border-th">&nbsp;</td>' +
                '	<td class="comment no-border-th">&nbsp;</td>' +
                '	<td class="more no-border-th">&nbsp;</td>' +
                '</tr>';
            $('#mainTable thead tr[data-group="'+ key +'"][data-group-type="parent"]').after(result);

            Search.recheckIcons();
            Search.checkResizedIcons();
        }
    },
    removeChildHtml: function(key) {
        $('#mainTable thead tr[data-group="'+ key +'"]:not([data-group-type="parent"])').remove();
    },
    returnIds: function(key) {
        var ids = [],
            requests = [];

        for (var i = 0; i < this.listGroups[key].children.length; i++) {
            var down_id = this.listGroups[key].children[i].full.service.downId;
            var tab     = this.listGroups[key].children[i].full.host.tab;

            if (down_id) {
                down_id = down_id.split(',');

                for (var a = 0; a < down_id.length; a++) {
                    if (ids.indexOf(down_id[a]) === -1) {
                        requests.push({ 'down_id': down_id[a], 'isHost': this.listGroups[key].children[i].isHost, 'tab': tab });
                        ids.push(down_id[a]);
                    }
                }
            }
        }

        return [ids, requests];
    },
    init: function() {
        $(document).on('click', '.group-list', function () {
            var attr = $(this).attr('data-group');

            if (localStorage.getItem(Search.currentTab + '_' + attr)) {
                localStorage.removeItem(Search.currentTab + '_' + attr);
                Grouping.removeChildHtml(attr);
            } else {
                localStorage.setItem(Search.currentTab + '_' + attr, true);
                Grouping.returnChildHtml(attr);
            }
        });
        $('#grouping option[value="'+ Search.currentGroup +'"]').attr('selected', 'selected');
        $('#grouping').selectmenu({
            select: function (event, data) {
                localStorage.setItem('currentGroup', data.item.value);
                Search.currentGroup = localStorage.getItem('currentGroup');

                Search.allDataTable.ajax.url('json_new.php?server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function() {
                    Search.resetAgo();
                    Planned.showHidePlanned();
                }).order(Search.orderBy[Search.currentTab]);
            }
        });

        $('#mainTable').on('click', 'thead .quickAckGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'quickAck',
                    'what':    'group',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'tab' : '',
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});

            return false;
        });
        $('#mainTable').on('click', 'thead .quickUnAckGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'quickUnAck',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});

            return false;
        });
        $('#mainTable').on('click', 'thead .recheckItGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'recheckIt',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});

            return false;
        });
        $('#mainTable').on('click', 'thead .unAckGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'unAck',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});

            return false;
        });
        $('#mainTable').on('click', 'thead .unAcknowledgeItGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'unAcknowledgeIt',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            $.when(Search.tempHideButtons(key)).then(function(){Search.prepareSendData(key)});

            return false;
        });
        $('#mainTable').on('click', 'thead .acknowledgeItGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'acknowledgeIt',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            lastKeyValue = key;
            Search.tempHideButtons(key);
            $('#dialogAck').dialog('open');
            Search.returnComments('#dialogAck', key);

            return false;
        });
        $('#mainTable').on('click', 'thead .edit_acknowledgeGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'acknowledgeIt',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            lastKeyValue = key;
            Search.tempHideButtons(key);
            $('#dialogAck').dialog('open');
            Search.returnComments('#dialogAck', key);
            Search.editComment = true;

            return false;
        });
        $('#mainTable').on('click', 'thead .scheduleItGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'scheduleIt',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            lastKeyValue = key;
            Search.tempHideButtons(key);
            $('#dialog').dialog('open');
            Search.returnComments('#dialog', key);

            return false;
        });
        $('#mainTable').on('click', 'thead .edit_scheduleGroup', function () {
            var host    = $(this).closest('tr').find('.host').text(),
                service = $(this).closest('tr').find('.service ul li:first').text(),
                key     = Search.changeWhatWeChangeObject({
                    'type':    'scheduleIt',
                    'what':    'group',
                    'tab' : '',
                    'host':    (host    == parseInt(host))    ? '' : host,
                    'service': (service == parseInt(service)) ? '' : service,
                    'key': $(this).closest('tr').attr('data-group'),
                });

            lastKeyValue = key;
            Search.tempHideButtons(key);
            Search.editComment = true;
            Search.editCommentText = Search.returnCommentText($(this).closest('td').find('.sched.text').text());
            $('#dialog').dialog('open');
            Search.returnComments('#dialog', key);

            return false;
        });
    }
};
History = {
    tableData: {},
    serversList: '',
    init: function() {
        if (!Search.currentServerTab) {
            Search.currentServerTab = 'All';
        }

        if (!Search.currentTab) {
            Search.currentTab = 'normal';
        }

        this.getServersList();
        this.drawButtons();
        this.drawDatePickers();
        this.getHistoryData();

        $('#alerts').on('click', function() {
            window.location = window.location.href.split('?')[0];
        });

        $(document).on('click', '.ui-datepicker-close', function() {
            var value = $('#history_date').val();

            if (value.length > 10 && Date.parse(value) != 'NaN') {
                window.location = window.location.href.split('?')[0] + "?t=" + (Date.parse(value) / 1000);
            }
        });
        $('#normal, #acked, #sched').on('click', function() {
            if (Search.currentTab != $(this).attr('id')) {
                Search.currentTab = $(this).attr('id');
                localStorage.setItem('currentTabNew', Search.currentTab);

                History.drawTable();
            }
        });
    },
    drawButtons: function() {
        $('#' + Search.currentTab).prop('checked', true);
        $('#history').prop('checked', true);
        $('#EMERGENCY, #EMERGENCY-label, #hosts, #hosts-label, #planned, #planned-label, #radio .xs-hide').hide();
        $('#radio').buttonset();
        $('#radio-switch').buttonset();

        $('#loading, #refreshTime, #normalGrouping, #mainTable').hide();
        $('#updatedAgo').closest('p').hide();
        $('#infoHolder, #historyContent').show();
    },
    drawDatePickers: function() {
        this.getTimestamp();

        var dateTimePickerSettings = {
            timeFormat: 'HH:mm',
            dateFormat: 'yy-mm-dd',
            controlType: 'select',
            oneLine: true
        }

        if (this.timestamp) {
            $('#history_date').val(this.date);
            dateTimePickerSettings.defaultValue = this.date;
        }

        $('#history_date').datetimepicker(dateTimePickerSettings);
    },
    drawTabsList: function() {
        var tabsList = '';
        var tabsData = this.serversList.split(',');

        $(tabsData).each(function (key, value) {
            var selected = (Search.currentServerTab == value) ? 'selected="selected"' : '';

            tabsList += '<option value="'+ value +'" '+ selected +'>Server: '+ value +'</option>';
        });

        $('#tabsSelect').html(tabsList);
        $('#tabsSelect').selectmenu({
            select: function (event, data) {
                if (Search.currentServerTab != data.item.value) {
                    Search.currentServerTab = data.item.value;
                    localStorage.setItem('currentServerTab', Search.currentServerTab);
                    $('#tabs select option[value="'+ Search.currentServerTab +'"]').attr('selected', 'selected');
                    $('#tabsSelect').selectmenu('refresh');

                    History.drawTable();
                }
            }
        });
    },
    drawTable: function() {
        var data = History.tableData;
        var server = Search.currentServerTab;
        var severity = Search.currentTab;

        var table = "";
        table += "<table class='history-table'>";
        table += "<tr>";
        table += "<th class='abb-th'></th>";
        table += "<th class='host-th'>Host</th>";
        table += "<th class='service-th'>Service</th>";
        table += "<th class='status-th'>State</th>";
        table += "<th class='last_check-th'>Date</th>";
        table += "<th class='severity-th'>Severity</th>";
        table += "<th class='user-th'>User</th>";
        table += "<th class='status_information-th'>Output</th>";
        if (Search.currentTab != 'normal') {
            table += "<th class='comment-th'>Comment</th>";
        }

        table += "</tr>";

        for (var i = 0; i < data[server][severity].length; i++) {
            var state = data[server][severity][i]['state'];
            var severityTmp = (data[server][severity][i]['severity'] == 'planned_downtime') ? "planned" : data[server][severity][i]['severity'];
            var userIcon = (data[server][severity][i]['avatar']) ? ('<img class="icons quickUnAck" src="https://www.gravatar.com/avatar/'+ data[server][severity][i]['avatar'] +'?size=20" width="19" height="19" />') : '';
            var service = '<div class="likeTable"><ul><li>' + data[server][severity][i]['service'] + '</li><li>' + userIcon + '</li></ul></div>';

            var info = '';
            if (data[server][severity][i]['info']) {
                if (state == 'WARNING' || state == 'UNKNOWN') {
                    info = ' blue-text';
                } else {
                    info = ' brown-text';
                }
            }

            table += "<tr>";
            table += "<td class='abb'><span title='"+ server +"'>"+ data[server][severity][i]['server'].charAt(0) +"</span></td>";
            table += "<td class='host "+ state + info +"'>"+ data[server][severity][i]['host'] +"</td>";
            table += "<td class='service "+ state + info +"'>"+ service +"</td>";
            table += "<td class='status "+ state + info +"'>"+ state.toUpperCase() +"</td>";
            table += "<td class='last_check "+ state + info +"'>"+ data[server][severity][i]['date'] +"</td>";
            table += "<td class='severity "+ state + info +"'>"+ severityTmp +"</td>";
            table += "<td class='user "+ state + info +"'>"+ ((data[server][severity][i]['user']) ? data[server][severity][i]['user'] : '') +"</td>";
            table += "<td class='status_information "+ state + info +"'>"+ data[server][severity][i]['output'] +"</td>";
            if (Search.currentTab != 'normal') {
                table += "<td class='comment " + state + info + "'>" + data[server][severity][i]['comment'] + "</td>";
            }
            table += "</tr>";
        }

        table += "</table>";

        $('#historyContent .historyText').html(table);

        $("span[title]").tooltip({ track: true });
        $(".ui-tooltip").remove();

        History.setCounts();
    },
    getTimestamp: function() {
        this.timestamp = null;

        if (getParameterByName('t')) {
            var date = getParameterByName('t');

            if (date.length == 10 && parseInt(date).toString() == date) {
                this.timestamp = parseInt(date);
            } else if (date.length > 10 && Date.parse(date) != 'Nan') {
                this.timestamp = Date.parse(date) / 1000;
            }
        }

        this.date = this.returnMysqlDate(new Date(this.timestamp * 1000));
    },
    getServersList: function() {
        $.ajax({
            type:    'GET',
            url:     'history.php',
            data:    {'list': 'servers'},
            success: function(data){
                History.serversList = data.serversList;
                History.drawTabsList();
            }
        });
    },
    getHistoryData: function() {
        if (!this.timestamp) {
            return;
        }

        $.ajax({
            type:    'GET',
            url:     'history.php',
            data:    {'server': 'All', 'date': this.timestamp},
            success: function(data){
                History.tableData = data;
                History.drawTable();
            },
            error: function(data) {
                $('#historyContent .historyText').html("<h3><br />Bad request: " + data.responseText + "</h3>");
            },
            complete: function() {
                $('#loading').hide();
                $('#historyContent').show();
            }
        });
    },
    returnMysqlDate: function(d) {
        if (!d) {
            return "";
        }

        return [
                d.getFullYear(),
                (d.getMonth()+1).padLeft(),
                d.getDate().padLeft()
            ].join('-') + ' ' +
            [
                d.getHours().padLeft(),
                d.getMinutes().padLeft()
            ].join(':');
    },
    setCounts: function() {
        $('#normal-label .xs-hide').show();
        $('#normal-label .xs-hide em').text(History.tableData[Search.currentServerTab]['normal'].length);

        $('#acked-label .xs-hide').show();
        $('#acked-label .xs-hide em').text(History.tableData[Search.currentServerTab]['acked'].length);

        $('#sched-label .xs-hide').show();
        $('#sched-label .xs-hide em').text(History.tableData[Search.currentServerTab]['sched'].length);
    }
}

Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
}