<?php

class actions
{
    function __construct()
    {
        global $serversList;

        $this->serversList = $serversList;

        $this->db = new db;
    }
    public function verifyType()
    {
        if (!isset($_REQUEST['type']) || !$_REQUEST['type']) {
            $this->returnError('type is empty', 404);
        }

        if (!in_array($_REQUEST['type'], array('recheckIt', 'quickAck', 'quickUnAck', 'unAck', 'unAcknowledgeIt', 'acknowledgeIt', 'scheduleIt', 'downtime', 'scheduleItTime'))) {
            $this->returnError('type not in array', 404);
        }

        $this->setType($_REQUEST['type']);
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
    public function setServer($server)
    {
        $this->server = $server;
    }
    public function runActions($data)
    {
        foreach ($data as $post) {
            $this->server = $post['tab'];

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
        $data = [
            'host' => $post['host'],
            'comment' => $post['com_data'],
            'author' => $post['author'],
        ];

        if ($post['isHost'] == 'service') {
            $data['service'] = $post['service'];
        }

        $this->curlRequest('/acknowledge_problem', $data);
        $this->db->logAction($data, 'ack', $this->server, true);
    }
    public function unAcknowledgeProblem($post)
    {
        $data = [
            'host' => $post['host'],
        ];

        if ($post['isHost'] == 'service') {
            $data['service'] = $post['service'];
        }

        $this->curlRequest('/remove_acknowledgement', $data);
        $this->db->logAction($data, 'unack', $this->server, false);
    }
    public function scheduleProblem($post)
    {
        $duration = ($this->type != 'scheduleItTime') ? (intval($post['hours']) * 3600) : $post['hours'];

        $data = [
            'host' => $post['host'],
            'comment' => $post['com_data'],
            'author' => $post['author'],
            'duration' => $duration,
        ];

        if ($post['isHost'] == 'service') {
            $data['service'] = $post['service'];
        }

        $this->curlRequest('/schedule_downtime', $data);
        $this->db->logAction($data, 'sched', $this->server, true);
    }
    public function unScheduleProblem($post)
    {
        $data = [
            'host' => $post['host'],
            'down_id' => $post['down_id'],
        ];

        if ($post['isHost'] == 'service') {
            $data['service'] = $post['service'];
        }

        $this->curlRequest('/cancel_downtime/' . $post['down_id'], $data);
        $this->db->logAction($data, 'unsched', $this->server, false);
    }
    public function recheckProblem($post)
    {
        $data = [
            'host' => $post['host'],
            'forced' => true
        ];

        if ($post['isHost'] == 'service') {
            $data['service'] = $post['service'];
        }

        $this->curlRequest('/schedule_check', $data);
        $this->db->logAction($data, 're-check', $this->server);
    }

    private function curlRequest($url, $data)
    {
        $path = $this->serversList[$this->server]['url'] . ":" . $this->serversList[$this->server]['port']. $url;

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_PORT,           $this->serversList[$this->server]['port']);
        curl_setopt($curl, CURLOPT_URL,            $path);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_HTTPHEADER,     array('Content-Type: application/json'));
        curl_setopt($curl, CURLOPT_POSTFIELDS,     json_encode($data));
        curl_exec($curl);
        curl_close($curl);
    }
}