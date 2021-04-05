if (!localStorage.getItem('currentTabNew')) {
	localStorage.setItem('currentTabNew', 'normal');
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
if (!localStorage.getItem('timeZone')) {
	localStorage.setItem('timeZone', 'browser');
}

var tmpTab    = localStorage.getItem('currentTabNew'),
    tmpServer = localStorage.getItem('currentServerTab'),
	tmpGroup  = localStorage.getItem('currentGroup'),
	tmpTimeZone  = localStorage.getItem('timeZone'),
	tmpsearchValue = localStorage.getItem('searchValue');
	
localStorage.clear();
localStorage.setItem('currentTabNew', tmpTab);
localStorage.setItem('currentGroup', tmpGroup);
localStorage.setItem('canceledReloads', '0');
localStorage.setItem('currentServerTab', tmpServer);
localStorage.setItem('searchValue', tmpsearchValue);
localStorage.setItem('timeZone', tmpTimeZone);

lastTime = (new Date()).getTime();
globalTime = 0;
globalReload = true;

Search = {
    additional: null,
    currentServerTab: localStorage.getItem('currentServerTab'),
    timeZone: localStorage.getItem('timeZone'),
    drawServersList: function() {
        var tabsList = '';

        $(this.additional.tabsList).each(function (key, value) {
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
    drawTimeZonesList: function() {
        var tzList = '';

        $(this.additional.timeZonesList).each(function (key, value) {
            var selected = (Search.timeZone == encodeURI(value)) ? 'selected="selected"' : '';
            tzList += '<option value="'+ encodeURI(value) +'" '+ selected +'>TZ: '+ value +'</option>';
        });

        $('#timeZoneBlock').css('clear', 'both').show();
        $('#timeZoneSelect').html(tzList);
        $('#timeZoneSelect').selectmenu({
            select: function (event, data) {
                if (Search.timeZone != data.item.value) {
                    Search.stopReloads();
                    localStorage.setItem('timeZone', data.item.value);
                    Search.timeZone = localStorage.getItem('timeZone');
                    Search.getNewData();
                }
            }
        });
    },
    calculateAgoText: function(from) {
        var to = moment.utc().unix(),
            from = parseInt(from),
            diff = to - from;

        var hours = diff/3600;
        hours = parseInt(hours);
        diff = diff % (3600);

        var min = parseInt(diff/60);
        min = parseInt(min);
        diff = diff % (60);

        var sec = parseInt(diff);

        var text = "";

        if (hours) {
            text += hours + "h ";
        }

        if (min) {
            text += min + "m ";
        }

        text += sec + "s";

        return text;
    },
    getServerErrors: function() {
        $.ajax({
            url:    'server_errors.php?server_tab=' + Search.currentServerTab,
            method: 'GET',
        }).success(function(data) {
            $('#server-errors').html(data);
        }).always(function(data) {
            setTimeout(function(){ Search.getServerErrors(); }, 3000);
        });
    },
    getTotalTableItems: function() {
        return Search.tableLength + Grouping.getGroupChildrenLength();
    },
    extension: function () {
        if (localStorage.getItem('searchValue') && Search.getTotalTableItems() && !$('#ext_search').length) {
            $('#mainTable_filter').after('<div id="ext_search"></div>');
            $('#ext_search').append('<span id="'+ Search.quickAckButtonId +'" class="list-qack-icon" alt="Quick Acknowledge All" title="Quick Acknowledge All"></span>');
            $('#ext_search').append('<img id="'+ Search.quickUnAckButtonId +'" src="https://www.gravatar.com/avatar/'+ Search.avatarUrl +'?size=20" width="19" height="19" alt="Quick UnAcknowledge All" title="Quick Unacknowledge All">');
            $('#ext_search').append('<span id="'+ Search.ackButtonId +'" class="list-ack-icon" alt="Acknowledge All Services" title="Acknowledge All Services"></span>');
            $('#ext_search').append('<span id="'+ Search.sdButtonId +'" class="list-sched-icon" alt="Schedule Downtime for All Services" title="Schedule Downtime for All Services"></span>');
            $('#ext_search').append('<span id="'+ Search.recheckButtonId +'" class="list-recheck-icon" alt="Force recheck" title="Force recheck"></span>');
            $('#ext_search').append('<span id="edit_acknowledge" class="list-edit-icon" alt="Edit comment" title="Edit comment"></span>');
            $('#ext_search').append('<span id="edit_scheduled" class="list-edit-icon" alt="Edit comment" title="Edit comment"></span>');
        }
        Search.extensionVisibility();
    },
    extensionVisibility: function () {
        if (localStorage.getItem('searchValue') && Search.getTotalTableItems() && Search.currentTab != 'hosts') {
            $(Search.filterButtons).show();

            var unackedItems = Grouping.countUnackedItems() + $('#mainTable tbody .icons.quickAck, #mainTable tbody .icons.quickUnAck:not([src*="'+ Search.avatarUrl +'"])').length;
            var ackedItems = Grouping.countAckedItems() + $('#mainTable tbody .icons.quickUnAck').length;

            (Search.currentTab != 'acked' && Search.currentTab != 'sched' && unackedItems) ? $('#'+ Search.quickAckButtonId).show() : $('#'+ Search.quickAckButtonId).hide();
            (Search.currentTab != 'acked' && Search.currentTab != 'sched' && ackedItems) ? $('#'+ Search.quickUnAckButtonId).show() : $('#'+ Search.quickUnAckButtonId).hide();
            $('#edit_acknowledge').toggle(Search.currentTab == 'acked');
            $('#edit_scheduled').toggle(Search.currentTab == 'sched');
        }
        else {
            $(Search.filterButtons + ', #edit_acknowledge, #edit_scheduled').hide();
        }
    }
}

Search.whatWeChangeObject      = [{}];
Search.whatWeChangeDataObject  = [{}];
Search.hideMoreArray           = [];
Search.currentTab              = localStorage.getItem('currentTabNew');
Search.currentGroup            = localStorage.getItem('currentGroup');
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
Search.allDataTable       = (getParameterByName('info') || getParameterByName('emergency') || getParameterByName('t') || getParameterByName('stats') || getParameterByName('users')) ? false : $('#mainTable').DataTable({
		'paging':      false,
		'ordering':    true,
		'order':       Search.orderBy[Search.currentTab],
        'ajax': {
            url: 'json_new.php?current_user='+ $('#userName').text() +'&time_correction_type='+ Search.timeZone +'&time_correction_diff='+ moment().utcOffset() +'&server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue'),
            dataFilter: function(data){
                var tabsArray = ['normal', 'acked', 'sched'];

                if (parseInt(Search.currentGroup) && tabsArray.indexOf(Search.currentTab) !== -1) {
                    try {
                        var json = $.parseJSON(data);
                    } catch (e) {
                        console.log("error: " + e);
                        Search.backgroundReload = true;
                        Search.startedGetData = false;
                        Search.updateHash = 'x';
                        Search.startReloads();

                        return {"additional": {}, "data": []};
                    };

                    return JSON.stringify({
                        additional: json.additional,
                        data: Grouping.setInfo(json)
                    });
                } else {
                    Grouping.clearData();

                    try {
                        var json = $.parseJSON(data);
                    } catch (e) {
                        console.log("error: " + e);
                        Search.backgroundReload = true;
                        Search.startedGetData = false;
                        Search.updateHash = 'x';
                        Search.startReloads();

                        return {"additional": {}, "data": []};
                    };

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
					return '<a data-tab="'+ data.tab +'" data-host="'+ data.host +'" href="?info=1&host='+ encodeURIComponent(data.name) +'" class="show-full-host-info" target="_blank">'+ data.name +'</a><span class="hide-more"><br /><span class="more-info-icon"></span><span class="more-comment-icon"></span></span>';
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

                        var recheckStyle = '';
                        var recheckTitle = 'Force recheck';
                        var recheckClass = '';
                        if (data.recheck) {
                            recheckClass = ' rotateRecheck';
                            recheckStyle = ' style="opacity: 0.4; cursor: default;"';
                            recheckTitle += ' in progress'
                        }
                        var recheck = '<li><span class="list-recheck-icon icons recheckIt'+ recheckClass +'" data-recheck="'+ data.recheck +'" alt="'+ recheckTitle +'" title="'+ recheckTitle +'" '+ recheckStyle +'></span></li>';

						if (data.pending) {
                            return '' +
                                '<div class="likeTable">' +
                                '	<ul>' +
                                '		<li><a href="?info=1&host='+ encodeURIComponent(data.host) +'&service='+ encodeURIComponent(data.original) +'" class="service-name show-full-service-info" target="_blank">'+ data.name +'</a></li>' +
                                recheck +
                                notes  +
                                '	</ul>' +
                                '</div>';
						}

						return '' +
							'<div class="likeTable">' +
							'	<ul>' +
							'		<li><a href="?info=1&host='+ encodeURIComponent(data.host) +'&service='+ encodeURIComponent(data.original) +'" class="service-name show-full-service-info" target="_blank">'+ data.name +'</a></li>' +
									notes  +
							'		<li>'  +
										qAck  +
										qUAck +
										pAuth +
							'		</li>' +
									ack +
									sched +
                                    recheck +
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
                data: 'last',
                className: 'last_check',
                render: {
                    _:     'last.name',
                    sort:  'last.order',
                    type:  'string',
                    display: function ( data, type, full, meta ) {
                        return '<span title="'+ Search.calculateAgoText(data.order) +' ago">'+ data.name +'</span>';
                    },
                }
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
            $('#mainTable, #mainTable_filter, #mainTable_info').toggle(Search.currentTab != 'planned');
            $('#mainTable_filter input').val(localStorage.getItem('searchValue'));
            $('#mainTable_filter input').closest('label').removeClass('loading');
		},
		'initComplete': function(settings, json) {
            if (Search.currentTab == 'planned') {
                Search.stopReloads();
            }

			$('#loading').hide();
			$('#infoHolder').show();

			if (Search.firstLoad) {
                Search.additional = json.additional;
                $('#nagiosConfigFile').text(json.additional.nagiosConfigFile);
				$('#nagiosFullListUrl').text(json.additional.nagiosFullListUrl);
				$('#updateHash').text(json.additional.updateHash);
				$('#groupByService').text(json.additional.groupByService);
				$('#groupByHost').text(json.additional.groupByHost);

                Search.drawServersList();
                Search.drawTimeZonesList();
                Planned.getPlanned();

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

                if (globalReload) {
                    Search.startReloads();
                }
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
    if (localStorage.getItem('canceledReloads') == '0' && Search.currentTab != 'planned') {
        reloadTimer = setTimeout(function () { Search.getContent(); }, ((Search.tableLength > 1000) ? 15000 : ((Search.tableLength > 200) ? 7000 : 3000)));
        Search.backgroundReload = true;
    }

    if (Search.currentTab == 'planned') {
        Search.stopReloads();
    }
    if (Search.currentTab != 'planned') {
        globalReload = true;
    }
}
Search.getContent = function() {
    if (Search.backgroundReload && !Search.startedGetData && Search.updateHash && Search.currentTab != 'planned') {
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
                Search.startedGetData = false;

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
	//Search.emptyHosts();

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
    if (type == 'recheckIt') {
        item.find('.icons.'+ type).css("opacity", 0.4).css("cursor", "default").attr('title', 'Force recheck in progress').attr('alt', 'Force recheck in progress').addClass('rotateRecheck');
    } else {
        item.find('.icons.'+ type).hide();
    }
}
Search.tmpShowIcon = function(item, type) {
    if (type != 'recheckIt' && type != 'recheckItGroup') {
        item.find('.icons.'+ type).show();
    }
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
                    recheck     = item[i].full.service.recheck,
                    duration    = item[i].full.comment.duration;
                var tab = item[i].full.host.tab;

                if (type == 'recheckIt') {
                    if (!recheck) {
                        returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
                    }
                } else {
                    returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
                }
            }
        }

        if (type == 'recheckIt') {
            $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type).css("opacity", 0.4).css("cursor", "default").attr('title', 'Force recheck in progress').attr('alt', 'Force recheck in progress').addClass('rotateRecheck');
            $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type + 'Group').css("opacity", 0.4).css("cursor", "default").attr('title', 'Force recheck in progress').attr('alt', 'Force recheck in progress').addClass('rotateRecheck');
        } else {
            $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type).hide();
            $('#mainTable thead tr[data-group="'+ dataKey +'"]').find('.icons.'+ type + 'Group').hide();
        }
    }
    else if (Search.whatWeChangeObject[key].what == 'all') {
        var returnArray = [],
            infoCheck   = false,
            dataKey     = Search.whatWeChangeObject[key].key,
            type        = Search.whatWeChangeObject[key].type;

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

        for (var groupKey in Grouping.listGroups) {
            var item = Grouping.listGroups[groupKey].children;
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
                        recheck     = item[i].full.service.recheck,
                        duration    = item[i].full.comment.duration,
                        tab         = item[i].full.host.tab;

                    if (type == 'recheckIt') {
                        if (!recheck) {
                            returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
                        }
                    } else {
                        returnArray.push({ 'host': host, 'service': original, 'check': check, 'isHost': isHost, 'downId': downId, 'start': start, 'end': end, 'duration': duration, 'tab': tab });
                    }
                }
            }

            if (type == 'recheckIt') {
                $('#mainTable thead tr[data-group="'+ groupKey +'"]').find('.icons.'+ type).css("opacity", 0.4).css("cursor", "default").attr('title', 'Force recheck in progress').attr('alt', 'Force recheck in progress').addClass('rotateRecheck');
                $('#mainTable thead tr[data-group="'+ groupKey +'"]').find('.icons.'+ type + 'Group').css("opacity", 0.4).css("cursor", "default").attr('title', 'Force recheck in progress').attr('alt', 'Force recheck in progress').addClass('rotateRecheck');
            } else {
                $('#mainTable thead tr[data-group="'+ groupKey +'"]').find('.icons.'+ type).hide();
                $('#mainTable thead tr[data-group="'+ groupKey +'"]').find('.icons.'+ type + 'Group').hide();
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
                    else if (mainObj.type == 'recheckIt') {
                        Grouping.listGroups[mainObj.key].children[i].full.service.recheck  = true;
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
                    } else if (mainObj.type == 'recheckIt') {
                        Grouping.listGroups[mainObj.key].children[i].full.service.recheck  = true;
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

                        if (mainObj.what == 'all') {
                            for (var groupKey in Grouping.listGroups) {
                                for (var i = 0; i < Grouping.listGroups[groupKey].children.length; i++) {
                                    Grouping.listGroups[groupKey].children[i].full.service.qUAck = Search.avatarUrl;
                                    Grouping.listGroups[groupKey].children[i].full.service.qAck  = false;
                                    Grouping.listGroups[groupKey].children[i].full.service.qAuth = Search.currentUser;
                                }
                            }
                        }
                    }
                    else if (mainObj.type == 'quickUnAck') {
                        d.service.qUAck = false;
                        d.service.qAck  = true;
                        d.service.qAuth = false;

                        if (mainObj.what == 'all') {
                            for (var groupKey in Grouping.listGroups) {
                                for (var i = 0; i < Grouping.listGroups[groupKey].children.length; i++) {
                                    Grouping.listGroups[groupKey].children[i].full.service.qUAck = false;
                                    Grouping.listGroups[groupKey].children[i].full.service.qAck  = true;
                                    Grouping.listGroups[groupKey].children[i].full.service.qAuth = false;
                                }
                            }
                        }
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

                            Grouping.listGroups = {};

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

                            if (Search.editComment) {
                                for (var groupKey in Grouping.listGroups) {
                                    for (var i = 0; i < Grouping.listGroups[groupKey].children.length; i++) {
                                        Grouping.listGroups[groupKey].children[i].full.comment.ack   = newComment;
                                        Grouping.listGroups[groupKey].children[i].full.service.unAck = true;
                                        Grouping.listGroups[groupKey].children[i].full.service.qAck  = true;
                                    }
                                }
                            } else {
                                Grouping.listGroups = {};

                                var oldCount = parseInt($('#radio label[for="' + Search.currentTab + '"] em').text()),
                                    newCount = parseInt($('#radio label[for="acked"] em').text());

                                $('#radio label[for="' + Search.currentTab + '"] em').text('0');
                                $('#radio label[for="acked"] em').text(oldCount + newCount);
                            }
                        }
                    }
                    else if (mainObj.type == 'recheckIt') {
                        d.service.recheck  = true;

                        if (mainObj.what == 'all') {
                            for (var groupKey in Grouping.listGroups) {
                                for (var i = 0; i < Grouping.listGroups[groupKey].children.length; i++) {
                                    Grouping.listGroups[groupKey].children[i].full.service.recheck = true;
                                }
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
                                for (var groupKey in Grouping.listGroups) {
                                    var item = Grouping.listGroups[groupKey].children;
                                    for (var i = 0; i < Grouping.listGroups[groupKey].children; i++) {
                                        Grouping.listGroups[groupKey].children[i].full.comment.sched = newComment;
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

        Grouping.redrawInfo();
        Search.checkResizedIcons();
        Search.recheckIcons();

        setTimeout(function(){ localStorage.setItem('canceledReloads', '0'); Search.startReloads(); }, 35000);

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
    Search.allDataTable.ajax.url('json_new.php?current_user='+ $('#userName').text() +'&time_correction_type='+ Search.timeZone +'&time_correction_diff='+ moment().utcOffset() +'&server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function() {
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

	if (Search.lastUpdateAgo > 300 && globalReload) {
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
	$('#updatedTimestamp').text(moment().format('YYYY-MM-DD HH:mm:ss'));
	Search.agoInterval = setInterval(function(){ Search.addToAgo(); }, 1000);
}

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

Search.init = function() {
    Search.startedGetData = true;
	Search.startAgo();
    setTimeout(function(){ Search.getCounts(); }, 3000);
    setTimeout(function(){ Search.getServerErrors(); }, 1000);

    $(document).mousedown(function(event) {
        if (event.which == 1) {
            Search.stopReloads();
        }
    });

    $(document).dblclick(function() {
        Search.startReloads();
    });
    $(document).click(function() {
        if (!getSelectedText()) {
            Search.startReloads();
        }
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

		Search.allDataTable.ajax.url('json_new.php?current_user='+ $('#userName').text() +'&time_correction_type='+ Search.timeZone +'&time_correction_diff='+ moment().utcOffset() +'&server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function() {
			Search.resetAgo();
			Planned.showHidePlanned();
		}).order(Search.orderBy[Search.currentTab]);
	});
    $('#mainTable_filter input').unbind().bind('propertychange keyup input paste keydown', function(e) {
        var val = $(this).val();

        if (localStorage.getItem('searchValue') != val) {
            localStorage.setItem('searchValue', val);
            $(this).closest('label').addClass('loading');
            Search.stopReloads();

            Search.allDataTable.ajax.url('json_new.php?current_user='+ $('#userName').text() +'&time_correction_type='+ Search.timeZone +'&time_correction_diff='+ moment().utcOffset() +'&server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function () {
                Search.resetAgo();
                Planned.showHidePlanned();

                setTimeout(function(){
                    Planned.showHidePlanned();
                }, 400);
            });
        }
    });


    $('#mainTable').on('click', '.recheckIt:not([data-recheck="true"])', function () {
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
		//Search.emptyHosts();
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
                    host    = $(this).find('.host a').text(),
                    service = $(this).attr('data-service'),
                    tab     = $(this).closest('tr').find('.host a').attr('data-tab');
					
				if (down_id) {
					down_id = down_id.split(',');
					
                    for (var a = 0; a < down_id.length; a++) {
						if (ids.indexOf(down_id[a]) === -1) {
							request.push({ 'down_id': down_id[a], 'isHost': isHost, 'tab': tab, 'host': host, 'service': service });
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
                            host    = headerRows[i].find('.host a').text(),
                            service = headerRows[i].attr('data-service'),
                            tab     = headerRows[i].find('.host [data-tab]').attr('data-tab');
							
						if (down_id) {
                            down_id = down_id.split(',');
							
							for (var b = 0; b < down_id.length; b++) {
								if (ids.indexOf(down_id[b]) === -1) {
									request.push({ 'down_id': down_id[b], 'isHost': isHost, 'tab': tab, 'host': host, 'service': service });
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
                host     = rows.find('.host a').text(),
                service  = rows.attr('data-service'),
                tab      = rows.find('.host [data-tab]').attr('data-tab');
					
			if (down_id) {
                down_id = down_id.split(',');
				
				for (var i = 0; i < down_id.length; i++) {
					if (ids.indexOf(down_id[i]) === -1) {
						request.push({ 'down_id': down_id[i], 'isHost': isHost, 'tab': tab, 'host': host, 'service': service });
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

        if (!globalReload) {
            globalTime = 0;
        }

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
    $('#stats').on('click', function() {
        window.location = window.location.href.split('?')[0] + "?stats=1";
    });
    $('#emergencies').on('click', function() {
        window.location = window.location.href.split('?')[0] + "?emergency=1";
    });
    $('#users').on('click', function() {
        window.location = window.location.href.split('?')[0] + "?users=1";
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
		if (!settings.url.startsWith('planned.php') && !settings.url.startsWith('counts.php') && settings.url != 'post.php' && settings.url != 'recheck.php' && settings.url != 'recheck.php?run=1' && settings.url != 'stats.php?lastyear=1') {
            jqx._id = ++id;
			Q[jqx._id] = jqx;
        }
	});
	$(document).ajaxComplete(function(e, jqx, settings){
		if (!settings.url.startsWith('planned.php') && !settings.url.startsWith('counts.php') && settings.url != 'post.php' && settings.url != 'recheck.php' && settings.url != 'recheck.php?run=1' && settings.url != 'stats.php?lastyear=1') {
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
    $('#loading, #tabs, #normalGrouping, #radio, #mainTable_wrapper').hide();
    $('#updatedAgo').closest('p').hide();
    $('#noDataServer').show();
}
function showNoData() {
    $('#tabs, #normalGrouping, #radio, #mainTable_wrapper').show();
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

FullInfo = {
    timeZone: localStorage.getItem('timeZone'),
    hostData: null,
    serviceData: null,
    host: null,
    service: null,
    chartFrom: 0,
    chartTo: 0,
    period: 'Today',
    periodFrom: moment().format('Y-MM-DD') + ' 00:00:00',
    periodTo: moment().format('Y-MM-DD') + ' 23:59:59',
    isHost: false,
    hostThis: null,
    serviceThis: null,
    ctrlIsPressed: false,
    fullHostsList: null,
    init: function() {
        if (FullInfo.isInfo()) {
            $('#full-info-table, #fullInfoHolder .full-info-data, #fullInfoHolder .full-info-error').hide();

            if (!getParameterByName('host')) {
                $('#fullInfoHolder h3').text('Hosts list');
                $('#full-info-table').html('').show();
                FullInfo.drawFullHostsList();
            } else if (getParameterByName('host') && !getParameterByName('service')) {
                $('#fullInfoHolder h3').html('Host: ' + getParameterByName('host') + ' details<div style="float: right;"><a href="?info=1" style="font-weight: normal; font-size: 13px; color: #000;">Back to hosts list</a></div>');
                $('#full-info-table').html('').show();
                FullInfo.drawHostsList();
            } else if (getParameterByName('host') && getParameterByName('service')) {
                $('#fullInfoHolder h3').html('Service '+ getParameterByName('service') +' on '+ getParameterByName('host') +' information<div style="float: right;"><a href="?info=1&host='+ encodeURIComponent(getParameterByName('host')) +'" style="font-weight: normal; font-size: 13px; color: #000;">Back to hosts details</a></div>');
                FullInfo.host    = getParameterByName('host');
                FullInfo.service = getParameterByName('service')
                FullInfo.drawServiceDetails();
            }
        } else {
            FullInfo.drawDialog();
        }

        FullInfo.events();
    },
    getStateText: function(state) {
        if (state == 1) {
            return 'WARNING';
        }

        if (state == 2) {
            return 'CRITICAL';
        }

        if (state == 3) {
            return 'UNKNOWN';
        }

        return 'OK';
    },
    drawHostsList: function() {
        $.ajax({
            type:    'GET',
            url:     'full_info.php',
            data:    {
                'server_tab':           encodeURIComponent(Search.currentServerTab),
                'host':                 encodeURIComponent(getParameterByName('host')),
                'time_correction_type': FullInfo.timeZone,
                'time_correction_diff': moment().utcOffset()
            },
            success: function(data){
                $('#loading').hide();
                $('#fullInfoHolder').show();

                if (typeof data.error !== 'undefined') {
                    $('#fullInfoHolder .full-info-error').text('Error: ' + data.error).show();
                    return;
                }

                FullInfo.fullHostsList = data;
                FullInfo.drawHostDetails();
                FullInfo.drawFullServiceData();
            }
        });
    },
    drawFullHostsList: function() {
        $.ajax({
            type:    'GET',
            url:     'full_info.php',
            data:    {
                'server_tab':           encodeURIComponent(Search.currentServerTab),
                'hosts_list':           1,
                'time_correction_type': FullInfo.timeZone,
                'time_correction_diff': moment().utcOffset()
            },
            success: function(data) {
                $('#loading').hide();
                $('#fullInfoHolder').show();
                FullInfo.fullHostsList = data;
                FullInfo.drawFullHostData();
            }
        });
    },
    drawFullHostData: function() {
        if (typeof FullInfo.fullHostsList.error !== 'undefined') {
            $('#fullInfoHolder .full-info-error').text('Error: ' + FullInfo.fullHostsList.error).show();
            return;
        }

        if (typeof FullInfo.fullHostsList.hosts_list === 'undefined') {
            $('#fullInfoHolder .full-info-error').text('Error: no data to draw hosts list.').show();
            return;
        }

        $('#full-info-table').html('' +
            '        <thead>\n' +
            '            <tr>\n' +
            '                <th class="abb-th"></th>\n' +
            '                <th class="host-th">Host</th>\n' +
            '                <th class="status-th">Status</th>\n' +
            '                <th class="last_check-th">Last Check</th>\n' +
            '                <th class="status_information-th">Status Information</th>\n' +
            '            </tr>\n' +
            '        </thead>');

        var data = [];

        for (var key in FullInfo.fullHostsList.hosts_list) {
            var value = FullInfo.fullHostsList.hosts_list[key];

            data.push({
                abbreviation: {
                    abb: value['tab'].charAt(0).toUpperCase(),
                    name: value['tab']
                },
                host: {
                    name: value['host']
                },
                status: {
                    name: FullInfo.getStateText(value['state'])
                },
                last: {
                    name: value['date']
                },
                info: {
                    name: value['status_info']
                }
            });
        }

        $('#full-info-table').DataTable({
            'searching':   false,
            'paging':      false,
            'ordering':    false,
            'data':        data,
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
                        return '<a href="?info=1&host='+ encodeURIComponent(data.name) +'">'+ data.name +'</a>';
                    },
                },
                {
                    data:      'status',
                    className: 'status',
                    render: function ( data, type, full, meta ) {
                        return data.name;
                    },
                },
                {
                    data: 'last',
                    className: 'last_check',
                    render: function ( data, type, full, meta ) {
                        return data.name;
                    },
                },
                {
                    data:      'info',
                    className: 'status_information main',
                    render: function ( data, type, full, meta ) {
                        return data.name;
                    },
                },
            ],
            'createdRow': function(row, data, index) {
                if (data.status.name) {
                    $(row).find('.status, .last_check, .status_information').addClass(data.status.name);
                }
            },
        });
    },
    drawHostDetails: function() {
        if (typeof FullInfo.fullHostsList.error !== 'undefined') {
            $('#fullInfoHolder .full-info-error').text('Error: ' + FullInfo.fullHostsList.error).show();
            return;
        }

        if (typeof FullInfo.fullHostsList.check === 'undefined') {
            $('#fullInfoHolder .full-info-error').text('Error: no data to show host details.').show();
            return;
        }

        FullInfo.host = getParameterByName('host');

        var html = '<hr />';
        html += '<table style="width: 600px; font-size: 13px; line-height: 150%;">';
        html = FullInfo.getHostTable(FullInfo.fullHostsList, html);
        html += '</table>';
        html += '<hr />';
        html += '<h3>Checks for '+ FullInfo.host +'</h3>';

        $('.full-info-data').show().html(html);
    },
    drawFullServiceData: function() {
        if (typeof FullInfo.fullHostsList.error !== 'undefined') {
            $('#fullInfoHolder .full-info-error').text('Error: ' + FullInfo.fullHostsList.error).show();
            return;
        }

        if (typeof FullInfo.fullHostsList.chart === 'undefined') {
            $('#fullInfoHolder .full-info-error').text('Error: no data to draw services list.').show();
            return;
        }

        $('#full-info-table').html('' +
            '        <thead>\n' +
            '            <tr>\n' +
            '                <th class="abb-th"></th>\n' +
            '                <th class="host-th">Host</th>\n' +
            '                <th class="service-th">Service</th>\n' +
            '                <th class="status-th">Status</th>\n' +
            '                <th class="last_check-th">Last Check</th>\n' +
            '                <th class="duration-th">Duration</th>\n' +
            '                <th class="status_information-th">Status Information</th>\n' +
            '                <th class="comment-th">Comment</th>\n' +
            '            </tr>\n' +
            '        </thead>');

        var data = [];

        for (var key in FullInfo.fullHostsList.chart) {
            var value = FullInfo.fullHostsList.chart[key];

            data.push({
                abbreviation: {
                    abb: value['tab'].charAt(0).toUpperCase(),
                    name: value['tab']
                },
                host: {
                    name: value['host']
                },
                service: {
                    name:   value['service'],
                    host:   value['host'],
                    acked:  value['acked'],
                    sched:  value['scheduled'],
                    notes:  value['notesUrl'],
                    avatar: (value['userAvatar']) ? value['userAvatar'] : value['scheduserAvatar'],
                },
                status: {
                    name: FullInfo.getStateText(value['state'])
                },
                last: {
                    name: value['date']
                },
                duration: {
                    name:  value['duration'],
                    end:   value['comments']['schedEnd'],
                    sched: value['scheduled'],
                },
                info: {
                    name: value['status_info']
                },
                comment: {
                    acked: value['comments']['ackComment'],
                    sched: value['comments']['schedComment'],
                }
            });
        }

        $('#full-info-table').DataTable({
            'searching':   false,
            'paging':      false,
            'ordering':    false,
            'data':        data,
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
                        return '<a href="?info=1&host='+ encodeURIComponent(data.name) +'">'+ data.name +'</a>';
                    },
                },
                {
                    data:      'service',
                    className: 'service',
                    render: function ( data, type, full, meta ) {
                        var acked  = (data.acked)  ? '<li><span class="list-ack-icon icons" alt="Acknowledged" title="Acknowledged" style="cursor: auto;"></span></li>' : '';
                        var sched  = (data.sched)  ? '<li><span class="list-sched-icon icons" alt="Scheduled Downtime" title="Scheduled Downtime" style="cursor: auto;"></span></li>' : '';
                        var notes  = (data.notes)  ? '<li><a href="'+ data.notes +'" target="_blank" class="list-notes-icon"></a></li>' : '';
                        var avatar = (data.avatar) ? '<li><img class="icons" src="https://www.gravatar.com/avatar/'+ data.avatar +'?size=20" width="19" height="19" /></li>' : '';

                        return '<div class="likeTable"><ul><li><a href="?info=1&host='+ encodeURIComponent(data.host) +'&service='+ encodeURIComponent(data.name) +'">'+ data.name +'</a></li>' +
                            notes +
                            avatar +
                            acked +
                            sched +
                            '</ul></div>';
                    },
                },
                {
                    data:      'status',
                    className: 'status',
                    render: function ( data, type, full, meta ) {
                        return data.name;
                    },
                },
                {
                    data: 'last',
                    className: 'last_check',
                    render: function ( data, type, full, meta ) {
                        return data.name;
                    },
                },
                {
                    data: 'duration',
                    className: 'duration',
                    render: function ( data, type, full, meta ) {
                        if (data.sched) {
                            return '<span title="Check triggered" style="cursor: pointer;">' + data.name + '</span><br /><span title="Remaining downtime" style="cursor: pointer;">' + data.end + '</span>';
                        }

                        return data.name;
                    }
                },
                {
                    data:      'info',
                    className: 'status_information main',
                    render: function ( data, type, full, meta ) {
                        return data.name;
                    },
                },
                {
                    data: 'comment',
                    className: 'comment',
                    render: function ( data, type, full, meta ) {
                        return '<div class="likeTable">' +
                            '<ul>' +
                            '<li class="ack text">' + data.acked + '</li>' +
                            '<li class="sched text">' + data.sched + '</li>' +
                            '</ul>' +
                            '</div>';
                    }
                },
            ],
            'createdRow': function(row, data, index) {
                if (data.status.name) {
                    $(row).find('.service, .status, .last_check, .duration, .status_information, .comment').addClass(data.status.name);
                }
            },
        });
    },
    drawServiceDetails: function() {
        $.ajax({
            type:    'GET',
            url:     'full_info.php',
            data:    {
                'server_tab':           encodeURIComponent(Search.currentServerTab),
                'host':                 encodeURIComponent(FullInfo.host),
                'service':              encodeURIComponent(FullInfo.service),
                'time_correction_type': FullInfo.timeZone,
                'time_correction_diff': moment().utcOffset(),
                'from':                 moment.utc(FullInfo.periodFrom).unix(),
                'to':                   moment.utc(FullInfo.periodTo).unix(),
            },
            success: function(data){
                $('#loading').hide();
                $('#fullInfoHolder').show();

                if (typeof data.error !== 'undefined') {
                    $('#fullInfoHolder .full-info-error').text('Error: ' + data.error).show();
                    return;
                }

                FullInfo.serviceData = data;
                FullInfo.chartFrom   = data.chart.from;
                FullInfo.chartTo     = data.chart.to;
                FullInfo.drawServiceTable();
                FullInfo.drawDatesSelect();
                FullInfo.drawChart();
            }
        });
    },
    drawServiceTable: function() {
        if (typeof FullInfo.serviceData.check === 'undefined') {
            $('#fullInfoHolder .full-info-error').text('Error: no data to show host details.').show();
            return;
        }

        var html = '<hr />';
        html += '<table style="width: 600px; font-size: 13px; line-height: 150%;">';
        html = FullInfo.getServiceTable(FullInfo.serviceData, html);
        html += '</table>';
        html += '<table style="width: 100%; font-size: 13px; line-height: 150%; display: none; border-top: 1px solid #000;border-bottom: 1px solid #000; margin-top: 20px; padding-bottom: 12px;" id="full-calendar_switch"></table>';
        html += '<table style="width: 100%; font-size: 13px; line-height: 150%; display: none;" id="full-info-chart"></table>';

        $('.full-info-data').show().html(html);
    },
    events: function() {
        $(document).keydown(function(e) {
            if (e.ctrlKey || e.metaKey) {
                FullInfo.ctrlIsPressed = true;
            }
        });

        $(document).keyup(function() {
            FullInfo.ctrlIsPressed = false;
        });

        $(document).on('click', '.show-full-host-info', function() {
            if (FullInfo.ctrlIsPressed) {
                window.open('?info=1&host=' + encodeURIComponent($(this).text()),'_blank');
            } else {
                FullInfo.isHost      = true;
                FullInfo.hostThis    = $(this);
                FullInfo.serviceThis = null;

                FullInfo.showHostData(FullInfo.hostThis);
            }

            return false;
        });

        $(document).on('click', '.show-full-service-info', function() {
            if (FullInfo.ctrlIsPressed) {
                FullInfo.host    = $(this).closest('tr').find('.show-full-host-info').text();
                FullInfo.service = $(this).closest('tr').attr('data-service');

                window.open('?info=1&host=' + encodeURIComponent($(this).closest('tr').find('.show-full-host-info').text()) + '&service=' + encodeURIComponent($(this).closest('tr').attr('data-service')),'_blank');
            } else {
                FullInfo.isHost      = false;
                FullInfo.hostThis    = null;
                FullInfo.serviceThis = $(this);

                FullInfo.showServiceData(FullInfo.serviceThis);
            }

            return false;
        });

        $(document).on('change', '#period_calendar_switch', function() {
            var item = $('#period_calendar_switch option:selected');
            FullInfo.period     = item.val();
            FullInfo.periodFrom = (item.attr('data-from') != 'custom') ? item.attr('data-from') : $('#period_from_date').val();
            FullInfo.periodTo   = (item.attr('data-to') != 'custom')   ? item.attr('data-to')   : $('#period_to_date').val();

            FullInfo.changePeriodDates();
            FullInfo.checkCalendarSwitch();
        });

        $(document).on('change', '#period_from_date, #period_to_date', function() {
            FullInfo.checkCalendarSwitch();

            var item = $('#period_calendar_switch option:selected');
            FullInfo.period     = item.val();
            FullInfo.periodFrom = (item.attr('data-from') != 'custom') ? item.attr('data-from') : $('#period_from_date').val();
            FullInfo.periodTo   = (item.attr('data-to') != 'custom')   ? item.attr('data-to')   : $('#period_to_date').val();
        });

        $(document).on('click', '#filter_period, #period_refresh', function() {
            if (FullInfo.isInfo()) {
                $('#loading').show();
                $('.full-info-data, .full-info-table').html('');
                $('#fullInfoHolder').hide();

                FullInfo.drawServiceDetails();
            } else {
                $('.full-info-loading').show();
                $('.full-info-data, #full-calendar_switch, #full-info-chart').html('').hide();

                if (FullInfo.isHost) {
                    FullInfo.showHostData(FullInfo.hostThis);
                } else {
                    FullInfo.showServiceData(FullInfo.serviceThis);
                }
            }
        });
    },
    isInfo: function() {
        return (getParameterByName('info'));
    },
    showServiceData: function(service) {
        FullInfo.host    = service.closest('tr').find('.show-full-host-info').text();
        FullInfo.service = service.closest('tr').attr('data-service');

        $('#fullInfo').dialog('open');
        $('[aria-describedby="fullInfo"]').find('.ui-dialog-title').text('Service '+ FullInfo.service +' on '+ FullInfo.host +' information');
        $('[aria-describedby="fullInfo"]').css('top', '50px');

        $.ajax({
            type:    'GET',
            url:     'full_info.php',
            data:    {
                'server_tab':           encodeURIComponent(service.closest('tr').find('.show-full-host-info').attr('data-tab')),
                'host':                 encodeURIComponent(FullInfo.host),
                'service':              encodeURIComponent(FullInfo.service),
                'time_correction_type': FullInfo.timeZone,
                'time_correction_diff': moment().utcOffset(),
                'from':                 moment.utc(FullInfo.periodFrom).unix(),
                'to':                   moment.utc(FullInfo.periodTo).unix(),
            },
            success: function(data){
                FullInfo.serviceData = data;
                FullInfo.chartFrom   = data.chart.from;
                FullInfo.chartTo     = data.chart.to;
                FullInfo.drawServiceData();
                FullInfo.drawDatesSelect();
                FullInfo.drawChart();
            }
        });
    },
    drawDatesSelect: function() {
        var html = '<tr><td colspan="4"><h3 style="margin: 7px 0;">Period for chart</h3></td></tr>';


        html += '<tr>';
        html += '<td style="width: 160px;"><select id="period_calendar_switch" style="width: 120px;">';
        $(Stats.returnSelectList()).each(function (key, value) {
            html += '<option value="'+ value.name +'" data-from="'+ value.value.from +'" data-to="'+ value.value.to +'">'+ value.name +'</option>';
        });
        html += '</select></td>';

        html += '<td style="width: 240px;">From: <input type="text" name="period_from_date" id="period_from_date" class="text hasDatepicker" style="font-size: 13px; outline: none; width: 160px;" autocomplete="off"></td>';

        html += '<td style="width: 240px;">To: <input type="text" name="period_to_date" id="period_to_date" class="text hasDatepicker" style="font-size: 13px; outline: none; width: 160px;" autocomplete="off"></td>';

        html += '<td style="width: 80px;"><input type="button" value="draw" name="filter_period" id="filter_period"></td>';
        html += '<td><span style="float: left; width: 19px; height: 19px; background: url(../images/all_icons.png) no-repeat -114px 0; cursor: pointer;" id="period_refresh"></span></td>';

        html += '</tr>';


        $('#full-calendar_switch').html(html).show();

        $('#period_calendar_switch option[value="'+ FullInfo.period +'"]').attr('selected','selected');

        FullInfo.changePeriodDates();
        FullInfo.drawDatePickers();
    },
    drawDatePickers: function() {
        var dateTimePickerFromSettings = {
            format:'Y-m-d H:i:s',
            timeFormat: 'HH:mm:ss',
            dateFormat: 'yy-mm-dd',
            controlType: 'select',
            oneLine: true,
            defaultValue: FullInfo.periodFrom,
        };

        var dateTimePickerToSettings = dateTimePickerFromSettings;
        dateTimePickerToSettings.defaultValue = FullInfo.periodTo;

        $('#period_from_date').datetimepicker(dateTimePickerFromSettings);
        $('#period_to_date').datetimepicker(dateTimePickerToSettings);
    },
    checkCalendarSwitch: function() {
        var from     = $('#period_from_date').val(),
            to       = $('#period_to_date').val(),
            selected = 'Custom';

        $('#period_calendar_switch option').each(function (key, value) {
            if (from == $(value).attr('data-from') && to == $(value).attr('data-to')) {
                selected = $(value).val();

                return false;
            }
        });

        if ($('#period_calendar_switch').val() != selected) {
            $('#period_calendar_switch option[value="'+ $('#period_calendar_switch').val() +'"]').removeAttr('selected');
            $('#period_calendar_switch option[value="'+ selected +'"]').prop('selected', 'selected');
        }
    },
    changePeriodDates: function() {
        $('#period_from_date').val(FullInfo.periodFrom);
        $('#period_to_date').val(FullInfo.periodTo);
    },
    showHostData: function(host) {
        FullInfo.host = host.text();

        $('#fullInfo').dialog('open');
        $('[aria-describedby="fullInfo"]').find('.ui-dialog-title').text('Host '+ FullInfo.host +' information');
        $('[aria-describedby="fullInfo"]').css('top', '50px');

        $.ajax({
            type:    'GET',
            url:     'full_info.php',
            data:    {
                'server_tab':           encodeURIComponent(host.attr('data-tab')),
                'host':                 encodeURIComponent(host.text()),
                'time_correction_type': FullInfo.timeZone,
                'time_correction_diff': moment().utcOffset()
            },
            success: function(data){
                FullInfo.hostData = data;
                FullInfo.drawHostData();
            }
        });
    },
    getHostTable: function(data, dialog) {
        if (typeof data.check !== 'undefined') {
            dialog += '<tr><td><b>Host</b></td><td>'+ FullInfo.host +'</td></tr>';
            dialog += '<tr><td><b>Status Information</b></td><td>'+ data.check.status_info +'</td></tr>';
            dialog += '<tr><td><b>Performance Data</b></td><td>rta: '+ data.check.rta +'; pl: '+ data.check.pl +'</td></tr>';
            dialog += '<tr><td><b>Scheduled Downtime?</b></td><td>'+ ((data.check.scheduled) ? "yes" : "no") +'</td></tr>';
            dialog += '<tr><td><b>Acknowledged?</b></td><td>'+ ((data.check.acked) ? "yes" : "no") +'</td></tr>';
            dialog += '<tr><td><b>Last Check Time</b></td><td>'+ data.check.date +'</td></tr>';
        }

        return dialog;
    },
    getServiceTable: function(data, dialog) {
        if (typeof data.check !== 'undefined') {
            dialog += '<tr><td><b>Host</b></td><td>'+ FullInfo.host +'</td></tr>';
            dialog += '<tr><td><b>Service</b></td><td>'+ FullInfo.service +'</td></tr>';
            dialog += '<tr><td><b>Status Information</b></td><td>'+ data.check.status_info +'</td></tr>';
            dialog += '<tr><td valign="top"><b>Scheduled Downtime?</b></td><td>'+ ((data.check.scheduled) ? "yes" : "no") +'</td></tr>';
            if (data.check.scheduled && data.check["comments"]["schedComment"]) {
                dialog += '<tr><td valign="top" style="white-space: nowrap;"><b>Scheduled downtime comment</b></td><td>'+ data.check["comments"]["schedComment"] +'</td></tr>';
            }
            dialog += '<tr><td valign="top"><b>Acknowledged?</b></td><td>'+ ((data.check.acked) ? "yes" : "no") +'</td></tr>';
            if (data.check.acked && data.check["comments"]["ackComment"]) {
                dialog += '<tr><td valign="top" style="white-space: nowrap;"><b>Acknowledgment comment</b></td><td>'+ data.check["comments"]["ackComment"] +'</td></tr>';
            }
            dialog += '<tr><td><b>Last Check Time</b></td><td>'+ data.check.date +'</td></tr>';
        }

        return dialog;
    },
    drawHostData: function() {
        $('#fullInfo .full-info-loading').hide();

        var dialog = '';

        if (typeof FullInfo.hostData.error !== 'undefined') {
            dialog += '<tr><td><b>Error</b></td><td>'+ FullInfo.hostData.error +'</td></tr>';
        }

        dialog += '<tr><td colspan="2" align="right"><a href="?info=1&host='+ encodeURIComponent(FullInfo.host) +'" target="_blank">All checks for this host</a></td></tr>'
        dialog = FullInfo.getHostTable(FullInfo.hostData, dialog);

        $('#fullInfo .full-info-data').show().html(dialog);
    },
    drawServiceData: function() {
        $('#fullInfo .full-info-loading').hide();

        var dialog = '';

        if (typeof FullInfo.serviceData.error !== 'undefined') {
            dialog += '<tr><td><b>Error</b></td><td>'+ FullInfo.serviceData.error +'</td></tr>';
        }

        dialog = FullInfo.getServiceTable(FullInfo.serviceData, dialog);

        $('#fullInfo .full-info-data').show().html(dialog);
    },
    drawDialog: function() {
        var dialog = '';
        dialog += '<div id="fullInfo" title="information">';
        dialog += '<table style="width: 100%; font-size: 13px; line-height: 150%;" class="full-info-loading">';
        dialog += '<tr><td colspan="2">';
        dialog += '<div class="sk-circle">';
        dialog += '<div class="sk-circle1 sk-child"></div>';
        dialog += '<div class="sk-circle2 sk-child"></div>';
        dialog += '<div class="sk-circle3 sk-child"></div>';
        dialog += '<div class="sk-circle4 sk-child"></div>';
        dialog += '<div class="sk-circle5 sk-child"></div>';
        dialog += '<div class="sk-circle6 sk-child"></div>';
        dialog += '<div class="sk-circle7 sk-child"></div>';
        dialog += '<div class="sk-circle8 sk-child"></div>';
        dialog += '<div class="sk-circle9 sk-child"></div>';
        dialog += '<div class="sk-circle10 sk-child"></div>';
        dialog += '<div class="sk-circle11 sk-child"></div>';
        dialog += '<div class="sk-circle12 sk-child"></div>';
        dialog += '</div>';
        dialog += '</td></tr>';
        dialog += '</table>';
        dialog += '<table style="width: 100%; font-size: 13px; line-height: 150%; display: none;" class="full-info-data"></table>';
        dialog += '<table style="width: 100%; font-size: 13px; line-height: 150%; display: none; border-top: 1px solid #000;border-bottom: 1px solid #000; margin-top: 20px; padding-bottom: 12px;" id="full-calendar_switch"></table>';
        dialog += '<table style="width: 100%; font-size: 13px; line-height: 150%; display: none;" id="full-info-chart"></table>';
        dialog += '</div>';

        $('body').append(dialog);

        FullInfo.dialogJs();
    },
    dialogJs: function() {
        var windowWidth = ($(window).width() < 600) ? $(window).width() : 1000;

        $('#fullInfo').dialog({
            autoOpen: false,
            modal:    true,
            width:    windowWidth,
            open:     function() {
                $(this).parent().css('position', 'fixed');
                $('body').css("overflow", "hidden");
                $('#fullInfo .full-info-data, #full-info-chart, #full-calendar_switch').html('').hide();
                $('#fullInfo .full-info-loading').show();
            },
            close:    function() {
                $('body').css("overflow", "auto");
                $('#fullInfo .full-info-data, #full-info-chart, #full-calendar_switch').html('').hide();
                $('#fullInfo .full-info-loading').show();
                $('#fullInfo').dialog('close');
            },
            create:   function() {
                $(this).parent().css('position', 'fixed');
                $(this).closest('.ui-dialog').on('keydown', function(ev) {
                    if (ev.keyCode === $.ui.keyCode.ESCAPE) {
                        $('#fullInfo').dialog('close');
                    }
                });
            },
            closeOnEscape: false,
            buttons: [
                {
                    text:  'Close',
                    click: function() {
                        $('#fullInfo').dialog('close');
                    },
                }
            ]
        });
    },
    drawChart: function() {
        if (typeof FullInfo.serviceData.chart === 'undefined') {
            return;
        }

        let chartData = FullInfo.getChartData();
        let palette = {
            "palette": {
                "area": [
                    ["#000", "#33FF00"],
                    ["#000", "#F83838"],
                    ["#000", "#FFFF00"],
                    ["#000", "#FF9900"],
                ]
            }
        };
        let chartConfig = {
            "graphset": [
                {
                    stacked: true,
                    type: "area",
                    backgroundColor: "#FFFFFF",
                    plot: {
                        marker: { visible: false },
                        tooltip: {
                            text: '<div style="text-align: center; line-height: 14px; padding-top: 5px;"><b>%t</b><br><br>%kt<br></div>',
                            marginTop: '5px',
                            padding: '5px 15px',
                            htmlMode: true
                        },
                        activeArea: true,
                        borderWidth: 0,
                        lineWidth: 0,
                        aspect: "stepped",
                        animation: { effect: 'ANIMATION_EXPAND_BOTTOM', method: 'ANIMATION_STRONG_EASE_OUT', sequence: 'ANIMATION_BY_NODE',  speed: 275 },
                    },
                    legend: { draggable: false, marginTop: 28 },
                    plotarea: { marginTopOffset: '0px' },
                    chart: { marginTop: 30, marginBottom: 40, marginRight: 200 },
                    scaleY: { visible:false },
                    scaleX: {
                        transform: {
                            type: "date",
                            all: "%Y-%mm-%dd<br />%H:%i:%s"
                        },
                        itemsOverlap: true,
                        step: "minute",
                        minValue: FullInfo.chartFrom,
                        maxValue: FullInfo.chartTo,
                        zooming: true,
                    },
                    series: chartData
                }
            ]
        };

        $('#full-info-chart').show();

        zingchart.render({
            id: 'full-info-chart',
            data: chartConfig,
            height: '250px',
            defaults: palette
        });
    },
    getChartData: function() {
        var result = {
            warning: [],
            critical: [],
            ok: [],
            unknown: [],
        };

        if (!Object.keys(FullInfo.serviceData.chart.chart).length) {
            result.ok.push([FullInfo.chartFrom, 1]);
            result.ok.push([FullInfo.chartTo, 1]);
        } else {
            var first = true;
            var prevState = null;

            for (var key in FullInfo.serviceData.chart.chart) {
                var value = FullInfo.serviceData.chart.chart[key];
                var ts = value.ts * 1000;
                var state = value.state;

                if (first) {
                    first = false;

                    if (FullInfo.chartFrom != ts) {
                        result.ok.push([FullInfo.chartFrom, 1]);
                        result.warning.push([FullInfo.chartFrom, 0]);
                        result.critical.push([FullInfo.chartFrom, 0]);
                        result.unknown.push([FullInfo.chartFrom, 0]);

                        prevState = 0;
                    }
                }

                if (prevState === null) {
                    prevState = state;
                }

                var ok = (prevState == 0) ? 1 : 0;
                var warning = (prevState == 1) ? 1 : 0;
                var critical = (prevState == 2) ? 1 : 0;
                var unknown = (prevState == 3) ? 1 : 0;

                result.ok.push([ts - 1, ok]);
                result.warning.push([ts - 1, warning]);
                result.critical.push([ts - 1, critical]);
                result.unknown.push([ts - 1, unknown]);


                var ok = (state == 0) ? 1 : 0;
                var warning = (state == 1) ? 1 : 0;
                var critical = (state == 2) ? 1 : 0;
                var unknown = (state == 3) ? 1 : 0;

                result.ok.push([ts, ok]);
                result.warning.push([ts, warning]);
                result.critical.push([ts, critical]);
                result.unknown.push([ts, unknown]);

                prevState = state;
            }

            var ok = (prevState == 0) ? 1 : 0;
            var warning = (prevState == 1) ? 1 : 0;
            var critical = (prevState == 2) ? 1 : 0;
            var unknown = (prevState == 3) ? 1 : 0;

            result.ok.push([FullInfo.chartTo - 1, ok]);
            result.warning.push([FullInfo.chartTo - 1, warning]);
            result.critical.push([FullInfo.chartTo - 1, critical]);
            result.unknown.push([FullInfo.chartTo - 1, unknown]);
        }

        var series = [
            {
                values: result.ok,
                text: 'OK',
                alphaArea: 1
            },
            {
                values: result.critical,
                text: 'CRITICAL',
                alphaArea: 1
            },
            {
                values: result.warning,
                text: 'WARNING',
                alphaArea: 1
            },
            {
                values: result.unknown,
                text: 'UNKNOWN',
                alphaArea: 1
            }
        ];

        return series;
    }
};
Recheck = {
    recheckTimer: null,
    recheckStatus: 1,
    init: function() {
        Recheck.changeButton();
        Recheck.getStatus();

        $('.force-recheck-button').on('click', function(e) {
            Recheck.recheckStatus = 1;
            Recheck.changeButton();

            $.ajax({
                url:    'recheck.php?run=1',
                method: 'GET',
            });
        });
    },
    getStatus: function() {
        $.ajax({
            url:    'recheck.php',
            method: 'GET',
        })
        .always(function(data) {
            if (Recheck.recheckStatus != parseInt(data.checking)) {
                Recheck.recheckStatus = parseInt(data.checking);
                Recheck.changeButton();
            }
            Recheck.recheckTimer = setTimeout(function(){ Recheck.getStatus() }, 3000);
        });
    },
    changeButton: function() {
        if (Recheck.recheckStatus) {
            $('.force-recheck-button .spinner').show();
            $('.force-recheck-button').attr('disabled', 'disabled');
            Search.allDataTable.rows({ page:'current', search:'applied' }).every(function (rowIdx, tableLoop, rowLoop) {
                var d = this.data();
                d.service.recheck  = true;
                this.invalidate();
            });

            for (var key in Grouping.listGroups) {
                for (var i = 0; i < Grouping.listGroups[key].children.length; i++) {
                    Grouping.listGroups[key].children[i].full.service.recheck = true;
                }
            }
            Grouping.redrawInfo();
        } else {
            $('.force-recheck-button .spinner').hide();
            $('.force-recheck-button').removeAttr('disabled');
            Search.allDataTable.rows({ page:'current', search:'applied' }).every(function (rowIdx, tableLoop, rowLoop) {
                var d = this.data();
                d.service.recheck  = false;
                this.invalidate();
            });

            for (var key in Grouping.listGroups) {
                for (var i = 0; i < Grouping.listGroups[key].children.length; i++) {
                    Grouping.listGroups[key].children[i].full.service.recheck = false;
                }
            }
            Grouping.redrawInfo();
        }
    }
};
Planned = {
    plannedData: {},
    plannedServersList: '',
    plannedTimer: null,
    showHidePlanned: function() {
        if (Search.currentTab == 'planned') {
            Search.stopReloads(true);
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
                Planned.plannedData.time = (parseInt($('#planned_time').val())) ? parseInt($('#planned_time').val()) : 1200000;
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
            time    = parseInt($('#edit_planned_downtime').val()),
            time    = (time && time > 1) ? time : 1200000,
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
                data:   { text: 'edit', time: time, line: 'edit', user: user, old: command, host: host, service: service, status: status, comment: comment, normal: normal, server: server },
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
                time    = (parseInt($('#maintenance-time').val())) ? parseInt($('#maintenance-time').val()) : 1200000,
                comment = $('#maintenance-comment').val(),
                user    = $('#userName').text(),
                normal  = +$('#maintenance-normal').prop('checked'),
                server  = $('#maintenance-server').val();

            if ((host || service || status) && comment) {
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
            html+= '<td style="font-size: 13px; white-space: nowrap;">Downtime <small>(minutes)</small><br /><small>Leave empty for permanent<br /> downtime</small></td>';
            html+= '<td><input type="text" name="edit_planned_downtime" id="edit_planned_downtime" class="text ui-widget-content" value="" style="width: 100%; font-size: 14px;"></td>';
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
                time:          (parseInt($(this).attr('data-time'))) ? parseInt($(this).attr('data-time')) : 1200000,
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
                    html+= '<td style="font-size: 13px; white-space: nowrap;">Maintenance Time (minutes) <br /><small>Leave empty for permanent downtime</small></td>';
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
    countUnackedItems: function() {
        var count = 0;

        for (var key in this.listGroups) {
            for (var i = 0; i < this.listGroups[key].children.length; i++) {
                if (this.listGroups[key].children[i].full.service.qAck || this.listGroups[key].children[i].full.service.qUAck != Search.avatarUrl) {
                    count++;
                }
            }
        }

        return count;
    },
    countAckedItems: function() {
        var count = 0;

        for (var key in this.listGroups) {
            for (var i = 0; i < this.listGroups[key].children.length; i++) {
                if (this.listGroups[key].children[i].full.service.qUAck) {
                    count++;
                }
            }
        }

        return count;
    },
    redrawInfo: function() {
        $('#mainTable thead tr').not(':first').remove();

        this.sortChildren();
        this.prepareParents();
        this.checkQuickAckIcons();
        this.checkRecheckIcons();

        if (!localStorage.getItem('canceledReloads')) {
            Search.filterDataTable(localStorage.getItem('searchValue'));
        }
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
    checkRecheckIcons: function() {
        for (var key in this.listGroups) {
            var recheck = 0;

            for (var i = 0; i < this.listGroups[key].children.length; i++) {
                if (this.listGroups[key].children[i].full.service.recheck === true) {
                    recheck++;
                }
            }

            if (recheck == this.listGroups[key].children.length) {
                $('#mainTable thead tr[data-group="'+ key +'"][data-group-type="parent"] .recheckItGroup').css("opacity", 0.4).css("cursor", "default").attr("title", "Force recheck in progress").attr("alt", "Force recheck in progress").attr('data-recheck', 'true').addClass('rotateRecheck');
            }
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
            'state':          null,
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
                    this.listGroups[key].data.recheck = data[i].service.recheck;
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
                    this.listGroups[key].data.recheck = data[i].service.recheck;
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
        this.checkRecheckIcons();

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
    getGroupChildrenLength: function() {
        var count = 0;

        for (var key in this.listGroups) {
            count += this.listGroups[key].children.length;
        }

        return count;
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
            schedIconBlock = '<li><span class="icons scheduleItGroup list-sched-icon" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></span></li>',
            lastCheckText  = ('<span title="' + Search.calculateAgoText(rowData.lastCheckOrder) + ' ago">'+ rowData.lastCheck +'</span>');

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
            '				<li><span class="icons recheckItGroup list-recheck-icon" alt="Force recheck" title="Force recheck"></span></li>' +
            '			</ul>' +
            '		</div>' +
            '	</td>' +
            '	<td class="status '+ trClass + mainGreyClass + subRowsClass +'">'+ rowData.status +'</td>' +
            '	<td class="last_check '+ trClass + mainGreyClass + subRowsClass +'">'+ lastCheckText +'</td>' +
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
                    hostVisibility = 'visible';//(prevHost != item.host.name) ? 'visible' : 'hidden',
                    greyTextClass = (item.service.sched) ? ' grey-text' : '',
                    blueTextClass = (item.service.info && (item.state == 'WARNING' || item.state == 'UNKNOWN')) ? ' blue-text' : '',
                    brownTextClass = (item.service.info && item.state == 'CRITICAL') ? ' brown-text' : '',
                    colorClass = greyTextClass + blueTextClass + brownTextClass,
                    lastCheckText  = ('<span title="' + Search.calculateAgoText(item.last.order) + ' ago">'+ item.last.name +'</span>');

                prevHost = item.host.name;

                result += '<tr data-service="'+ item.service.original +'" role="row" class="even" data-group="'+ key +'" data-group-type="child">';
                result += '<td class="abb"><span title="'+ item.abbreviation.name +'">'+ item.abbreviation.abb +'</span></td>';

                //host
                result += '<td class="host '+ colorClass +'" style="visibility: '+ hostVisibility +';"><a data-tab="'+ item.host.tab +'" data-host="'+ item.host.host +'" href="?info=1&host='+ encodeURIComponent(item.host.name) +'" class="show-full-host-info" target="_blank">'+ item.host.name +'</a><span class="hide-more"><br><span class="more-info-icon"></span><span class="more-comment-icon"></span></span></td>';

                //service
                var unAck = (item.service.unAck)           ? '<li><span class="list-unack-icon icons unAck" alt="Unacknowledge this Service" title="Unacknowledge this Service"></span></li>' : '',
                    down  = (item.service.down)            ? '<li><span class="list-downtime-icon"></span></li>' : '',
                    notes = (item.service.notes)           ? '<li><a href="'+ item.service.notes +'" target="_blank" class="list-notes-icon"></a></li>' : '',
                    pAuth = (item.service.pAuth)           ? '<img class="icons" src="https://www.gravatar.com/avatar/'+ item.service.pAuth +'?size=20" width="19" height="19" />' : '',
                    qAck  = (item.service.qAck && !pAuth)  ? '<span class="list-qack-icon icons quickAck" alt="Quick Acknowledge" title="Quick Acknowledge"></span></li>' : '',
                    qUAck = (item.service.qUAck && !pAuth) ? '<img class="icons quickUnAck" src="https://www.gravatar.com/avatar/'+ item.service.qUAck +'?size=20" width="19" height="19" alt="'+ item.service.qAuth +' unack" title="'+ item.service.qAuth +' unack" />' : '',
                    ack   = '<li><span class="list-ack-icon icons acknowledgeIt" alt="Acknowledge this Service" title="Acknowledge this Service"></span></li>',
                    sched = (item.service.schedPlanned) ? '<li><span class="list-sched-icon icons scheduleIt" data-id="'+ item.service.downId +'" alt="Schedule Downtime for this Service" title="Schedule Downtime for this Service"></span></li>' : '';

                var recheckStyle = '';
                var recheckTitle = 'Force recheck';
                var recheckClass = '';
                if (item.service.recheck) {
                    recheckClass = ' rotateRecheck';
                    recheckStyle = ' style="opacity: 0.4; cursor: default;"';
                    recheckTitle += ' in progress'
                }
                var recheck = '<li><span class="list-recheck-icon icons recheckIt'+ recheckClass +'" data-recheck="'+ item.service.recheck +'" alt="'+ recheckTitle +'" title="'+ recheckTitle +'" '+ recheckStyle +'></span></li>';

                result += '<td class="service '+ item.state + colorClass +'">';
                if (item.service.pending) {
                    result += '' +
                        '<div class="likeTable">' +
                        '	<ul>' +
                        '		<li><a href="?info=1&host='+ encodeURIComponent(item.host.name) +'&service='+ encodeURIComponent(item.service.original) +'" class="service-name show-full-service-info" target="_blank">'+ item.service.name +'</a></li>' +
                        recheck +
                        notes  +
                        '	</ul>' +
                        '</div>';
                }
                else {
                    result += '' +
                        '<div class="likeTable">' +
                        '	<ul>' +
                        '		<li><a href="?info=1&host='+ encodeURIComponent(item.host.name) +'&service='+ encodeURIComponent(item.service.original) +'" class="service-name show-full-service-info" target="_blank">'+ item.service.name +'</a></li>' +
                        notes  +
                        '		<li>'  +
                        qAck  +
                        qUAck +
                        pAuth +
                        '		</li>' +
                        ack +
                        sched +
                        recheck +
                        '	</ul>' +
                        '</div>';
                }
                result += '</td>';

                //status
                result += '<td class="status '+ item.state + colorClass + ' ' + item.status.origin +'">'+ item.status.name +'</td>';

                //last check
                result += '<td class="last_check '+ item.state + colorClass +'">' + lastCheckText + '</td>';

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
            $(document).find("span[title]").tooltip({ track: true });
            $(document).find(".ui-tooltip").remove();
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
            var host    = this.listGroups[key].children[i].full.host.name;
            var service = this.listGroups[key].children[i].full.service.original;

            if (down_id) {
                down_id = down_id.split(',');

                for (var a = 0; a < down_id.length; a++) {
                    if (ids.indexOf(down_id[a]) === -1) {
                        requests.push({ 'down_id': down_id[a], 'isHost': this.listGroups[key].children[i].isHost, 'tab': tab, 'host': host, 'service': service });
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
                $(document).find("span[title]").tooltip({ track: true });
                $(document).find(".ui-tooltip").remove();
            }
        });
        $('#grouping option[value="'+ Search.currentGroup +'"]').attr('selected', 'selected');
        $('#grouping').selectmenu({
            select: function (event, data) {
                localStorage.setItem('currentGroup', data.item.value);
                Search.currentGroup = localStorage.getItem('currentGroup');

                Search.allDataTable.ajax.url('json_new.php?current_user='+ $('#userName').text() +'&time_correction_type='+ Search.timeZone +'&time_correction_diff='+ moment().utcOffset() +'&server_tab='+ Search.currentServerTab +'&filter=' + Search.currentTab + '&xsearch=' + localStorage.getItem('searchValue')).load(function() {
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
        $('#mainTable').on('click', 'thead .recheckItGroup:not([data-recheck="true"])', function () {
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
    timeZone: localStorage.getItem('timeZone'),
    tableData: {},
    serversList: [],
    timeZonesList: [],
    tzWithAliases: [],
    groupByService: 0,
    groupByHost: 0,
    services: [],
    hosts: [],
    init: function() {
        if (!Search.currentServerTab) {
            Search.currentServerTab = 'All';
        }

        if (!Search.currentGroup) {
            Search.currentGroup = '1';
        }

        if (!Search.currentTab || ['normal', 'acked', 'sched', 'EMERGENCY'].indexOf(Search.currentTab) == -1) {
            Search.currentTab = 'normal';
        }

        this.getServersList();

        $('#alerts').on('click', function() {
            window.location = window.location.href.split('?')[0];
        });
        $('#stats').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?stats=1";
        });
        $('#emergencies').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?emergency=1";
        });
        $('#users').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?users=1";
        });

        $(document).on('click', '.ui-datepicker-close', function() {
            var value = $('#history_date').val();

            if (value.length > 10 && Date.parse(value) != 'NaN') {
                window.location = window.location.href.split('?')[0] + "?t=" + History.getUTCTs();
            }
        });
        $('#normal, #acked, #sched, #EMERGENCY').on('click', function() {
            if (Search.currentTab != $(this).attr('id')) {
                Search.currentTab = $(this).attr('id');
                localStorage.setItem('currentTabNew', Search.currentTab);

                History.drawTable();
            }
        });

        $(document).on('click', '.draw-borders', function () {
            var attr = $(this).attr('data-group');

            if (localStorage.getItem(Search.currentTab + '_' + attr)) {
                localStorage.removeItem(Search.currentTab + '_' + attr);
            } else {
                localStorage.setItem(Search.currentTab + '_' + attr, true);
            }

            History.drawTable();
        });
    },
    drawButtons: function() {
        $('#' + Search.currentTab).prop('checked', true);
        $('#history').prop('checked', true);
        $('#hosts, #hosts-label, #planned, #planned-label, #radio .xs-hide, .historyHeading table.statsInput').hide();
        $('#radio').buttonset();
        $('#radio-switch').buttonset();

        $('#loading, #mainTable').hide();
        $('#updatedAgo').closest('p').hide();
        $('#server-errors').hide();
        $('#infoHolder, #historyContent').show();
    },
    drawSelects: function() {
        $('#grouping option[value="'+ Search.currentGroup +'"]').attr('selected', 'selected');
        $('#grouping').selectmenu({
            select: function (event, data) {
                localStorage.setItem('currentGroup', data.item.value);
                Search.currentGroup = localStorage.getItem('currentGroup');

                History.drawTable();
            }
        });
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

        $(History.serversList).each(function (key, value) {
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
    drawTimeZonesList: function() {
        var tzList = '';

        $(History.timeZonesList).each(function (key, value) {
            var selected = (History.timeZone == encodeURI(value)) ? 'selected="selected"' : '';
            tzList += '<option value="'+ encodeURI(value) +'" '+ selected +'>TZ: '+ value +'</option>';
        });

        $('#timeZoneBlock').css('clear', 'both').show();
        $('#timeZoneSelect').html(tzList);
        $('#timeZoneSelect').selectmenu({
            select: function (event, data) {
                if (History.timeZone != data.item.value) {
                    localStorage.setItem('timeZone', data.item.value);
                    History.timeZone = localStorage.getItem('timeZone');
                    var value = $('#history_date').val();

                    if (value.length > 10 && Date.parse(value) != 'NaN') {
                        window.location = window.location.href.split('?')[0] + "?t=" + History.timestamp;
                    }
                }
            }
        });
    },
    drawTable: function() {
        var server = Search.currentServerTab;
        var severity = Search.currentTab;
        var group = parseInt(Search.currentGroup);

        History.drawEmptyTable();

        if (!group) {
            for (var i = 0; i < History.tableData[server][severity].length; i++) {
                History.drawChildRow(History.tableData[server][severity][i], true, false, '');
            }
        } else {
            for (var key in History.listGroups[server][severity]) {
                History.drawChildRow(History.listGroups[server][severity][key].data, false, true, key);

                if (localStorage.getItem(Search.currentTab + '_' + key)) {
                    for (var i = 0; i < History.listGroups[server][severity][key].children.length; i++) {
                        History.drawChildRow(History.listGroups[server][severity][key].children[i], false, false, key);
                    }

                    var row = "";
                    row += "<tr " + ((key) ? ' data-group="'+ key +'"' : '') +">";
                    row += "<td class='abb no-border-th'>&nbsp;</td>";
                    row += "<td class='host no-border-th'>&nbsp;</td>";
                    row += "<td class='service no-border-th'>&nbsp;</td>";
                    row += "<td class='status no-border-th'>&nbsp;</td>";
                    row += "<td class='last_check no-border-th'>&nbsp;</td>";
                    row += "<td class='severity no-border-th'>&nbsp;</td>";
                    row += "<td class='user no-border-th'>&nbsp;</td>";
                    row += "<td class='status_information no-border-th'>&nbsp;</td>";
                    if (Search.currentTab != 'normal') {
                        row += "<td class='comment no-border-th'>&nbsp;</td>";
                    }
                    row += "</tr>";

                    $('#historyContent .historyText .history-table thead').append(row);
                }
            }

            for (var i = 0; i < History.listReturn[server][severity].length; i++) {
                History.drawChildRow(History.listReturn[server][severity][i], true, false, '');
            }
        }

        History.setCounts();
    },
    drawEmptyTable: function() {
        var table = "";
        table += "<table class='history-table'>";
        table += "<thead>";
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
        table += "</thead>";
        table += "<tbody>";
        table += "</tbody>";
        table += "</table>";

        $('#historyContent .historyText').html(table);
    },
    drawChildRow: function(data, toBody, mainRow, key) {
        var state = data['state'];
        var severityTmp = (data['severity'] == 'planned_downtime') ? "planned" : data['severity'];
        var userIcon = (data['avatar']) ? ('<img class="icons quickUnAck" src="https://www.gravatar.com/avatar/'+ data['avatar'] +'?size=20" width="19" height="19" />') : '';
        var service = '<div class="likeTable"><ul><li>' + data['service'] + '</li><li>' + userIcon + '</li></ul></div>';
        var info = '';

        if (data['info']) {
            if (state == 'warning' || state == 'unknown') {
                info = ' blue-text';
            } else {
                info = ' brown-text';
            }
        }

        var cursor = (mainRow) ? ' class="draw-borders"' : '';
        var dataGroup = (key) ? ' data-group="'+ key +'"' : '';

        var row = "";
        row += "<tr "+ cursor + dataGroup +">";
        row += "<td class='abb'><span title='"+ Search.currentServerTab +"'>"+ ((data['server']) ? data['server'].charAt(0) : '') +"</span></td>";
        row += "<td class='host "+ state + info +"'>"+ data['host'] +"</td>";
        row += "<td class='service "+ state + info +"'>"+ service +"</td>";
        row += "<td class='status "+ state + info +"'>"+ state.toUpperCase() +"</td>";
        row += "<td class='last_check "+ state + info +"'>"+ data['date'] +"</td>";
        row += "<td class='severity "+ state + info +"'>"+ severityTmp +"</td>";
        row += "<td class='user "+ state + info +"'>"+ ((data['user']) ? data['user'] : '') +"</td>";
        row += "<td class='status_information "+ state + info +"'>"+ data['output'] +"</td>";
        if (Search.currentTab != 'normal') {
            row += "<td class='comment " + state + info + "'>" + data['comment'] + "</td>";
        }
        row += "</tr>";

        if (toBody) {
            $('#historyContent .historyText .history-table tbody').append(row);
        } else {
            $('#historyContent .historyText .history-table thead').append(row);
        }
    },
    getTimestamp: function() {
        this.timestamp = null;

        if (getParameterByName('t')) {
            var date = getParameterByName('t');

            if (date.length == 10 && parseInt(date).toString() == date) {
                this.timestamp = parseInt(date);
            } else if (date.length > 10 && Date.parse(date) != 'Nan') {
                this.timestamp = moment.utc(value).unix();
            }
        }

        History.setInputDate();
    },
    setInputDate: function() {
        History.date = moment.tz(History.timestamp * 1000, History.getTzAlias()).format('YYYY-MM-DD HH:mm');
    },
    getUTCTs: function() {
        var value = $('#history_date').val();

        return moment.tz(value, History.getTzAlias()).unix();
    },
    getTzAlias: function() {
        var tz = null;

        if (History.timeZone in History.tzWithAliases) {
            tz = History.tzWithAliases[History.timeZone];
        }

        if (!tz || tz == 'Browser') {
            tz = moment.tz.guess(true);
        }

        return tz;
    },
    getServersList: function() {
        $.ajax({
            type:    'GET',
            url:     'history.php',
            data:    {'list': 'servers'},
            success: function(data){
                History.serversList    = data.serversList;
                History.timeZonesList  = data.timeZonesList;
                History.tzWithAliases  = data.tzWithAliases;
                History.groupByService = parseInt(data.groupByService);
                History.groupByHost    = parseInt(data.groupByHost);

                History.drawTabsList();
                History.drawSelects();
                History.drawTimeZonesList();
                History.drawButtons();
                History.drawDatePickers();
                History.getHistoryData();
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
            data:    {
                'server': 'All',
                'date': this.timestamp,
                'time_correction_type': History.timeZone,
                'time_correction_diff': moment().utcOffset()
            },
            success: function(data){
                History.tableData = data;
                History.setGroupingData();
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
    setGroupingData: function() {
        History.fillHostsAndServices();
        History.countHosts();
        History.countServices();
        History.prepareData();
        History.sortParents();
        History.setAbbreviation();
    },
    setAbbreviation: function() {
        var data = History.listGroups;

        for (var server in data) {
            for (var severity in data[server]) {
                for (var key in data[server][severity]) {
                    var abbreviations = 0,
                        childrens = data[server][severity][key].children.length;

                    for (var i = 0; i < childrens; i++) {
                        if (data[server][severity][key].data.server == data[server][severity][key].children[i].server) {
                            abbreviations++;
                        }
                    }

                    if (abbreviations != childrens) {
                        History.listGroups[server][severity][key].data.server = '';
                    }
                }
            }
        }
    },
    sortParents: function() {
        var data = History.listGroups;
        var temp = {};

        for (var server in data) {
            temp[server] = {};
            for (var severity in data[server]) {
                var tmp = [];

                for (var key in data[server][severity]) {
                    var item = data[server][severity][key];
                    item.key = key;
                    tmp.push(item);
                }

                tmp.sort(function(a,b) {
                    if (parseInt(a.data.count) < parseInt(b.data.count)) {
                        return 1;
                    } else if (parseInt(a.data.count) > parseInt(b.data.count)) {
                        return -1;
                    } else {
                        return 0;
                    }
                });

                var result = {};

                for (var i = 0; i < tmp.length; i++) {
                    result[tmp[i].key] = tmp[i];
                }

                temp[server][severity] = result;
            }
        }

        History.listGroups = temp;
    },
    fillHostsAndServices: function() {
        var data = History.tableData;
        History.groupData = {};

        for (var server in data) {
            History.groupData[server] = {};
            for (var severity in data[server]) {
                History.groupData[server][severity] = { hosts: [], services: [] };
                for (var i = 0; i < data[server][severity].length; i++) {
                    History.groupData[server][severity]['hosts'].push(data[server][severity][i]['host']);
                    History.groupData[server][severity]['services'].push(data[server][severity][i]['service']);
                }
            }
        }
    },
    countHosts: function() {
        var data = History.groupData;
        History.hostsCount = {};

        for (var server in data) {
            History.hostsCount[server] = {};
            for (var severity in data[server]) {
                History.hostsCount[server][severity] = {};

                var counts = [];
                for (var i = 0; i < data[server][severity]['hosts'].length; i++) {
                    counts[data[server][severity]['hosts'][i]] = 1 + (counts[data[server][severity]['hosts'][i]] || 0);
                }

                for (var i in counts){
                    if (counts[i] >= History.groupByHost) {
                        History.hostsCount[server][severity][i] = counts[i];
                    }
                }
            }
        }
    },
    countServices: function() {
        var data = History.groupData;
        History.servicesCount = {};

        for (var server in data) {
            History.servicesCount[server] = {};
            for (var severity in data[server]) {
                History.servicesCount[server][severity] = {};

                var counts = [];
                for (var i = 0; i < data[server][severity]['services'].length; i++) {
                    counts[data[server][severity]['services'][i]] = 1 + (counts[data[server][severity]['services'][i]] || 0);
                }

                for (var i in counts){
                    if (counts[i] >= History.groupByService) {
                        History.servicesCount[server][severity][i] = counts[i];
                    }
                }
            }
        }
    },
    returnEmptyTheadObj: function() {
        return {
            'avatar':   null,
            'check_id': null,
            'comment':  null,
            'date':     null,
            'host':     null,
            'info':     null,
            'output':   null,
            'server':   null,
            'service':  null,
            'severity': null,
            'state':    null,
            'state_id': null,
            'user':     null,
            'count':    null,
            'type':     null,
        };
    },
    prepareData: function() {
        var data = History.tableData;
        History.listGroups = {};
        History.listReturn = {};

        for (var server in data) {
            History.listGroups[server] = {};
            History.listReturn[server] = {};
            for (var severity in data[server]) {
                History.listGroups[server][severity] = [];
                History.listReturn[server][severity] = [];

                for (var i = 0; i < data[server][severity].length; i++) {
                    var toReturn = true;

                    if (History.hostsCount[server][severity][data[server][severity][i]['host']] !== undefined) {
                        var host  = data[server][severity][i]['host'],
                            tab   = data[server][severity][i]['server'],
                            count = History.hostsCount[server][severity][host],
                            key   = host + '|||' + count;

                        if (History.listGroups[server][severity][key] === undefined) {
                            var tmp = Object.assign({}, data[server][severity][i]);
                            History.listGroups[server][severity][key] = {
                                data: tmp,
                                children: []
                            };

                            History.listGroups[server][severity][key].data.service = count;
                            History.listGroups[server][severity][key].data.host    = host;
                            History.listGroups[server][severity][key].data.count   = count;
                            History.listGroups[server][severity][key].data.type    = 'host';
                            History.listGroups[server][severity][key].data.server  = tab;
                        }

                        History.listGroups[server][severity][key].children.push(data[server][severity][i]);
                        toReturn = false;
                    }

                    if (History.servicesCount[server][severity][data[server][severity][i]['service']] !== undefined) {
                        var service = data[server][severity][i]['service'],
                            tab     = data[server][severity][i]['server'],
                            count   = History.servicesCount[server][severity][service],
                            key     = count + '|||' + service;

                        if (History.listGroups[server][severity][key] === undefined) {
                            var tmp = Object.assign({}, data[server][severity][i]);
                            History.listGroups[server][severity][key] = {
                                data: tmp,
                                children: []
                            };

                            History.listGroups[server][severity][key].data.service = service;
                            History.listGroups[server][severity][key].data.host    = count;
                            History.listGroups[server][severity][key].data.count   = count;
                            History.listGroups[server][severity][key].data.type    = 'service';
                            History.listGroups[server][severity][key].data.server  = tab;
                        }

                        History.listGroups[server][severity][key].children.push(data[server][severity][i]);
                        toReturn = false;
                    }

                    if (toReturn) {
                        History.listReturn[server][severity].push(data[server][severity][i]);
                    }
                }
            }
        }
    },
    setCounts: function() {
        $('#normal-label .xs-hide').show();
        $('#normal-label .xs-hide em').text(History.tableData[Search.currentServerTab]['normal'].length);

        $('#acked-label .xs-hide').show();
        $('#acked-label .xs-hide em').text(History.tableData[Search.currentServerTab]['acked'].length);

        $('#sched-label .xs-hide').show();
        $('#sched-label .xs-hide em').text(History.tableData[Search.currentServerTab]['sched'].length);

        $('#EMERGENCY-label .xs-hide').show();
        $('#EMERGENCY-label .xs-hide em').text(History.tableData[Search.currentServerTab]['EMERGENCY'].length);
    }
};
Stats = {
    timeZone: localStorage.getItem('timeZone'),
    timeZonesList: [],
    selectedUsers: null,
    selectedFrom: null,
    selectedTo: null,
    serversList: '',
    usersList: '',
    fullUsersList: '',
    groupByService: 0,
    groupByHost: 0,
    alerDaysList: [],
    alertDetails: [],
    alertsOrder: 'host',
    alertsShift: 'worked_on_shift_list',
    longAlertsShift: false,
    statsData: null,
    lastPeriod: null,
    tz: null,
    alertTab: 'ungrouped',
    urlData: {
        stats:  1,
        users:  '',
        period: '',
        from:   '',
        to:     '',
        shift:  1,
        long:   0,
        group:  0,
    },
    init: function() {
        if (!Search.currentServerTab) {
            Search.currentServerTab = 'All';
        }

        this.getServersList();
        this.drawButtons();

        $('#alerts').on('click', function() {
            window.location = window.location.href.split('?')[0];
        });
        $('#history').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?t=1";
        });
        $('#emergencies').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?emergency=1";
        });
        $('#users').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?users=1";
        });
        $('#filterStats').on('click', function() {
            Stats.selectedUsers = $('#usersFilter').val();
            Stats.selectedFrom  = $('#stats_from_date').val();
            Stats.selectedTo    = $('#stats_to_date').val();

            if (Stats.reportType != 'per_admin_report') {
                Stats.selectedUsers = ['Summary report', 'Nobody\'s shift'];
            }

            if (!Stats.selectedUsers) {
                alert('Please select at least one user.');
            }

            if (!Stats.selectedFrom) {
                alert('Please select date from.');
            }

            if (!Stats.selectedTo) {
                alert('Please select date to.');
            }

            if (Stats.selectedFrom && Stats.selectedTo && Stats.selectedUsers) {
                Stats.drawStats();
            }
        });
        $('#calendar_switch').on('change', function() {
            Stats.changePeriodDates();
            Stats.checkCalendarSwitch();
        });
        $('#stats_from_date, #stats_to_date').on('change', function() {
            Stats.checkCalendarSwitch();
        });

        $(document).on('click', '.show-alert-details', function() {
            if ($(this).text() == ' [+]') {
                Stats.redrawAlertsWithGrouping($(this));
            } else {
                $(this).text(' [+]');
                $(this).closest('td').find('.alert-details').html('');
            }
        });

        $(document).on('click', '#grouping-alerts-by-host', function() {
            if (Stats.alertTab != 'byhost') {
                Stats.alertTab = 'byhost';
                Stats.redrawAlerts();
            }
        });
        $(document).on('click', '#grouping-alerts-by-service', function() {
            if (Stats.alertTab != 'byservice') {
                Stats.alertTab = 'byservice';
                Stats.redrawAlerts();
            }
        });
        $(document).on('click', '#grouping-alerts-no-grouping', function() {
            if (Stats.alertTab != 'ungrouped') {
                Stats.alertTab = 'ungrouped';
                Stats.redrawAlerts();
            }
        });

        $(document).on('click', '.edit_how_it_was_handled', function() {
            Stats.editHowItWasHandled($(this));
        });

        $(document).on('click', '.close_how_it_was_handled', function() {
            Stats.closeHowItWasHandled($(this));
        });

        $(document).on('click', '.save_how_it_was_handled', function() {
            Stats.saveHowItWasHandled($(this));
        });

        $(document).on('click', '#get-alert-days', function() {
            if (Object.keys(Stats.alerDaysList).length) {
                Stats.drawAlertDaysTable();

                return;
            }

            $('.historyText').html('<div id="history-loading" style="display: block; float: left;"><div class="sk-circle" style="margin: 0 auto;"><div class="sk-circle1 sk-child"></div><div class="sk-circle2 sk-child"></div><div class="sk-circle3 sk-child"></div><div class="sk-circle4 sk-child"></div><div class="sk-circle5 sk-child"></div><div class="sk-circle6 sk-child"></div><div class="sk-circle7 sk-child"></div><div class="sk-circle8 sk-child"></div><div class="sk-circle9 sk-child"></div><div class="sk-circle10 sk-child"></div><div class="sk-circle11 sk-child"></div><div class="sk-circle12 sk-child"></div></div></div>');
            
            $('#get-alert-days, #filterStats').prop("disabled", true).css('cursor', 'default').css('opacity', '0.7');

            $.ajax({
                type:    'GET',
                url:     'stats.php?lastyear=1',
                success: function(data){
                    Stats.alerDaysList = data;
                    $('#get-alert-days, #filterStats').prop("disabled", false).css('cursor', 'pointer').css('opacity', '1');
                    Stats.drawAlertDaysTable();
                }
            });
        });

        $(document).on('click', '.change-order', function() {
            Stats.alertsOrder = $(this).attr('data-order');
            Stats.drawStatsHtml();
        });

        $(document).on('click', '.during_shifts, .during_shift', function() {
            if (Stats.alertsShift == 'worked_on_shift_list') {
                $('.during_shift').prop('checked', false);
                Stats.alertsShift = 'worked_total_list';
            } else {
                $('.during_shift').prop('checked', true);
                Stats.alertsShift = 'worked_on_shift_list';
            }

            Stats.drawStatsHtml();
        });

        $(document).on('click', '.long_alerts_shift, .long_alerts_shifts', function() {
            if (Stats.longAlertsShift) {
                Stats.longAlertsShift = false;
                $('.long_alerts_shift').prop('checked', false);
            } else {
                Stats.longAlertsShift = true;
                $('.long_alerts_shift').prop('checked', true);
            }

            Stats.drawStatsHtml();
        });

        $(document).on('click', '.open-dialog', function() {
            $('#' + $(this).attr('data-id')).dialog('open');
        });

        $(document).on('change', 'input[name=report_type]', function() {
            Stats.statsData = null;
            Stats.selectedUsers = [];
            $('.historyText').html('');
            Stats.prepareUsersLists(this.value);
            Stats.drawSelects();
        });
    },
    alertsOrder: 'host',
    reportType: 'per_admin_report',
    drawAlertDaysTable: function() {
        var html = '<h4 style="font-weight: normal; text-align: center;border-bottom: 1px solid #c5c5c5; padding-bottom: 15px; margin-top: 0;">Yearly report</h4>';
        html += '<table cellpadding="4" cellspacing="0" border="1" style="border-collapse: collapse; font-size: 13px; margin: 20px auto;">';
        html += '<tr><th>Date</th><th>Unhandled alerts time</th></tr>';

        for (var date in Stats.alerDaysList) {
            var unhandled_time   = 0;
            var quick_acked_time = 0;

            if (typeof Stats.alerDaysList[date][Search.currentServerTab] !== 'undefined') {
                if (typeof Stats.alerDaysList[date][Search.currentServerTab]['unhandled_time'] !== 'undefined') {
                    unhandled_time = Stats.alerDaysList[date][Search.currentServerTab]['unhandled_time'];
                }
                if (typeof Stats.alerDaysList[date][Search.currentServerTab]['quick_acked_time'] !== 'undefined') {
                    quick_acked_time = Stats.alerDaysList[date][Search.currentServerTab]['quick_acked_time'];
                }
            }

            var date  = date.split(' ');
            var month = date[1];
            var year  = date[0];

            month = parseInt(month) - 1;
            month = moment().month(month).format('MMM');

            html += '<tr><td>'+ month + ' ' + year +'</td><td align="right">'+ Stats.getAlertDaysHours(unhandled_time, quick_acked_time) +'</td></tr>';
        }

        html += '</table>';

        $('.historyText').html(html);
    },
    redrawAlerts: function() {
        $(document).find('.show-alert-details').each(function (key, value) {
            if ($(this).text() == ' [-]') {
                Stats.redrawAlertsWithGrouping($(this));
            }
        });
    },
    redrawAlertsWithGrouping: function(item) {
        if (Stats.alertTab == 'ungrouped') {
            Stats.redrawAlertsUngrouped(item);
        }

        if (Stats.alertTab == 'byhost') {
            Stats.redrawAlertsGroupedByHost(item);
        }

        if (Stats.alertTab == 'byservice') {
            Stats.redrawAlertsGroupedByService(item);
        }
    },
    redrawAlertsUngrouped: function(alert) {
        alert.text(' [-]');

        var user = alert.attr('data-user');
        var type = alert.attr('data-type');
        var name = (type == 'shift') ? 'worked_on_shift_list' : 'worked_total_list';

        var html = '<table cellpadding="3" cellspacing="0" border="1" style="width: 100%; font-size: 11px; border-collapse: collapse; line-height: 130%; table-layout:fixed; display: table;">';
        html += '<tr>';
        html += '<th style="width: 33%">host</th>';
        html += '<th style="width: 33%">service</th>';
        html += '<th style="width: 33%">comment</th>';
        html += '</tr>';

        for (var key in Stats.statsData[user][Search.currentServerTab][name]) {
            var item = Stats.statsData[user][Search.currentServerTab][name][key];
            var comments = [];

            for (var i = 0; i < item.comment.length; i++) {
                if (item.comment[i] != 'temp' && $.inArray(item.comment[i], comments) == -1) {
                    comments.push(item.comment[i]);
                }
            }

            html += '<tr>';
            html += '<td style="word-break: break-all; width: 33%">'+ item.host +'</td>';
            html += '<td style="width: 33%">'+ item.service +'</td>';
            html += '<td style="word-break: break-all; width: 33%">';

            if (comments.length) {
                html += '<ul style="margin: 0; padding: 0; list-style: none;"><li> - '+ comments.join('</li><li> - ') +'</li></ul>';
            }

            html += '</td>';
            html += '</tr>';
        }

        html += '</table>';

        alert.closest('td').find('.alert-details').html(html);
    },
    redrawAlertsGroupedByHost: function(alert) {
        alert.text(' [-]');

        var user = alert.attr('data-user');
        var type = alert.attr('data-type');
        var name = (type == 'shift') ? 'worked_on_shift_list' : 'worked_total_list';

        var html = '<table cellpadding="3" cellspacing="0" border="1" style="width: 100%; font-size: 11px; border-collapse: collapse; line-height: 130%; table-layout:fixed; display: table;">';
        html += '<tr>';
        html += '<th style="width: 33%">host</th>';
        html += '<th style="width: 33%">service</th>';
        html += '<th style="width: 33%">comment</th>';
        html += '</tr>';

        var hosts = [];
        for (var key in Stats.statsData[user][Search.currentServerTab][name]) {
            var item = Stats.statsData[user][Search.currentServerTab][name][key];

            if (typeof hosts[item.host] === "undefined" ) {
                hosts[item.host] = [];
                hosts[item.host]['services'] = [];
                hosts[item.host]['comments'] = [];
            }

            if ($.inArray(item.service, hosts[item.host]['services']) == -1) {
                hosts[item.host]['services'].push(item.service);
            }

            $(item.comment).each(function (key, value) {
                if (value != 'temp' && $.inArray(value, hosts[item.host]['comments']) == -1) {
                    hosts[item.host]['comments'].push(value);
                }
            });
        }

        for (var key in hosts) {
            html += '<tr>';
            html += '<td style="word-break: break-all; width: 33%">'+ key +'</td>';
            html += '<td align="center" style="width: 33%">'+ hosts[key]['services'].length +'</td>';
            html += '<td style="word-break: break-all; width: 33%">';

            if (hosts[key]['comments'].length) {
                html += '<ul style="margin: 0; padding: 0; list-style: none;"><li> - '+ hosts[key]['comments'].join('</li><li> - ') +'</li></ul>';
            }

            html += '</td>';
            html += '</tr>';
        }

        html += '</table>';

        alert.closest('td').find('.alert-details').html(html);
    },
    redrawAlertsGroupedByService: function(alert) {
        alert.text(' [-]');

        var user = alert.attr('data-user');
        var type = alert.attr('data-type');
        var name = (type == 'shift') ? 'worked_on_shift_list' : 'worked_total_list';

        var html = '<table cellpadding="3" cellspacing="0" border="1" style="width: 100%; font-size: 11px; border-collapse: collapse; line-height: 130%; table-layout:fixed; display: table;">';
        html += '<tr>';
        html += '<th style="width: 33%">host</th>';
        html += '<th style="width: 33%">service</th>';
        html += '<th style="width: 33%">comment</th>';
        html += '</tr>';

        var services = [];
        for (var key in Stats.statsData[user][Search.currentServerTab][name]) {
            var item = Stats.statsData[user][Search.currentServerTab][name][key];

            if (typeof services[item.service] === "undefined" ) {
                services[item.service] = [];
                services[item.service]['hosts'] = [];
                services[item.service]['comments'] = [];
            }

            if ($.inArray(item.host, services[item.service]['hosts']) == -1) {
                services[item.service]['hosts'].push(item.host);
            }

            $(item.comment).each(function (key, value) {
                if (value != 'temp' && $.inArray(value, services[item.service]['comments']) == -1) {
                    services[item.service]['comments'].push(value);
                }
            });
        }

        for (var key in services) {
            html += '<tr>';
            html += '<td style="word-break: break-all; width: 33%" align="center">'+ services[key]['hosts'].length +'</td>';
            html += '<td style="width: 33%">'+ key +'</td>';
            html += '<td style="word-break: break-all; width: 33%">';

            if (services[key]['comments'].length) {
                html += '<ul style="margin: 0; padding: 0; list-style: none;"><li> - '+ services[key]['comments'].join('</li><li> - ') +'</li></ul>';
            }

            html += '</td>';
            html += '</tr>';
        }

        html += '</table>';

        alert.closest('td').find('.alert-details').html(html);
    },
    initUrlParams: function() {
        var params = Stats.getUrlParams();

        for (var key in params) {
            if (key in Stats.urlData) {
                Stats.urlData[key] = params[key]
            }
        }
    },
    changeDefaultValuesFromUrl: function() {
        Stats.reportType = (parseInt(Stats.urlData.group) == 0) ? 'per_admin_report' : 'group_report';
        $("input:radio[name=report_type][value=" + Stats.reportType + "]").attr('checked', 'checked');

        if (Stats.reportType == 'group_report') {
            Stats.alertsShift = 'worked_on_shift_list';
            $('.during_shift').prop('checked', true);
        }
        else {
            Stats.alertsShift = (parseInt(Stats.urlData.shift) == 0) ? 'worked_total_list' : 'worked_on_shift_list';
            $('.during_shift').prop('checked', Stats.alertsShift == 'worked_on_shift_list');
        }

        Stats.longAlertsShift = (parseInt(Stats.urlData.long) == 0) ? false : true;
        $('.long_alerts_shift').prop('checked', Stats.longAlertsShift);

    },
    getUrlParams: function() {
        return location.search
            .slice(1)
            .split('&')
            .map(p => p.split('='))
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    },
    fillUrlParams: function() {
        if (Stats.reportType == 'per_admin_report') {
            Stats.urlData.users = encodeURI($('#usersFilter').val().join(';'));
            Stats.urlData.shift = (Stats.alertsShift == 'worked_on_shift_list') ? 1 : 0;
        }
        else {
            Stats.urlData.users = '';
            Stats.urlData.shift = 0;
        }

        Stats.urlData.long  = (Stats.longAlertsShift) ? 1 : 0;
        Stats.urlData.group = (Stats.reportType == 'per_admin_report') ? 0 : 1;

        Stats.urlData.period = encodeURI($("#calendar_switch option:selected").val());
        if (Stats.urlData.period == 'Custom') {
            Stats.urlData.from = encodeURI($('#stats_from_date').val());
            Stats.urlData.to   = encodeURI($('#stats_to_date').val());
        }
        else {
            Stats.urlData.from = '';
            Stats.urlData.to   = '';
        }
    },
    changeUrlPath: function() {
        Stats.fillUrlParams();

        var url = [];
        for (var key in Stats.urlData) {
            if (key != 'stats') {
                url.push(key + "=" + Stats.urlData[key]);
            }
        }

        history.replaceState(null, 'MNU stats', '/?stats=1&' + url.join('&'));
    },
    drawStats: function() {
        Stats.changeUrlPath();

        $('.historyText').html('<div id="history-loading" style="display: block; float: left;"><div class="sk-circle" style="margin: 0 auto;"><div class="sk-circle1 sk-child"></div><div class="sk-circle2 sk-child"></div><div class="sk-circle3 sk-child"></div><div class="sk-circle4 sk-child"></div><div class="sk-circle5 sk-child"></div><div class="sk-circle6 sk-child"></div><div class="sk-circle7 sk-child"></div><div class="sk-circle8 sk-child"></div><div class="sk-circle9 sk-child"></div><div class="sk-circle10 sk-child"></div><div class="sk-circle11 sk-child"></div><div class="sk-circle12 sk-child"></div></div></div>');

        $.ajax({
            type:    'GET',
            url:     'stats.php',
            data:    {
                'date_from': Stats.selectedFrom,
                'date_to': Stats.selectedTo,
                'time_correction_type': this.timeZone,
                'time_correction_diff': moment().utcOffset(),
                'from': moment.utc(Stats.selectedFrom).unix(),
                'to': moment.utc(Stats.selectedTo).unix(),
            },
            success: function(data){
                Stats.statsData = data;
                Stats.drawStatsHtml();
            }
        });
    },
    textForTextareaHowItWasHandled: function(item) {
        var text     = item.closest('td').find('.text_how_it_was_handled').html().split('<br /><br />');
        var textarea = [];

        for (var key in text) {
            var tmp = text[key].split(': ');

            if (tmp.length > 1) {
                tmp.shift();
            }

            textarea.push(tmp.join(': ').replace(/<br ?\/?>/g, "\n"));
        }

        return textarea.join("\n\n");
    },
    editHowItWasHandled: function(item) {
        item.text('');

        var text    = Stats.textForTextareaHowItWasHandled(item);
        var old     = item.closest('td').find('.text_how_it_was_handled').html();
        var idList  = item.closest('td').attr('data-id-list');
        var area    = '<textarea data-old-textarea="'+ encodeURIComponent(text) +'" data-old-value="'+ encodeURIComponent(old) +'" data-id-list="'+ idList +'" style="width: 100%;" rows="3">'+ text +'</textarea>';
        var buttons = '<br /><p class="show_error" style="display: none; color: red;"></p><input type="button" value="Save" name="save_how_it_was_handled" class="save_how_it_was_handled" style="color: #fff; background-color: #007bff; border-color: #007bff; margin-top: 4px; padding: 3px 8px; border-radius: 3px; cursor: pointer; float: left;"><input type="button" value="Close" name="close_how_it_was_handled" class="close_how_it_was_handled" style="margin-top: 4px; padding: 3px 8px; border-radius: 3px; cursor: pointer; float: right;">';

        item.closest('td').html(area + buttons);
    },
    closeHowItWasHandled: function(item) {
        var text = item.closest('td').find('[data-old-value]').attr('data-old-value');
        item.closest('td').html(Stats.howItWasHandledEditButtonHtml(decodeURIComponent(text)));
    },
    saveHowItWasHandled: function(item) {
        item.closest('td').find('.show_error').hide();

        var oldText = item.closest('td').find('[data-old-textarea]').attr('data-old-textarea');
        var newText = encodeURIComponent(item.closest('td').find('textarea').val().trim());

        if (oldText == newText) {
            Stats.closeHowItWasHandled(item);
            return;
        }

        $.ajax({
            type:    'GET',
            url:     'stats.php',
            data:    {
                'user':         encodeURIComponent($('#userName').text()),
                'save_handled': 1,
                'comment':      newText,
                'ids_list':     encodeURIComponent(item.closest('td').attr('data-id-list')),
            },
            success: function(data){
                if (typeof data.error !== 'undefined' && data.error) {
                    item.closest('td').find('.show_error').show().text(data.error);
                } else {
                    item.closest('td').html(Stats.howItWasHandledEditButtonHtml(data.text));
                }
            }
        });
    },
    howItWasHandledEditButtonHtml: function(text) {
        var html = '';

        html += '<div style="width: calc(100% - 30px); float: left;" class="text_how_it_was_handled">'+ text +'</div>';
        html += '<span style="float: right; font-size: 16px; cursor: pointer;" title="edit \'How it was handled\'" class="edit_how_it_was_handled">&#9998;</span>';

        return html;
    },
    returnAlertInfoByCheckId: function(alertsList, data) {
        for (var key in data) {
            if (typeof alertsList[key] !== 'undefined') {
                var newData = data[key];

                for (var i = 0; i < newData['comment'].length; i++) {
                    if ($.inArray(newData['comment'][i], alertsList[key]['comment']) == -1) {
                        alertsList[key]['comment'].push(newData['comment'][i]);
                    }
                }

                for (var i = 0; i < newData['handled'].length; i++) {
                    if ($.inArray(newData['handled'][i], alertsList[key]['handled']) == -1) {
                        alertsList[key]['handled'].push(newData['handled'][i]);
                    }
                }

                for (var i = 0; i < newData['output'].length; i++) {
                    if ($.inArray(newData['output'][i], alertsList[key]['output']) == -1) {
                        alertsList[key]['output'].push(newData['output'][i]);
                    }
                }
            } else {
                alertsList[key] = data[key];
            }
        }

        return alertsList;
    },
    returnTsFromOutputDate: function(record) {
        var parts = record.split('|||');
        var date  = parts[0];

        return moment(date).unix();
    },
    returnStateFromOutput: function(record) {
        var parts = record.split('|||');
        var output = parts[2].split(':');

        return output[0];
    },
    returnDbDateFromOutput: function(record) {
        var parts = record.split('|||');

        return parts[0];
    },
    returnTzDateFromOutput: function(record) {
        var parts = record.split('|||');

        return parts[1];
    },
    returnOutputText: function(record) {
        var parts = record.split('|||');

        return parts[2];
    },
    getHandled: function(handled, from, to) {
        var results = [];
        var outputs = [];

        for (var i in handled) {
            var record = handled[i];
            var date   = Stats.returnTsFromOutputDate(record);
            var output = Stats.returnOutputText(record);

            if (output && date >= from && date <= to && !outputs.includes(output)) {
                outputs.push(output);
                results.push(record);
            }
        }

        return results;
    },
    explodeByOutput: function(alertsList) {
        for (var key in alertsList) {
            var item = alertsList[key];

            alertsList[key]['list'] = { 'output': [], 'handled': [] };
            if (typeof item.handled !== "undefined" && typeof item.output !== "undefined") {
                item.output.sort();

                var firstDate = 0;
                var lastDate  = 0;
                var lastState = '';
                var outputs   = [];
                var list      = [];

                for (var i in item.output) {
                    var record = item.output[i];
                    var date   = Stats.returnTsFromOutputDate(record);
                    var state  = lastState = Stats.returnStateFromOutput(record);
                    var output = Stats.returnOutputText(record);

                    if (!firstDate && state == 'OK') {
                        continue;
                    }

                    if (!firstDate) {
                        firstDate = lastDate = date;
                    } else {
                        lastDate = date
                    }

                    if (!outputs.includes(output)) {
                        outputs.push(output);
                        list.push(record);
                    }

                    if (state == 'OK') {
                        alertsList[key]['list'].output.push({
                            'list': list,
                            'from': firstDate,
                            'to':   lastDate,
                        });

                        var handled = Stats.getHandled(item.handled, firstDate, lastDate);

                        alertsList[key]['list'].handled.push({
                            'list': handled,
                            'from': firstDate,
                            'to':   lastDate,
                        });

                        outputs   = [];
                        list      = [];
                        firstDate = 0;
                        lastDate  = 0;
                    }
                }

                if (lastState && lastState != 'OK') {
                    alertsList[key]['list'].output.push({
                        'list': list,
                        'from': firstDate,
                        'to':   lastDate,
                    });

                    var handled = Stats.getHandled(item.handled, firstDate, lastDate);

                    alertsList[key]['list'].handled.push({
                        'list': handled,
                        'from': firstDate,
                        'to':   lastDate,
                    });
                }
            }
        }

        return alertsList;
    },
    combineByService: function(alertsList) {
        var results = [];
        var alerts  = [];

        for (var key in alertsList) {
            var item = alertsList[key];

            if (typeof results[item.service] === "undefined" ) {
                results[item.service] = { 'service': item.service, 'hosts': {}, 'output': {}, 'handled': {} };
            }

            results[item.service].hosts[key]   = item.host;
            results[item.service].output[key]  = item.list.output;
            results[item.service].handled[key] = item.list.handled;
        }

        for (var key in results) {
            var item = results[key];

            var checkIds = Object.keys(item.hosts);

            if (checkIds.length > 1) {
                var splitedList = [];
                for (var hostKey in item.hosts) {
                    var host = item.hosts[hostKey];

                    for (var outputKey in item.output[hostKey]) {
                        var output    = item.output[hostKey][outputKey];
                        var dateFrom  = output.from;
                        var dateTo    = output.to;
                        var dateRange = (dateFrom - 600) + '|||' + (dateTo + 600);

                        var idsList = [];
                        for (var outputListKey in output.list) {
                            idsList.push(hostKey + '___' + Stats.returnDbDateFromOutput(output.list[outputListKey]));
                        }

                        var handledList = [];
                        for (var handledId in item.handled[hostKey]) {
                            var handledItem = item.handled[hostKey][handledId];
                            var handledFrom = handledItem.from;
                            var handledTo   = handledItem.to;

                            if (dateFrom >= handledFrom && handledTo <= dateTo) {
                                handledList = handledList.concat(item.handled[hostKey][handledId].list);
                            }
                        }

                        if (!Object.keys(splitedList).length) {
                            splitedList[dateRange] = {
                                'idList':  idsList,
                                'hosts':   [host],
                                'list':    output.list,
                                'handled': handledList,
                            }

                            splitedList[dateRange].list.sort();
                        } else {
                            var found = false;

                            for (var splitedListKey in splitedList) {
                                var splitedFrom = parseInt(splitedListKey.split('|||')[0]);
                                var splitedTo   = parseInt(splitedListKey.split('|||')[1]);
                                var splitedItem = splitedList[splitedListKey];

                                if (!found && dateFrom >= splitedFrom && dateTo <= splitedTo) {
                                    splitedList[splitedListKey] = {
                                        'idList':  splitedItem.idList.concat(idsList),
                                        'hosts':   splitedItem.hosts.concat([host]),
                                        'list':    splitedItem.list.concat(output.list),
                                        'handled': handledList,
                                    }

                                    splitedList[splitedListKey].list.sort();

                                    found = true;
                                }
                            }

                            if (!found) {
                                splitedList[dateRange] = {
                                    'idList':  idsList,
                                    'hosts':   [host],
                                    'list':    output.list,
                                    'handled': handledList,
                                }

                                splitedList[dateRange].list.sort();
                            }
                        }
                    }
                }

                clearedList = [];
                for (var splitedListKey in splitedList) {
                    var splitedItem = splitedList[splitedListKey];
                    var dateFrom = parseInt(splitedListKey.split('|||')[0]);

                    var handledList = [];
                    for (var handledKey in splitedItem.handled) {
                        var handledText = Stats.returnOutputText(splitedItem.handled[handledKey]);

                        if (handledList.indexOf(handledText) == -1) {
                            handledList.push(handledText);
                        }
                    }

                    var outputListTmp = [];
                    var outputList    = [];
                    for (var outputKey in splitedItem.list) {
                        var outputItem = splitedItem.list[outputKey];
                        var outputText = Stats.returnOutputText(outputItem);
                        var outputDate = Stats.returnTzDateFromOutput(outputItem);

                        if (outputListTmp.indexOf(outputText) == -1) {
                            outputListTmp.push(outputText);
                            outputList.push(outputDate + '|||' + outputText);
                        }
                    }

                    clearedList[dateFrom] = {
                        'handled': handledList,
                        'hosts':   splitedItem.hosts,
                        'idList':  splitedItem.idList,
                        'output':  outputList,
                    };
                }

                alerts.push({
                    'hosts':   Object.values(results[key].hosts).sort(),
                    'service': key,
                    'data':    clearedList,
                });
            }
            else {
                var clearedList = [];

                for (var outputKey in results[key].output) {
                    for (var oneRecord in results[key].output[outputKey]) {
                        var outputItem = results[key].output[outputKey][oneRecord];
                        var dateFrom   = outputItem.from;

                        var idsList       = [];
                        var outputList    = [];
                        var outputListTmp = [];
                        for (var oneOutput in outputItem.list) {
                            idsList.push(outputKey + '___' + Stats.returnDbDateFromOutput(outputItem.list[oneOutput]));

                            var outputText = Stats.returnOutputText(outputItem.list[oneOutput]);
                            var outputDate = Stats.returnTzDateFromOutput(outputItem.list[oneOutput]);
                            if (outputListTmp.indexOf(outputText) == -1) {
                                outputListTmp.push(outputText);
                                outputList.push(outputDate + '|||' + outputText);
                            }
                        }

                        var handledList = [];
                        for (var oneHandled in results[key].handled[outputKey][oneRecord].list) {
                            handledList.push(Stats.returnOutputText(results[key].handled[outputKey][oneRecord].list[oneHandled]));
                        }

                        clearedList[dateFrom] = {
                            'handled': handledList,
                            'hosts':   Object.values(results[key].hosts),
                            'idList':  idsList,
                            'output':  outputList,
                        };
                    }
                }

                alerts.push({
                    'hosts':   Object.values(results[key].hosts).sort(),
                    'service': key,
                    'data':    clearedList,
                });
            }
        }

        return alerts;
    },
    addMoreToStats: function(services) {
        var alerts = [];

        for (var service in services) {
            var more  = [];
            var hosts = services[service].hosts;
            var list  = hosts;
            hosts.sort();

            if (Stats.alertsOrder == '-host') {
                hosts.reverse();
            }

            if (hosts.length > 5) {
                more = hosts;
                hosts = hosts.length + ' different hosts (details)';
            } else {
                hosts = hosts.join(', ');
            }

            alerts.push({
                'service': services[service].service,
                'hosts':   hosts,
                'more':    more,
                'data':    services[service].data,
                'list':    list,
            });
        }

        return alerts;
    },
    prepareAlertsData: function() {
        var type = Stats.alertsShift;
        Stats.alertDetails = [];

        $(Stats.selectedUsers).each(function (userKey, user) {
            Stats.alertDetails[user] = [];

            var services = [];

            if (typeof Stats.statsData[user] !== 'undefined' && typeof Stats.statsData[user][Search.currentServerTab] !== "undefined") {
                var alertsList = null;
                var data = Stats.statsData[user][Search.currentServerTab];

                if (Stats.alertsShift == 'worked_total_list') {
                    if (Stats.longAlertsShift) {
                        alertsList = data[type];
                        alertsList = Stats.returnAlertInfoByCheckId(alertsList, data['worked_no_shift']['list']);
                    }
                    else {
                        alertsList = data['long'][type];
                        alertsList = Stats.returnAlertInfoByCheckId(alertsList, data['worked_no_shift']['list']);
                        alertsList = Stats.returnAlertInfoByCheckId(alertsList, data['long']['worked_no_shift']['list']);
                    }
                }
                else {
                    if (!Stats.longAlertsShift && typeof Stats.statsData[user][Search.currentServerTab]['long'] !== 'undefined' && typeof Stats.statsData[user][Search.currentServerTab]['long'][type] !== "undefined") {
                        alertsList = Stats.statsData[user][Search.currentServerTab]['long'][type];
                    }

                    if (Stats.longAlertsShift && typeof Stats.statsData[user][Search.currentServerTab][type] !== "undefined") {
                        alertsList = Stats.statsData[user][Search.currentServerTab][type];
                    }
                }

                if (alertsList) {
                    alertsList = Stats.explodeByOutput(alertsList);
                    services   = Stats.combineByService(alertsList);
                }
            }

            var alerts = Stats.addMoreToStats(services);

            if (Stats.alertsOrder == 'host') {
                alerts.sort((a, b) => (a.hosts.toLowerCase() > b.hosts.toLowerCase()) ? 1 : -1);
            }
            if (Stats.alertsOrder == '-host') {
                alerts.sort((a, b) => (a.hosts.toLowerCase() < b.hosts.toLowerCase()) ? 1 : -1);
            }
            if (Stats.alertsOrder == 'service') {
                alerts.sort((a, b) => (a.service.toLowerCase() > b.service.toLowerCase()) ? 1 : -1);
            }
            if (Stats.alertsOrder == '-service') {
                alerts.sort((a, b) => (a.service.toLowerCase() < b.service.toLowerCase()) ? 1 : -1);
            }

            Stats.alertDetails[user] = alerts;
        });
    },
    drawAlertDetails: function(user) {
        var html = '';

        if (Stats.alertDetails[user].length) {
            var hostOrder = 'host';
            var hostArrow = '&#8597;'

            if (Stats.alertsOrder == 'host') {
                hostOrder = '-host';
                hostArrow = '&uarr;'
            }
            if (Stats.alertsOrder == '-host') {
                hostOrder = 'host';
                hostArrow = '&darr;'
            }

            var serviceOrder = 'service';
            var serviceArrow = '&#8597;'

            if (Stats.alertsOrder == 'service') {
                serviceOrder = '-service';
                serviceArrow = '&darr;'
            }
            if (Stats.alertsOrder == '-service') {
                serviceOrder = 'service';
                serviceArrow = '&darr;'
            }

            html += '<table cellpadding="4" cellspacing="0" border="0" class="alert-details-table">';
            html += '<tr>';
            html += '<th style="width: 300px;">Service <span class="change-order" data-order="'+ serviceOrder +'">'+ serviceArrow +'</span></th>';
            html += '<th>Output</th>';
            html += '<th>How it was handled</th>';
            html += '</tr>';

            for (var key in Stats.alertDetails[user]) {
                var item = Stats.alertDetails[user][key];
                var host = item.hosts;
                var output   = [];
                var handled  = [];
                var idsLists = [];

                for (var dataKey in item.data) {
                    var outputHtml = '';

                    outputHtml += '<p style="margin: 5px 0 3px 0;"><strong>'+ item.data[dataKey].hosts.join(', ') +'</strong></p>';
                    outputHtml += '<ul style="margin: 0 0 5px 0; padding: 0; list-style: none;">';
                    for (var outputKey in item.data[dataKey].output) {
                        var outputItem = item.data[dataKey].output[outputKey].split('|||');

                        outputHtml += '<li style="padding: 3px 0; line-break: anywhere;">'+ outputItem.join(': ') +'</li>';
                    }
                    outputHtml += '</ul>';
                    output.push(outputHtml);

                    var handledHtml = [];
                    for (var handledKey in item.data[dataKey].handled) {
                        var handledRecord = item.data[dataKey].handled[handledKey];

                        if ($.inArray(handledRecord, handled) == -1) {
                            handledHtml.push(handledRecord);
                        }
                    }
                    handled.push(Stats.howItWasHandledEditButtonHtml(handledHtml.join("<br /><br />")));

                    idsLists.push(item.data[dataKey].idList.join('|||'));
                }

                if (host) {
                    var count = output.length;
                    var rowspan = '';
                    if (count > 1) {
                        rowspan = ' rowspan="'+ count +'"';
                    }
                    html += '<tr>';
                    html += '<td'+ rowspan +'>'+ item.service +'</td>';

                    var rowCount = 1;
                    for (var itemKey in output) {
                        html += '<td>'+ output[itemKey] +'</td>';
                        html += '<td valign="top" data-id-list="'+ idsLists.join("|||") +'">'+ handled[itemKey] +'</td>';

                        if (rowCount < count) {
                            html += '</tr>';
                            html += '<tr>';

                            rowCount++;
                        }
                    }

                    html += '</tr>';
                }
            }

            html += '</table>';
        }

        return html;
    },
    getUniqueKeysFromObject: function(obj1, obj2) {
        var keys = Object.keys(obj1);

        $(Object.keys(obj2)).each(function (key, value) {
            if ($.inArray(value, keys) == -1) {
                keys.push(value);
            }
        });

        return keys;
    },
    getAlertsCountsForUser: function(data) {
        var result = {
            number_of_alerts: 0,
            quick_ack_alerts_time: 0,
            total_unhandled_alerts_time: 0,
            unhandled_alerts_time: 0,
            reaction_time: 0,
        };


        if (Stats.alertsShift == 'worked_total_list') {
            if (Stats.longAlertsShift) {
                result.number_of_alerts  = data['alerts_count'];
                result.number_of_alerts += Object.keys(data['worked_no_shift']['list']).length;

                result.quick_ack_alerts_time  = data['quick_acked_time'];
                result.quick_ack_alerts_time += data['worked_no_shift']['quick_acked_time'];
            }
            else {
                var checkIdsList = Stats.getUniqueKeysFromObject(data['worked_no_shift']['list'], data['long']['worked_no_shift']['list']);

                result.number_of_alerts  = data['long']['alerts_count'];
                result.number_of_alerts += checkIdsList.length;

                result.quick_ack_alerts_time  = data['long']['quick_acked_time'];
                result.quick_ack_alerts_time += data['worked_no_shift']['quick_acked_time'];
                result.quick_ack_alerts_time += data['long']['worked_no_shift']['quick_acked_time'];
            }
        }
        else {
            var source = data;

            if (!Stats.longAlertsShift) {
                source = data['long'];
            }

            result.number_of_alerts = source['alerts_count'];
            result.quick_ack_alerts_time = source['quick_acked_time'];
            result.total_unhandled_alerts_time = Stats.getAlertDaysHoursMinutesSeconds(source['unhandled_time'], source['quick_acked_time']);
            result.unhandled_alerts_time = source['unhandled_time'];
            result.reaction_time = source['reaction_avg'];
        }

        return result;
    },
    drawStatsHtml: function() {
        $('.historyText').html('');
        Stats.prepareAlertsData();

        if (!Stats.selectedUsers || !Stats.selectedUsers.length) {
            return;
        }
        
        var html = '<h4 style="font-weight: normal; text-align: center;border-bottom: 1px solid #c5c5c5; padding-bottom: 15px; margin-top: 0;">'+ Stats.selectedUsers.join(', ') +' - '+ Stats.selectedFrom + ' - ' + Stats.selectedTo +'</h4>';
        html += '<table cellpadding="0" cellspacing="0" border="0" style="width: 100%"><tr><td style="vertical-align: top;"><div id="statsChart"></div></td></tr></table>';

        $(Stats.selectedUsers).each(function (key, value) {
            if (Stats.selectedUsers.length > 1) {
                html += '<p><strong>'+ value +' ('+ Search.currentServerTab +')</strong></p>';
            }

            if (value in Stats.statsData && Search.currentServerTab in Stats.statsData[value]) {
                var userData = (!Stats.longAlertsShift) ? Stats.statsData[value][Search.currentServerTab]['long'] : Stats.statsData[value][Search.currentServerTab];
                var listData = Stats.getAlertsCountsForUser(Stats.statsData[value][Search.currentServerTab]);

                html += '<ul>';

                if (Stats.alertsShift == 'worked_total_list') {
                    if (value == 'Summary report' || value == 'Nobody\'s shift') {
                        html += '<li>No stats.</li>';
                    }
                    else {
                        html += '<li>Number of alerts for selected period: '+ listData.number_of_alerts +'</li>';
                        html += '<li>Alerts in \'quick ack\' state: '+ Stats.returnDayHour(listData.quick_ack_alerts_time) +'</li>';
                    }
                }
                else {
                    html += '<li>Avg reaction time: '+ Stats.returnDayHour(listData.reaction_time) +'</li>';
                    html += '<li>Number of alerts for selected period: '+ listData.number_of_alerts +'</li>';
                    html += '<li>Total alert-hours: '+ Stats.returnDayHour(listData.unhandled_alerts_time) +'</li>';
                    html += '<li>Alerts in \'quick ack\' state: '+ Stats.returnDayHour(listData.quick_ack_alerts_time) +'</li>';
                    html += '<li>Unhandled alerts time: '+ listData.total_unhandled_alerts_time +'</li>';

                    if (Stats.longAlertsShift) {
                        html += '<li># of emergencies: ' + userData['emergency_count'] + '</li>';
                        html += '<li># of emergencies escalated to calls: ' + userData['emergency_calls'] + '</li>';

                        if (value == 'Summary report') {
                            for (var name in userData['additional']) {
                                html += '<li>' + name + ': ' + userData['additional'][name] + '</li>';
                            }
                        }
                    }
                }

                html += '</ul>';
            } else {
                html += '<ul>';
                html += '<li>No stats.</li>';
                html += '</ul>';
            }

            if (value != 'Summary report' && value != 'Nobody\'s shift') {
                html += Stats.drawAlertDetails(value);
            }
        });

        $('.historyText').html(html);
        $('#grouping-alerts-switch').buttonset();
    },
    getAlertDaysHoursMinutesSeconds: function(unhandled_time, quick_acked_time) {
        var seconds = unhandled_time - quick_acked_time;
        var result  = '';

        seconds     = parseInt(seconds, 10);
        var days    = Math.floor(seconds / (60 * 60 * 24));
        seconds    -= days * 60 * 60 * 24;
        var hours   = Math.floor(seconds / (60 * 60));
        seconds    -= hours * 60 * 60;
        var minutes = Math.floor(seconds / 60);
        seconds    -= minutes * 60;

        if (days) {
            result += days + 'd ';
        }

        if (hours) {
            result += hours + 'h ';
        }

        if (minutes) {
            result += minutes + 'm ';
        }

        if (seconds) {
            result += seconds + 's ';
        }

        if (!result) {
            result = 0;
        }

        return result;
    },
    getAlertDaysHours: function(unhandled_time, quick_acked_time) {
        var seconds = unhandled_time - quick_acked_time;
        var result  = '';

        seconds     = parseInt(seconds, 10);
        var days    = Math.floor(seconds / (60 * 60 * 24));
        seconds    -= days * 60 * 60 * 24;
        var hours   = Math.floor(seconds / 3600);

        if (days) {
            result += days + 'd ';
        }

        if (hours) {
            result += hours + 'h ';
        }

        if (!result) {
            result = 0;
        }

        return result;
    },
    getAlertDays: function(unhandled_time, quick_acked_time) {
        return Math.floor((unhandled_time - quick_acked_time) / 60 / 60 / 24);
    },
    getChartData: function() {
        var result = {
            users: [],
            all: [],
            warning: [],
            critical: [],
            unknown: [],
            info: [],
            emergency: [],
        };

        $(Stats.selectedUsers).each(function (key, value) {
            result.users.push(value.split(" ").join("\n"));

            var all_count = 0;
            var warning_count = 0;
            var critical_count = 0;
            var unknown_count = 0;
            var info_count = 0;
            var emergency_count = 0;

            if (value in Stats.statsData && Search.currentServerTab in Stats.statsData[value]) {
                if (Stats.alertsShift == 'worked_total_list') {
                    if (value != 'Summary report' && value != 'Nobody\'s shift') {
                        var data = Stats.statsData[value][Search.currentServerTab];

                        if (Stats.longAlertsShift) {
                            warning_count = data['warning_count'];
                            warning_count += data['worked_no_shift']['warning_count'];
                            critical_count = data['critical_count'];
                            critical_count += data['worked_no_shift']['critical_count'];
                            unknown_count = data['unknown_count'];
                            unknown_count += data['worked_no_shift']['unknown_count'];
                            info_count = data['info_count'];
                            info_count += data['worked_no_shift']['info_count'];
                            emergency_count = data['emergency_count'];
                            emergency_count += data['worked_no_shift']['emergency_count'];
                            all_count = warning_count + critical_count + unknown_count + info_count;
                        } else {
                            warning_count = data['long']['warning_count'];
                            warning_count += data['long']['worked_no_shift']['warning_count'];
                            warning_count += data['worked_no_shift']['warning_count'];
                            critical_count = data['long']['critical_count'];
                            critical_count += data['long']['worked_no_shift']['critical_count'];
                            critical_count += data['worked_no_shift']['critical_count'];
                            unknown_count = data['long']['unknown_count'];
                            unknown_count += data['long']['worked_no_shift']['unknown_count'];
                            unknown_count += data['worked_no_shift']['unknown_count'];
                            info_count = data['long']['info_count'];
                            info_count += data['long']['worked_no_shift']['info_count'];
                            info_count += data['worked_no_shift']['info_count'];
                            emergency_count = data['long']['emergency_count'];
                            emergency_count += data['long']['worked_no_shift']['emergency_count'];
                            emergency_count += data['worked_no_shift']['emergency_count'];
                            all_count = warning_count + critical_count + unknown_count + info_count;
                        }
                    }
                } else {
                    var alertData = null;

                    if (value in Stats.statsData && Search.currentServerTab in Stats.statsData[value]) {
                        if (Stats.longAlertsShift) {
                            alertData = Stats.statsData[value][Search.currentServerTab];
                        } else if ('long' in Stats.statsData[value][Search.currentServerTab]) {
                            alertData = Stats.statsData[value][Search.currentServerTab]['long'];
                        }
                    }

                    if (alertData) {
                        warning_count = alertData['warning_count'];
                        critical_count = alertData['critical_count'];
                        unknown_count = alertData['unknown_count'];
                        info_count = alertData['info_count'];
                        emergency_count = alertData['emergency_count'];
                        all_count = warning_count + critical_count + unknown_count + info_count;
                    }
                }
            }

            result.warning.push(warning_count);
            result.critical.push(critical_count);
            result.unknown.push(unknown_count);
            result.info.push(info_count);
            result.emergency.push(emergency_count);
            result.all.push(all_count);
        });

        return result;
    },
    drawChart: function() {
        var cfg = Stats.getChartData();

        let StatsChartConfig = {
            type: 'bar',
            legend: { draggable: false },
            scaleX: {
                labels: cfg.users
            },
            plotarea:{ marginTopOffset: '0px' },
            chart: { "margin-top": 10, "margin-bottom": 40 },
            plot: {
                animation: { effect: 'ANIMATION_EXPAND_BOTTOM', method: 'ANIMATION_STRONG_EASE_OUT', sequence: 'ANIMATION_BY_NODE',  speed: 275 },
                tooltip: { text: "%kl <br>%v %t", padding: "10%", 'border-radius': "5px" }
            },
            series: [
                { values: cfg.all,      text: 'All'      , 'background-color': '#00FF9B'},
                { values: cfg.critical, text: 'Critical' , 'background-color': '#F83838'},
                { values: cfg.warning,  text: 'Warning'  , 'background-color': '#FFFF00'},
                { values: cfg.unknown,  text: 'Unknown'  , 'background-color': '#FF9900'},
                { values: cfg.info,     text: 'Info'     , 'background-color': '#67A4FF'},
                { values: cfg.emergency,text: 'Emergency', 'background-color': '#000000'},
            ]
        };

        zingchart.render({
            id: 'statsChart',
            data: StatsChartConfig,
            height: '300px',
        });
    },
    returnDayHour: function(seconds) {
        var result  = '';
        seconds     = parseInt(seconds, 10);
        var days    = Math.floor(seconds / (3600 * 24));
        seconds    -= days * 3600 * 24;
        var hours   = Math.floor(seconds / 3600);
        seconds    -= hours * 3600;
        var minutes = Math.floor(seconds / 60);
        seconds    -= minutes * 60;

        if (days) {
            result += days + 'd ';
        }

        if (hours) {
            result += hours + 'h ';
        }

        if (minutes) {
            result += minutes + 'm ';
        }

        if (seconds) {
            result += seconds + 's';
        }

        if (!result) {
            result = '-';
        }

        return result;
    },
    getServersList: function() {
        $.ajax({
            type:    'GET',
            url:     'stats.php',
            data:    {'list': 'servers'},
            success: function(data){
                Stats.serversList    = data.serversList;
                Stats.fullUsersList  = data.usersList;
                Stats.groupByService = data.groupByService;
                Stats.groupByHost    = data.groupByHost;
                Stats.tz             = data.timeZone;
                Stats.timeZonesList  = data.timeZonesList;
                Stats.drawTimeZonesList();

                Stats.initUrlParams();
                Stats.changeDefaultValuesFromUrl();

                Stats.prepareUsersLists($("input[name=report_type]:checked").val());
                Stats.drawTabsList();
                Stats.drawSelects();
            }
        });
    },
    drawTimeZonesList: function() {
        var tzList = '';

        $(Stats.timeZonesList).each(function (key, value) {
            var selected = (Stats.timeZone == encodeURI(value)) ? 'selected="selected"' : '';
            tzList += '<option value="'+ encodeURI(value) +'" '+ selected +'>TZ: '+ value +'</option>';
        });

        $('#timeZoneBlock').css('clear', 'both').show();
        $('#timeZoneSelect').html(tzList);
        $('#timeZoneSelect').selectmenu({
            select: function (event, data) {
                if (Stats.timeZone != data.item.value) {
                    localStorage.setItem('timeZone', data.item.value);
                    Stats.timeZone = localStorage.getItem('timeZone');
                    Stats.drawStats();
                }
            }
        });
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

                    if ($('.historyText h4:first-child').text() == 'Yearly report') {
                        Stats.drawAlertDaysTable();
                    } else if (Stats.statsData) {
                        $('#filterStats').trigger( "click" );
                    }
                }
            }
        });
    },
    drawButtons: function() {
        $('#' + Search.currentTab).prop('checked', true);
        $('#stats').prop('checked', true);
        $('#timeZoneBlock, #radio, #EMERGENCY, #EMERGENCY-label, #hosts, #hosts-label, #planned, #planned-label, #radio .xs-hide, .historyHeading table.historyInput').hide();
        $('#radio-switch').buttonset();

        $('#loading, #mainTable').hide();
        $('#updatedAgo').closest('p').hide();
        $('#server-errors').hide();
        $('#infoHolder, #historyContent').show();

        $('.historyHeading').css('padding-top', '0');
    },
    prepareUsersLists: function(value) {
        Stats.reportType = value;
        Stats.usersList  = [];
        if (Stats.reportType == 'per_admin_report') {
            $(Stats.fullUsersList).each(function (key, value) {
                if (value == 'Summary report' || value == 'Nobody\'s shift') {
                    return;
                }
                Stats.usersList.push(value);
            });
        } else {
            Stats.usersList.push('Summary report');
            Stats.usersList.push('Nobody\'s shift');
        }
    },
    drawSelects: function() {
        if (Stats.reportType == 'per_admin_report') {
            $('#usersFilter').show();
            $('#calendar_switch').css('height', 'auto');
            $('.during_shifts, .during_shift').show();
        }

        $('#usersFilter').html('');
        $(Stats.usersList).each(function (key, value) {
            $('#usersFilter').append('<option value="'+ value +'">'+ value +'</option>');
        });

        if (Stats.reportType == 'per_admin_report') {
            $('#usersFilter').val(decodeURI(Stats.urlData.users).split(';'))
        }

        if (Stats.reportType != 'per_admin_report') {
            $('#usersFilter').hide();
            $('#calendar_switch').css('height', '28px');
            $('.during_shifts, .during_shift').hide();
        }

        var periodsList = Stats.returnSelectList();
        var itemCalendarSelected = $("#calendar_switch option:selected");

        if (!itemCalendarSelected.length) {
            itemCalendarSelected = Stats.getValidatedPeriod(periodsList, decodeURI(Stats.urlData.period));
        } else {
            itemCalendarSelected = itemCalendarSelected.val();
        }

        $('#calendar_switch').html('');

        $(periodsList).each(function (key, value) {
            var selected = '';

            if (itemCalendarSelected == value.name) {
                selected = ' selected="selected"';
            }

            $('#calendar_switch').append('<option value="'+ value.name +'" data-from="'+ value.value.from +'" data-to="'+ value.value.to +'" '+ selected +'>'+ value.name +'</option>');
        });

        $('#grouping option[value="'+ Search.currentGroup +'"]').attr('selected', 'selected');
        $('#grouping').selectmenu({ disabled: true });

        Stats.changePeriodDates();
        Stats.checkCalendarSwitch();
        Stats.drawDatePickers();
    },
    getValidatedPeriod: function(list, value) {
        var periods = [];

        for (var key in list) {
            periods.push(list[key].name);
        }

        if (periods.indexOf(value) !== -1) {
            return value;
        }

        return 'Today';
    },
    drawDatePickers: function() {
        var dateTimePickerFromSettings = {
            timeFormat: 'HH:mm:ss',
            dateFormat: 'yy-mm-dd',
            controlType: 'select',
            oneLine: true,
            defaultValue: $('#stats_from_date').val(),
        };

        dateTimePickerToSettings = dateTimePickerFromSettings;
        dateTimePickerToSettings.defaultValue = $('#stats_to_date').val();

        $('#stats_from_date').datetimepicker(dateTimePickerFromSettings);
        $('#stats_to_date').datetimepicker(dateTimePickerToSettings);
    },
    changePeriodDates: function() {
        item = $("#calendar_switch option:selected");

        if (item.val() != 'Custom') {
            $('#stats_from_date').val(item.attr('data-from'));
            $('#stats_to_date').val(item.attr('data-to'));
        } else {
            var from = decodeURI(Stats.urlData.from);
            var to = decodeURI(Stats.urlData.to);

            if (moment(from, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
                $('#stats_from_date').val(from);
            }

            if (moment(to, "YYYY-MM-DD HH:mm:ss", true).isValid()) {
                $('#stats_to_date').val(to);
            }
        }
    },
    checkCalendarSwitch: function() {
        var from     = $('#stats_from_date').val(),
            to       = $('#stats_to_date').val(),
            selected = 'Custom';

        $('#calendar_switch option').each(function (key, value) {
            if (from == $(value).attr('data-from') && to == $(value).attr('data-to')) {
                selected = $(value).val();

                return false;
            }
        });

        if ($('#calendar_switch').val() != selected) {
            $('#calendar_switch option[value="'+ $('#calendar_switch').val() +'"]').removeAttr('selected');
            $('#calendar_switch option[value="'+ selected +'"]').prop('selected', 'selected');
        }
    },
    returnPeriod: function(period) {
        if (period == 'custom') {
            return { from: 'custom', to: 'custom' };
        }

        var from = moment(),
            to   = moment();

        if (period == 'yesterday') {
            from.subtract(1, 'days');
            to.subtract(1, 'days');
        }
        if (period == 'last2days') {
            from.subtract(1, 'days');
        }
        if (period == 'thisWeek') {
            from.startOf('isoweek');
        }
        if (period == 'last7days') {
            from.subtract(6, 'days');
        }
        if (period == 'lastWeek') {
            from.subtract(6, 'days').startOf('isoweek');
            to.subtract(6, 'days').endOf('isoweek');
        }
        if (period == 'thisMonth') {
            from.startOf('month');
        }
        if (period == 'last30days') {
            from.subtract(29, 'days');
        }
        if (period == 'lastMonth') {
            from.subtract(1, 'months').startOf('month');
            to.subtract(1, 'months').endOf('month');
        }

        return { from: from.format('Y-MM-DD') + ' 00:00:00', to: to.format('Y-MM-DD') + ' 23:59:59' };
    },
    returnSelectList: function() {
        return [
            { name: 'Today',        value: this.returnPeriod('today') },
            { name: 'Yesterday',    value: this.returnPeriod('yesterday') },
            { name: 'Last 2 Days',  value: this.returnPeriod('last2days') },
            { name: 'This Week',    value: this.returnPeriod('thisWeek') },
            { name: 'Last 7 Days',  value: this.returnPeriod('last7days') },
            { name: 'Last Week',    value: this.returnPeriod('lastWeek') },
            { name: 'This Month',   value: this.returnPeriod('thisMonth') },
            { name: 'Last 30 Days', value: this.returnPeriod('last30days') },
            { name: 'Last Month',   value: this.returnPeriod('lastMonth') },
            { name: 'Custom',       value: this.returnPeriod('custom') },
        ];
    },
};
Emergency = {
    id: null,
    limit: 10,
    page: 1,
    from: '',
    to: '',
    timeZone: localStorage.getItem('timeZone'),
    timeZonesList: [],
    waveformList: [],
    init: function() {
        this.drawButtons();
        this.setParams();
        this.drawDatePickers();
        this.getTimezonesList();

        $('#stats').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?stats=1";
        });
        $('#alerts').on('click', function() {
            window.location = window.location.href.split('?')[0];
        });
        $('#history').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?t=1";
        });
        $('#users').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?users=1";
        });
        $(document).on('change', '.emergencies-per-page-select', function() {
            Emergency.limit = $(this).find(":selected").val();
            Emergency.page  = 1;
            Emergency.goTo();
        });
        $(document).on('click', '.play-pause', function() {
            Emergency.waveformList[$(this).attr('waveid')].playPause();
        });
        $(document).on('click', '.go-to-full-list', function() {
            window.location.href = '//' + location.host + location.pathname + '?emergency=1';
        });
        $('.emergencies-select-period').on('change', function() {
            Emergency.changePeriodDates();
            Emergency.checkCalendarSwitch();
        });
        $('#emergencies_from_date, #emergencies_to_date').on('change', function() {
            Emergency.checkCalendarSwitch();
        });
        $('#emergencies-filter').on('click', function() {
            Emergency.from = $('#emergencies_from_date').val();
            Emergency.to   = $('#emergencies_to_date').val();

            Emergency.goTo();
        });
    },
    setParams: function() {
        if (Search.getParameterByName('id') && Search.getParameterByName('id') != 'null') {
            Emergency.id = Search.getParameterByName('id');
        }
        if (Search.getParameterByName('limit') && parseInt(Search.getParameterByName('limit')) > 0) {
            Emergency.limit = parseInt(Search.getParameterByName('limit'));
        }
        if (Search.getParameterByName('page') && parseInt(Search.getParameterByName('page')) > 0) {
            Emergency.page = parseInt(Search.getParameterByName('page'));
        }
        if (Search.getParameterByName('from')) {
            Emergency.from = Search.getParameterByName('from');
        }
        if (Search.getParameterByName('to')) {
            Emergency.to = Search.getParameterByName('to');
        }
    },
    drawButtons: function() {
        $('#emergencies').prop('checked', true);
        $('#timeZoneBlock, #radio, #EMERGENCY, #EMERGENCY-label, #hosts, #hosts-label, #planned, #planned-label, #radio .xs-hide, .historyHeading table.historyInput, #normalGrouping, #tabs').hide();
        $('#radio-switch').buttonset();

        $('#loading, #mainTable').hide();
        $('#updatedAgo').closest('p').hide();
        $('#server-errors').hide();
        $('#infoHolder, #historyContent').show();

        $('.historyHeading').css('padding-top', '0').html('');
    },
    getTimezonesList: function() {
        $.ajax({
            type:    'GET',
            url:     'emergency.php',
            data:    {'list': 'timeZones'},
            success: function(data){
                Emergency.timeZonesList  = data.timeZonesList;
                Emergency.drawTimeZonesList();
                Emergency.getList();
            }
        });
    },
    drawTimeZonesList: function() {
        var tzList = '';

        $(Emergency.timeZonesList).each(function (key, value) {
            var selected = (Emergency.timeZone == encodeURI(value)) ? 'selected="selected"' : '';
            tzList += '<option value="'+ encodeURI(value) +'" '+ selected +'>TZ: '+ value +'</option>';
        });

        $('#timeZoneBlock').css('clear', 'both').show();
        $('#timeZoneSelect').html(tzList);
        $('#timeZoneSelect').selectmenu({
            select: function (event, data) {
                if (Emergency.timeZone != data.item.value) {
                    localStorage.setItem('timeZone', data.item.value);
                    Emergency.timeZone = localStorage.getItem('timeZone');
                    Emergency.goTo();
                }
            }
        });
    },
    drawDatePickers: function() {
        var html = "";
        html += "<span id='emergencies-period'><label style='margin-right: 20px;'><strong>Period:</strong> <select class='emergencies-select-period' style='padding: 3px;'><option value='' data-from='' data-to=''></option></select></label></span>";
        html += "<span id='emergencies-dates'><strong>Pick dates:</strong>";
        html += '<label style="margin-left: 15px;">From: <input type="text" name="emergencies_from_date" id="emergencies_from_date" value="'+ Emergency.from +'" class="text" style="font-size: 13px; outline: none; width: 150px; padding: 3px;" autocomplete="off"></label>';
        html += '<label style="margin-left: 15px;">To: <input type="text" name="emergencies_to_date" id="emergencies_to_date" value="'+ Emergency.to +'" class="text" style="font-size: 13px; outline: none; width: 150px; padding: 3px;" autocomplete="off"></label>';
        html += '</span>';
        html += '<span><button id=\'emergencies-filter\' style="margin-left: 15px; padding: 3px;">Filter</button></span>';


        $('.historyHeading').html(html);

        $(Stats.returnSelectList()).each(function (key, value) {
            $('.emergencies-select-period').append('<option value="'+ value.name +'" data-from="'+ value.value.from +'" data-to="'+ value.value.to +'">'+ value.name +'</option>');
        });

        Emergency.drawDatePicker();
        Emergency.checkCalendarSwitch();
    },
    drawDatePicker: function() {
        var dateTimePickerFromSettings = {
            timeFormat: 'HH:mm:ss',
            dateFormat: 'yy-mm-dd',
            controlType: 'select',
            oneLine: true,
            defaultValue: $('#emergencies_from_date').val(),
        };

        dateTimePickerToSettings = dateTimePickerFromSettings;
        dateTimePickerToSettings.defaultValue = $('#emergencies_to_date').val();

        $('#emergencies_from_date').datetimepicker(dateTimePickerFromSettings);
        $('#emergencies_to_date').datetimepicker(dateTimePickerToSettings);
    },
    changePeriodDates: function() {
        item = $(".emergencies-select-period option:selected");

        if (item.val() != 'Custom') {
            $('#emergencies_from_date').val(item.attr('data-from'));
            $('#emergencies_to_date').val(item.attr('data-to'));
        }
    },
    checkCalendarSwitch: function() {
        var from     = $('#emergencies_from_date').val(),
            to       = $('#emergencies_to_date').val(),
            selected = 'Custom';

        $('.emergencies-select-period option').each(function (key, value) {
            if (from == $(value).attr('data-from') && to == $(value).attr('data-to')) {
                selected = $(value).val();

                return false;
            }
        });

        if ($('.emergencies-select-period').val() != selected) {
            $('.emergencies-select-period [value="'+ $('.emergencies-select-period').val() +'"]').removeAttr('selected');
            $('.emergencies-select-period [value="'+ selected +'"]').prop('selected', 'selected');
        }
    },
    getList: function() {
        $.ajax({
            type:    'GET',
            url:     'emergency.php',
            data:    {id: Emergency.id, limit: Emergency.limit, page: Emergency.page, from: Emergency.from, to: Emergency.to, tz: Emergency.timeZone, diff: moment().utcOffset()},
            success: function(data){
                var waveformList = [];
                var idsList = [];

                var html = "";
                html += "<table class='emergencies-table' cellpadding='0' cellspacing='0' border='1'>";
                html += "<tr>";
                html += "<th>Logged</th>";
                html += "<th>Service</th>";
                html += "<th>History</th>";
                html += "<th>Why it happened</th>";
                html += "<th>Preventative measures</th>";
                html += "</tr>";

                for (var i = 0; i < data.data.length; i++) {
                    var item = data.data[i];
                    idsList.push(item.id);

                    var link = (!Emergency.id) ? ("<a href=\"?emergency=1&id="+ item['id'] +"\">"+ item['logged'] +"</a>") : ("<span>"+ item['logged'] +"</span>");
                    html += "<tr>";
                    html += "<td>"+ link +"<br /><br />"+ item['host'] +"<br /><br />"+ item.id +"</td>";
                    html += "<td>"+ item.service +"<br /><br /><small>"+ item.output +"</small></td>";
                    html += "<td width='280'>"+ item.history.split('|').join("<br />");

                    if (item.link) {
                        var id = "waveform-" + item.id;
                        html += "<div id="+ id +"></div>";
                        html += "<div style=\"text-align: center\"><button waveid='"+ id +"' class='play-pause'>Play/Pause</button></div>";

                        waveformList[id] = item.link;
                    }

                    html +="</td>";
                    html += "<td width='240'><a href=\"#\" id=\"investigation"+ item.id +"\" data-type=\"textarea\" data-pk=\"1\">" +item.investigation +"</a>" + "<br /><br />by <span class='investigation_author'>"+ item.author_investigation +"</span>. Updated: <span class='investigation_date'>"+ item.updated_investigation +"</span></td>";
                    html += "<td width='240'><a href=\"#\" id=\"prevention"+ item.id +"\" data-type=\"textarea\" data-pk=\"1\">"+ item.prevention +"</a>" + "<br /><br />by <span class='prevention_author'>"+ item.author_prevention +"</span>. Updated: <span class='prevention_date'>"+ item.updated_prevention +"</span></td>";
                    html += "</tr>";
                }

                if (!Emergency.id) {
                    html += "<tr><td id='emergencies-per-page'></td><td id='emergencies-total' colspan='2' align='center'></td><td colspan='2' id='emergencies-pagination'></td></tr>";
                } else {
                    html += "<tr><td colspan='5' style='text-align:center; padding: 7px;'><button class='go-to-full-list'>Go to full list</button></td></tr>";
                }

                html += "</table>";

                $('.historyText').html(html);

                if (!Emergency.id) {
                    Emergency.drawTablesBottom(data.total);
                }

                for (var [key, value] of Object.entries(waveformList)) {
                    Emergency.waveformList[key] = WaveSurfer.create({
                        container: '#' + key,
                        height: 40
                    });

                    Emergency.waveformList[key].load(value);
                }

                for (var i = 0; i < idsList.length; i++) {
                    $('#investigation' + idsList[i]).editable({
                        url: '/emergency.php?save=1&author=' + $('#userName').text() +'&id=' + idsList[i] + '&type=investigation',
                        title: 'change investigation',
                        rows: 10,
                        mode: 'inline',
                        type: 'text',
                        success: function(data, config) {
                            for (var i = 0; i < data.data.length; i++) {
                                var item = data.data[i];
                                var row  = $(document).find('#investigation' + item.id).closest('td');
                                row.find('.investigation_author').text(item.investigation_author);
                                row.find('.investigation_date').text(item.updated_investigation);
                            }
                        }
                    });
                    $('#prevention' + idsList[i]).editable({
                        url: '/emergency.php?save=1&author=' + $('#userName').text() +'&id=' + idsList[i] + '&type=prevention',
                        title: 'change prevention',
                        rows: 10,
                        mode: 'inline',
                        type: 'text',
                        success: function(data, config) {
                            for (var i = 0; i < data.data.length; i++) {
                                var item = data.data[i];
                                var row  = $(document).find('#prevention' + item.id).closest('td');
                                row.find('.prevention_author').text(item.author_prevention);
                                row.find('.prevention_date').text(item.updated_prevention);
                            }
                        }
                    });
                }
            }
        });
    },
    drawTablesBottom: function(total) {
        if (total == 0) {
            $('.historyText').html("<h4>Nothing Found. Please search again.</h4>");

            return;
        }
        var perPage = [10, 20, 40, 80, 150, -1];
        var options = '';

        if (perPage.indexOf(Emergency.limit) == -1) {
            Emergency.limit = 10;
        }

        for (var i = 0; i < perPage.length; i++) {
            var selected = (perPage[i] == Emergency.limit) ? ' selected="selected"' : '';
            var name = (perPage[i] == -1) ? 'all' : perPage[i];
            options += '<option label="'+ perPage[i] +'" value="'+ perPage[i] +'" '+ selected +'>'+ name +'</option>';
        }
        $("#emergencies-per-page").html('<label><select class="emergencies-per-page-select">'+ options +'</select> records per page</label>').closest('td').css("padding", "15px 5px");


        var from = (Emergency.limit * Emergency.page) - Emergency.limit + 1;
        var to = from + Emergency.limit - 1;

        if (to > total) {
            to = total;
        }
        $("#emergencies-total").html('Showing '+ from +' to '+ to +' of '+ total +' records').closest('td').css("padding", "15px 5px");


        var totalPagesList = [];

        for (var i = 1; i <= Math.ceil(total / Emergency.limit); i++) {
            totalPagesList.push(i);
        }

        $('#emergencies-pagination').pagination({
            dataSource: totalPagesList,
            totalNumber: Emergency.limit,
            pageSize: 1,
            pageNumber: Emergency.page,
            callback: function(data, pagination) {
                if (parseInt(data[0]) != Emergency.page) {
                    Emergency.page = data[0];
                    Emergency.goTo();
                }
            }
        });
    },
    goTo: function() {
        window.location.href = '//' + location.host + location.pathname + '?emergency=1&id=' + Emergency.id + '&limit=' + Emergency.limit + '&page=' + Emergency.page + '&from=' + Emergency.from + '&to=' + Emergency.to + '&tz=' + Emergency.timeZone + '&diff=' + moment().utcOffset();
    }
};
Users = {
    usersList: [],
    init: function() {
        this.drawButtons();
        this.getUsersList();

        $('#alerts').on('click', function() {
            window.location = window.location.href.split('?')[0];
        });
        $('#history').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?t=1";
        });
        $('#emergencies').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?emergency=1";
        });
        $('#stats').on('click', function() {
            window.location = window.location.href.split('?')[0] + "?stats=1";
        });

        $(document).on('click', '[name=save_user]', function() {
            Users.saveUser($(this).closest('tr'));
        });

        $(document).on('click', '[name=delete_user]', function() {
            Users.deleteUser($(this).closest('tr'));
        });

        $(document).on('click', '[name=add_new_user]', function() {
            Users.addNewUser();
        });
    },
    validateSaveUser: function(row) {
        $('[name=name], [name=email], [name=full_name], [name=servers]').css('border-color', '');

        var error = [];

        if (!row.find('[name=name]').val().trim()) {
            error.push(" Please enter 'login'.");
            row.find('[name=name]').css('border-color', 'red');
        }

        if (!row.find('[name=email]').val().trim()) {
            error.push(" Please enter 'email'.");
            row.find('[name=email]').css('border-color', 'red');
        }

        if (!row.find('[name=full_name]').val().trim()) {
            error.push(" Please enter 'full name'.");
            row.find('[name=full_name]').css('border-color', 'red');
        }

        if (row.find('[name=servers]').length > 0 && !row.find('[name=servers]').val()) {
            error.push(" Please select at least one 'server'.");
            row.find('[name=servers]').css('border-color', 'red');
        }

        if (error.length) {
            alert(error.join("\n"));
            return false;
        }

        return true;
    },
    addNewUser: function() {
        if (Users.isAdminUser()) {
            html = '';
            html += '<tr data-name="" data-email=""  data-full_name=""  data-server=""  data-super_user="" data-type="new">';
            html += '<td valign="top"><input type="text" name="name" value="" /></td>';
            html += '<td valign="top"><input type="text" name="email" value="" /></td>';
            html += '<td valign="top"><input type="text" name="full_name" value="" /></td>';
            html += '<td valign="top">';
            html += '<select name="servers" multiple style="width: 200px;">';
            $(Users.serversList).each(function (keyServer, server) {
                html += '<option value="'+ server +'">'+ server +'</option>';
            });
            html += '</select>';
            html += '</td>';
            html += '<td valign="top" align="center"><input type="checkbox" name="super_user"></td>';
            html += '<td valign="top" align="center"><input type="button" name="save_user" value="save" /></td>';
            html += '<td valign="top"></td>';
            html += '</tr>';

            $('#historyContent tr:first-child').after(html);
        }
    },
    saveUser: function(row) {
        if (Users.validateSaveUser(row)) {
            if (confirm("Are you shure you want to save?")) {
                var action  = (row.attr('data-type') == 'new') ? 'insert' : 'save';
                var oldData = {
                    'name':       row.attr('data-name'),
                    'email':      row.attr('data-email'),
                    'full_name':  row.attr('data-full_name'),
                    'server':     row.attr('data-server'),
                    'super_user': row.attr('data-super_user'),
                };
                var newData = {
                    'name':       encodeURIComponent(row.find('[name=name]').val()),
                    'email':      encodeURIComponent(row.find('[name=email]').val()),
                    'full_name':  encodeURIComponent(row.find('[name=full_name]').val()),
                    'server':     (row.find('[name=servers]').length > 0)    ? encodeURIComponent(row.find('[name=servers]').val().join(','))    : row.attr('data-server'),
                    'super_user': (row.find('[name=super_user]').length > 0) ? encodeURIComponent((row.find('[name=super_user]').is(":checked")) ? 1 :0 ) : row.attr('data-super_user'),
                };

                $.ajax({
                    url:    'users.php?action='+ action +'-user&user=' + $('#userName').text(),
                    method: 'POST',
                    data:   { oldData: oldData, newData: newData },
                })
                    .fail(function(jqXHR) {
                        alert(jqXHR.responseText);
                    })
                    .done(function() {
                        Users.getUsersList();
                    });
            }
        }
    },
    deleteUser: function(row) {
        if (confirm("Are you shure you want to delete?")) {
            var oldData = {
                'name':       row.attr('data-name'),
                'email':      row.attr('data-email'),
                'full_name':  row.attr('data-full_name'),
                'server':     row.attr('data-server'),
                'super_user': row.attr('data-super_user'),
            };

            $.ajax({
                url:    'users.php?action=delete-user&user=' + $('#userName').text(),
                method: 'POST',
                data:   { oldData: oldData },
            })
                .fail(function(jqXHR) {
                    console.log(jqXHR);
                    alert(jqXHR.responseText);
                })
                .done(function() {
                    Users.getUsersList();
                });
        }
    },
    drawButtons: function() {
        $('#tabsSelect').html('<option value="'+ Search.currentServerTab +'" selected="selected">Server: '+ Search.currentServerTab +'</option>');
        $('#tabsSelect').selectmenu({ disabled: true });

        $('#grouping option[value="'+ Search.currentGroup +'"]').attr('selected', 'selected');
        $('#grouping').selectmenu({ disabled: true });

        $('#users').prop('checked', true);
        $('#timeZoneBlock, #radio, #EMERGENCY, #EMERGENCY-label, #hosts, #hosts-label, #planned, #planned-label, #radio .xs-hide, .historyHeading table.historyInput').hide();
        $('#radio-switch').buttonset();

        $('#loading, #mainTable').hide();
        $('#updatedAgo').closest('p').hide();
        $('#server-errors').hide();
        $('#infoHolder, #historyContent').show();
        $('#historyContent').html('');
    },
    getUsersList: function() {
        $('#historyContent').html('');
        $.ajax({
            type:    'GET',
            url:     'users.php',
            data:    {'user': $('#userName').text()},
            success: function(data){
                Users.usersList   = data.users;
                Users.serversList = data.servers;

                Users.setServersList();
                Users.drawUsersTable();
            }
        });
    },
    setServersList: function() {
        $(Users.usersList).each(function (key, value) {
            $(value['server']).each(function (keyServer, server) {
                if (Users.serversList.indexOf(server) === -1) {
                    Users.serversList.push(server);
                }
            });
        });

        Users.serversList.sort();
    },
    isAdminUser: function() {
        if (Users.usersList.length && "admin_user" in Users.usersList[0]) {
            return true;
        }

        return false;
    },
    drawUsersTable: function() {
        var addNewUser = (Users.isAdminUser()) ? '<input type="button" name="add_new_user" value="add new user" style="float: right;" />' : '';
        var html = '<h4 style="padding-top: 20px;">Users list '+ addNewUser +'</h4>';

        html += '<table cellpadding="4" cellspacing="0" border="1" class="users-table">';
        html += '<tr>';
        html += '<th>login</th>';
        html += '<th>email</th>';
        html += '<th>full name</th>';
        html += '<th>servers</th>';
        html += '<th>super user</th>';
        html += '<th></th>';
        html += '<th></th>';
        html += '</tr>';

        $(Users.usersList).each(function (key, value) {
            html += '<tr data-name="'+ encodeURIComponent(value['name']) +'" data-email="'+ encodeURIComponent(value['email']) +'"  data-full_name="'+ encodeURIComponent(value['full_name']) +'"  data-server="'+ encodeURIComponent(value['server'].join(",")) +'"  data-super_user="'+ encodeURIComponent(value['super_user']) +'" data-type="old">';
            html += '<td valign="top"><input type="text" name="name" value="'+ value['name'] +'" /></td>';
            html += '<td valign="top"><input type="text" name="email" value="'+ value['email'] +'" /></td>';
            html += '<td valign="top"><input type="text" name="full_name" value="'+ value['full_name'] +'" /></td>';

            if ("admin_user" in value) {
                html += '<td valign="top">';

                html += '<select name="servers" multiple style="width: 200px;">';
                $(Users.serversList).each(function (keyServer, server) {
                    var selected = (value['server'].indexOf(server) !== -1) ? 'selected="selected"' : '';

                    html += '<option value="'+ server +'" '+ selected +'>'+ server +'</option>';
                });
                html += '</select>';

                html += '</td>';

                var checked = (value['super_user'] == '1') ? 'checked="checked"' : '';
                html += '<td valign="top" align="center"><input type="checkbox" name="super_user" '+ checked +'></td>';
            } else {
                html += '<td valign="top">'+ value['server'].join(", ") +'</td>';
                html += '<td valign="top" align="center">'+ ((value['super_user'] == '1') ? 'yes' : 'no') +'</td>';
            }

            html += '<td valign="top" align="center"><input type="button" name="save_user" value="save" /></td>';

            if ("admin_user" in value) {
                html += '<td valign="top" align="center"><input type="button" name="delete_user" value="delete" /></td>';
            } else {
                html += '<td valign="top"></td>';
            }

            html += '</tr>';
        });

        html += '</table>';

        $('#historyContent').html(html);
    },
};

Number.prototype.padLeft = function(base,chr) {
    var len = (String(base || 10).length - String(this).length) + 1;
    return len > 0 ? new Array(len).join(chr || '0') + this : this;
}
