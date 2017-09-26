<?php

class actions
{
    function __construct()
    {
        global $nagiosPipe;
        global $icingaDB;
        global $icingaApiUser;
        global $icingaApiPass;
        global $icingaApiHosts;

        $this->nagiosPipe     = $nagiosPipe;
        $this->icingaDB       = $icingaDB;
        $this->icingaApiUser  = $icingaApiUser;
        $this->icingaApiPass  = $icingaApiPass;
        $this->icingaApiHosts = $icingaApiHosts;
    }
    public function verifyType()
    {
        if (!isset($_REQUEST['type']) || !$_REQUEST['type']) {
            $this->returnError('type is empty', 404);
        }

        if (!in_array($_REQUEST['type'], array('recheckIt', 'quickAck', 'quickUnAck', 'unAck', 'unAcknowledgeIt', 'acknowledgeIt', 'scheduleIt', 'downtime', 'scheduleItTime'))) {
            $this->returnError('type not in array', 404);
        }

        if (!$this->icingaDB) {
            if (!file_exists($this->nagiosPipe)) {
                $this->returnError('file ('. $this->nagiosPipe .') not exists, please check in config.php $nagiosPipe value', 404);
            }

            $this->openFile();

            if (!$this->file) {
                $this->returnError('check file permissions', 400);
            }

            $this->closeFile();
        }

        $this->type = $_REQUEST['type'];
    }
    private function returnError($text, $code)
    {
        echo $text;
        http_response_code($code);

        die;
    }
    public function setType($type)
    {
        $this->type = $type;
    }
    private function openFile()
    {
        $this->file = fopen($this->nagiosPipe, 'w');
    }
    private function closeFile()
    {
        fclose($this->file);
    }
    public function runActions($data)
    {
        foreach ($data as $post) {
            if (in_array($this->type, ['quickAck', 'acknowledgeIt'])) {
                $this->acknowledgeProblem($post);
            }

            if (in_array($this->type, ['quickUnAck', 'unAck', 'unAcknowledgeIt'])) {
                $this->unAcknowledgeProblem($post);
            }

            if (in_array($this->type, ['scheduleIt', 'scheduleItTime'])) {
                $this->scheduleProblem($post);
            }

            if (in_array($this->type, ['downtime'])) {
                $this->unScheduleProblem($post);
            }

            if (in_array($this->type, ['recheckIt'])) {
                $this->recheckProblem($post);
            }
        }
    }
    public function acknowledgeProblem($post)
    {
        if ($this->icingaDB) {
            $data = [
                'author'      => $post['author'],
                'comment'     => $post['com_data'],
                'notify'      => true,
                'sticky'      => true,
                'type'        => ucfirst($post['isHost']),
                'filter'      => 'host.display_name==hostName',
                'filter_vars' => [
                    'hostName' => $post['host']
                ]
            ];

            if ($post['isHost'] == 'service') {
                $data['filter'] = $data['filter'] . ' && service.display_name==serviceName';
                $data['filter_vars']['serviceName'] = $post['service'];
            }

            $this->runIcingaCommand($data, 'acknowledge-problem');
        } else {
            $data = ($post['isHost'] == 'service') ? 'ACKNOWLEDGE_SVC_PROBLEM;' : 'ACKNOWLEDGE_HOST_PROBLEM;';
            $data.= $post['host'] .';';
            $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';
            $data.= "2;1;0;{$post['author']};{$post['com_data']}";

            $this->runNagiosCommand($data);
        }
    }
    public function unAcknowledgeProblem($post)
    {
        if ($this->icingaDB) {
            $data = [
                'type'        => ucfirst($post['isHost']),
                'filter'      => 'host.display_name==hostName',
                'filter_vars' => [
                    'hostName' => $post['host']
                ]
            ];

            if ($post['isHost'] == 'service') {
                $data['filter'] = $data['filter'] . ' && service.display_name==serviceName';
                $data['filter_vars']['serviceName'] = $post['service'];
            }

            $this->runIcingaCommand($data, 'remove-acknowledgement');
        } else {
            $data = ($post['isHost'] == 'service') ? 'REMOVE_SVC_ACKNOWLEDGEMENT;' : 'REMOVE_HOST_ACKNOWLEDGEMENT;';
            $data.= $post['host'] .';';
            $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';

            $this->runNagiosCommand($data);
        }
    }
    public function scheduleProblem($post)
    {
        if ($this->type == 'scheduleItTime') {
            $start    = $post['start_time'];
            $end      = $post['end_time'];
            $duration = round(intval($post['hours']) / 3600);
        } else {
            $dateTime = explode(' ', $post['start_time']);
            $date     = explode('-', $dateTime[0]);
            $start    = strtotime($date[2] . '-' . $date[0] . '-' . $date[1] . ' ' . $dateTime[1]);

            $dateTime = explode(' ', $post['end_time']);
            $date     = explode('-', $dateTime[0]);
            $end      = strtotime($date[2] . '-' . $date[0] . '-' . $date[1] . ' ' . $dateTime[1]);

            $duration = $post['hours'];
        }

        if ($this->icingaDB) {
            $data = [
                'author'      => $post['author'],
                'comment'     => $post['com_data'],
                'start_time'  => $start,
                'end_time'    => $end,
                'fixed'       => true,
                'duration'    => $duration,
                'type'        => ucfirst($post['isHost']),
                'filter'      => 'host.display_name==hostName',
                'filter_vars' => [
                    'hostName' => $post['host']
                ]
            ];

            if ($post['isHost'] == 'service') {
                $data['filter'] = $data['filter'] . ' && service.display_name==serviceName';
                $data['filter_vars']['serviceName'] = $post['service'];
            }

            $this->runIcingaCommand($data, 'schedule-downtime');
        } else {
            $data = ($post['isHost'] == 'service') ? 'SCHEDULE_SVC_DOWNTIME;' : 'SCHEDULE_HOST_DOWNTIME;';
            $data.= $post['host'] .';';
            $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';
            $data.= "{$start};{$end};1;0;{$duration};{$post['author']};{$post['com_data']}";

            $this->runNagiosCommand($data);
        }
    }
    public function unScheduleProblem($post)
    {
        if ($this->icingaDB) {
            $data = [
                'type'        => 'Downtime',
                'filter'      => 'downtime.legacy_id=='. $post['down_id'],
            ];

            $this->runIcingaCommand($data, 'remove-downtime');
        } else {
            $data  = ($post['isHost'] == 'service') ? 'DEL_SVC_DOWNTIME;' : 'DEL_HOST_DOWNTIME;';
            $data .= $post['down_id'];

            $this->runNagiosCommand($data);
        }
    }
    public function recheckProblem($post)
    {
        if (!isset($post['start_time']) || !$post['start_time']) {
            $post['start_time'] = date('m-d-Y H:i:s');
        }
        $dateTime = explode(' ', $post['start_time']);
        $date     = explode('-', $dateTime[0]);
        $start    = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);

