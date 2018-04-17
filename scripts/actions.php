<?php

class actions
{
    function __construct()
    {
        global $nagiosPipe;

        $this->nagiosPipe = $nagiosPipe;
    }
    public function verifyType()
    {
        if (!isset($_REQUEST['type']) || !$_REQUEST['type']) {
            $this->returnError('type is empty', 404);
        }

        if (!in_array($_REQUEST['type'], array('recheckIt', 'quickAck', 'quickUnAck', 'unAck', 'unAcknowledgeIt', 'acknowledgeIt', 'scheduleIt', 'downtime', 'scheduleItTime'))) {
            $this->returnError('type not in array', 404);
        }

        if (!file_exists($this->nagiosPipe)) {
            $this->returnError('file ('. $this->nagiosPipe .') not exists, please check in config.php $nagiosPipe value', 404);
        }

        $this->openFile();

        if (!$this->file) {
            $this->returnError('check file permissions', 400);
        }

        $this->closeFile();

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
                $this->unAcknowledgeProblem($post);
                $this->acknowledgeProblem($post);
            }

            if (in_array($this->type, ['quickUnAck', 'unAck', 'unAcknowledgeIt'])) {
                $this->unAcknowledgeProblem($post);
            }

            if (in_array($this->type, ['scheduleIt'])) {
                $this->unAcknowledgeProblem($post);
                $this->scheduleProblem($post);
            }

            if (in_array($this->type, ['scheduleItTime'])) {
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
        $data = ($post['isHost'] == 'service') ? 'ACKNOWLEDGE_SVC_PROBLEM;' : 'ACKNOWLEDGE_HOST_PROBLEM;';
        $data.= $post['host'] .';';
        $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';
        $data.= "2;1;0;{$post['author']};{$post['com_data']}";

        $this->runNagiosCommand($data);
    }
    public function unAcknowledgeProblem($post)
    {
        $data = ($post['isHost'] == 'service') ? 'REMOVE_SVC_ACKNOWLEDGEMENT;' : 'REMOVE_HOST_ACKNOWLEDGEMENT;';
        $data.= $post['host'] .';';
        $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';

        $this->runNagiosCommand($data);
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

        $data = ($post['isHost'] == 'service') ? 'SCHEDULE_SVC_DOWNTIME;' : 'SCHEDULE_HOST_DOWNTIME;';
        $data.= $post['host'] .';';
        $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';
        $data.= "{$start};{$end};1;0;{$duration};{$post['author']};{$post['com_data']}";

        $this->runNagiosCommand($data);
    }
    public function unScheduleProblem($post)
    {
        $data  = ($post['isHost'] == 'service') ? 'DEL_SVC_DOWNTIME;' : 'DEL_HOST_DOWNTIME;';
        $data .= $post['down_id'];

        $this->runNagiosCommand($data);
    }
    public function recheckProblem($post)
    {
        if (!isset($post['start_time']) || !$post['start_time']) {
            $post['start_time'] = date('m-d-Y H:i:s');
        }
        $dateTime = explode(' ', $post['start_time']);
        $date     = explode('-', $dateTime[0]);
        $start    = strtotime($date[2] .'-'. $date[0] .'-'. $date[1] .' '. $dateTime[1]);

        $data = ($post['isHost'] == 'service') ? 'SCHEDULE_FORCED_SVC_CHECK;' : 'SCHEDULE_FORCED_HOST_CHECK;';
        $data.= $post['host'] .';';
        $data.= ($post['isHost'] == 'service') ? ($post['service'] . ';') : '';
        $data.= $start;

        $this->runNagiosCommand($data);
    }
    private function runNagiosCommand($data)
    {
        $this->openFile();
        fwrite($this->file, "[" . time() . "] {$data}\n");
        $this->closeFile();
    }
}