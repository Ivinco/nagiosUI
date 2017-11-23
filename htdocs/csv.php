<?php

if (isset($_GET['source']) && in_array($_GET['source'], ['nagios', 'icinga'])) {
    include_once __DIR__ . '/../scripts/init.php';

    $statesArray = [0 => 'OK', 1 => 'WARNING', 2 => 'CRITICAL', 3 => 'UNKNOWN'];
    $source      = $_GET['source'];
    $results     = [];

    if ($source == 'nagios') {
        $statusFile = file_get_contents($statusFile_global);

        $pregHostStatus = '/hoststatus {'.
            '[^{}]*?host_name=(?P<host>[^{}]*?)\n'.
            '[^{}]*?current_state=(?P<state>.*?)\n'.
            '[^{}]*?plugin_output=(?P<output>[^{}]*?)\n'.
            '[^{}]*?}/is';

        $pregServiceStatus = '/servicestatus {'.
            '.*?host_name=(?P<host>.*?)\n'.
            '.*?service_description=(?P<service>.*?)\n'.
            '.*?current_state=(?P<state>.*?)\n'.
            '.*?plugin_output=(?P<output>.*?)\n'.
            '.*?}/is';

        preg_match_all($pregHostStatus,    $statusFile, $hostsMatches);
        preg_match_all($pregServiceStatus, $statusFile, $servicesMatches);


        foreach ($hostsMatches['host'] as $k=>$host) {
            $results[$host]['SERVER IS UP'] = array(
                'state'   => $statesArray[intval($hostsMatches['state'][$k])],
                'output'  => $hostsMatches['output'][$k],
            );
        }

        foreach ($servicesMatches['host'] as $k=>$host) {
            $results[$host][$servicesMatches['service'][$k]] = array(
                'state'   => $statesArray[intval($servicesMatches['state'][$k])],
                'output'  => $servicesMatches['output'][$k],
            );
        }
    } else {
        $data = [
            'attrs'  => ['display_name', 'state', 'last_check_result'],
        ];

        exec('curl -k -s -u '. $icingaApiUser .':'. $icingaApiPass .' -H "Accept: application/json" -X POST -H "X-HTTP-Method-Override: GET" "'. $icingaApiHost .'/v1/objects/hosts" -d \''. json_encode($data) .'\'  2>&1', $icingaHosts);

        foreach (json_decode($icingaHosts[0])->results as $item) {
            $results[$item->attrs->display_name]['SERVER IS UP'] = array(
                'state'   => $statesArray[intval($item->attrs->state)],
                'output'  => $item->attrs->last_check_result->output,
            );
        }



        $data = [
            'joins'  => ['host.display_name'],
            'attrs'  => ['display_name', 'state', 'last_check_result'],
        ];

        exec('curl -k -s -u '. $icingaApiUser .':'. $icingaApiPass .' -H "Accept: application/json" -X POST -H "X-HTTP-Method-Override: GET" "'. $icingaApiHost .'/v1/objects/services" -d \''. json_encode($data) .'\'  2>&1', $icingaServices);

        foreach (json_decode($icingaServices[0])->results as $item) {
            $results[$item->joins->host->display_name][$item->attrs->display_name] = array(
                'state'   => $statesArray[intval($item->attrs->state)],
                'output'  => $item->attrs->last_check_result->output,
            );
        }
    }



    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename='. $source .'.csv');
    $output = fopen('php://output', 'w');

    fputcsv($output, ['Host', 'Service', 'State', 'Output'], ';');

    foreach ($results as $host => $result) {
        foreach ($result as $service => $item) {
            $record = [$host, $service, $item['state'], $item['output']];

            fputcsv($output, $record, ';');
        }
    }
}

die;