        if ($this->icingaDB) {
            $data = [
                'force_check' => true,
                'next_check'  => $start,
                'type'        => ucfirst($post['isHost']),
                'filter'      => 'host.display_name==hostName',
                'filter_vars' => [
                    'hostName' => $post['host']
                ]
            ];

            if ($post['isHost'] == 'service') {
                $data['filter'] = $data['filter'] . ' && service.display_name==serviceName';
                $data['filter_vars']['serviceName'] = $post['service'];
            }

            $this->runIcingaCommand($data, 'reschedule-check');
        } else {
            $data = ($post['isHost'] == 'service') ? 'SCHEDULE_FORCED_SVC_CHECK;' : 'SCHEDULE_FORCED_HOST_CHECK;';
            $data.= $post['host'] .';';
            $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';
            $data.= $start;

            $this->runNagiosCommand($data);
        }
    }
    private function runIcingaCommand($data, $type)
    {
        $this->icingaApiHost = $this->findAliveHost();

        exec('curl -k -s -u '. $this->icingaApiUser .':'. $this->icingaApiPass .' -H "Accept: application/json" -X POST "'. $this->icingaApiHost .'/v1/actions/'. $type .'" -d \''. json_encode($data) .'\'');
    }
    private function findAliveHost() {
        $data = ['attrs' => ['active']];

        foreach ($this->icingaApiHosts as $host) {
            $output = [];

            exec('curl -k -s -u '. $this->icingaApiUser .':'. $this->icingaApiPass .' -H "Accept: application/json" -X POST -H "X-HTTP-Method-Override: GET" "'. $host .'/v1/objects/hosts" -d \''. json_encode($data) .'\' 2>&1', $output);

            if (count($output) && isset($output[0]) && isset(json_decode($output[0])->results) && count(json_decode($output[0])->results)) {
                return $host;
            }
        }

        return isset($this->icingaApiHosts[0]) ? $this->icingaApiHosts[0] : '';
    }

    private function runNagiosCommand($data)
    {
        $this->openFile();
        fwrite($this->file, "[" . time() . "] {$data}\n");
        $this->closeFile();
    }
}