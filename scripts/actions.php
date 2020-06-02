<?php

class actions
{
    function __construct()
    {
        global $serversList;
        global $debug;
        global $debugPath;

        $this->debug = $debug;
        $this->debugPath = $debugPath;
        $this->serversList = $serversList;
        $this->requests = [];

        $this->db    = new db;
        $this->utils = new utils();
    }
    public function verifyType()
    {
        if (!isset($_REQUEST['type']) || !$_REQUEST['type']) {
            $this->returnError('type is empty', 404);
        }

        if (!in_array($_REQUEST['type'], array('recheckIt', 'quickAck', 'quickUnAck', 'unAck', 'unAcknowledgeIt', 'acknowledgeIt', 'scheduleIt', 'downtime', 'scheduleItTime', 'downtimePlanned', 'scheduleItTimePlanned'))) {
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
        if (in_array($this->type, ['quickAck', 'acknowledgeIt', 'scheduleIt'])) {
            $this->unAcknowledgeMultiProblems($data);
        }

        if ($this->type == 'recheckIt') {
            $this->setRecheckActions($data);
        }

        if (in_array($this->type, ['quickUnAck', 'unAck', 'unAcknowledgeIt'])) {
            $this->unAcknowledgeMultiProblems($data);
        }

        if (in_array($this->type, ['quickAck', 'acknowledgeIt'])) {
            $this->acknowledgeMultiProblems($data);
        }

        if (in_array($this->type, ['scheduleIt', 'scheduleItTime', 'scheduleItTimePlanned'])) {
            $this->scheduleMultiProblems($data);
        }

        if (in_array($this->type, ['downtime', 'downtimePlanned'])) {
            $this->unScheduleMultiProblems($data);
        }

        if (in_array($this->type, ['recheckIt'])) {
            $this->recheckMultiProblems($data);
        }

        if (!in_array($this->type, ['downtimePlanned', 'scheduleItTimePlanned'])) {
            $memcache = $this->utils->getMemcache();
            $servers  = $this->utils->getServerTabsList();

            foreach ($servers as $server) {
                $memcacheName = $this->utils->getMemcacheFullName($server);
                if ($memcache) {
                    $memcache->set("{$memcacheName}_verify", md5(time()), 0, 1200);
                }
            }
        }
    }
    private function findAlert($posts, $tab, $host, $service, $isHost)
    {
        foreach ($posts as $post) {
            if ($post['tab'] == $tab && $post['host'] == $host && $post['service'] == $service && $post['isHost'] == $isHost) {
                return true;
            }
        }

        return false;
    }
    private function setRecheckActions($posts)
    {
        $xml = new xml;
        $xml->setCurrentTab('All');
        $alerts = json_decode(json_encode(simplexml_load_string($xml->returnXml(false))),TRUE);

        if (!isset($alerts['alert'])) {
            return;
        }

        foreach ($alerts['alert'] as $item) {
            $last_check_sec = (!is_array($item['last_check_sec']))       ? $item['last_check_sec']       : implode(' ', $item['last_check_sec']);
            $tab            = (!is_array($item['tab']))                  ? $item['tab']                  : implode(' ', $item['tab']);
            $host           = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
            $service        = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
            $isHost         = $item['host_or_service'];

            if ($this->findAlert($posts, $tab, $host, $service, $isHost)) {
                $memcache     = $this->utils->getMemcache();
                $memcacheName = $this->utils->getMemcacheRecheckName($tab, $host, $service, $isHost);

                if ($memcache) {
                    $memcache->set($memcacheName, $last_check_sec, 0, 300);
                }
            }
        }
    }
    public function acknowledgeMultiProblems($alerts)
    {
        $url = '/acknowledge_problem';
        $this->requests = [];
        $this->mh = curl_multi_init();

        foreach ($alerts as $key => $post) {
            $this->server = $post['tab'];

            $data = [
                'host' => $post['host'],
                'comment' => $post['com_data'],
                'author' => $post['author'],
            ];

            if ($post['isHost'] == 'service') {
                $data['service'] = $post['service'];
            }

            if ($this->server != 'All') {
                $this->db->logAction($data, 'ack', $this->server, true);
            }

            $path = $this->serversList[$this->server]['url'] . ":" . $this->serversList[$this->server]['port']. $url;

            if ($this->needToProcess($path, $data)) {
                $this->curlMultiRequest($key, $path, $data);
            }
        }

        $this->runCurlMultiRequest();
    }
    public function unAcknowledgeMultiProblems($alerts) {
        $url = '/remove_acknowledgement';
        $this->requests = [];
        $this->mh = curl_multi_init();

        foreach ($alerts as $key => $post) {
            $this->server = $post['tab'];

            $data = [
                'host' => $post['host'],
            ];

            if ($post['isHost'] == 'service') {
                $data['service'] = $post['service'];
            }

            if ($this->server != 'All') {
                $this->db->logAction($data, 'unack', $this->server, true, true);
            }

            $path = $this->serversList[$this->server]['url'] . ":" . $this->serversList[$this->server]['port']. $url;

            if ($this->needToProcess($path, $data)) {
                $this->curlMultiRequest($key, $path, $data);
            }
        }
        $this->runCurlMultiRequest();
    }
    public function scheduleMultiProblems($alerts)
    {
        $url = '/schedule_downtime';
        $this->requests = [];
        $this->mh = curl_multi_init();

        foreach ($alerts as $key => $post) {
            $this->server = $post['tab'];

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

            if ($this->server != 'All') {
                $this->db->logAction($data, 'sched', $this->server, true);
            }

            $path = $this->serversList[$this->server]['url'] . ":" . $this->serversList[$this->server]['port']. $url;

            if ($this->needToProcess($path, $data)) {
                $this->curlMultiRequest($key, $path, $data);
            }
        }
        $this->runCurlMultiRequest();
    }
    public function unScheduleMultiProblems($alerts)
    {
        $url = '/cancel_downtime';
        $this->requests = [];
        $this->mh = curl_multi_init();

        foreach ($alerts as $key => $post) {
            $this->server = $post['tab'];

            $data = ['down_id' => $post['down_id']];

            if (isset($post['host'])) {
                $data['host'] = $post['host'];
            }

            if ($post['isHost'] == 'service' && isset($post['service'])) {
                $data['service'] = $post['service'];
            }

            if ($this->server != 'All') {
                $this->db->logAction($data, 'unsched', $this->server, true);
            }

            $path = $this->serversList[$this->server]['url'] . ":" . $this->serversList[$this->server]['port']. $url;

            if ($this->needToProcess($path, $data) && intval($post['down_id'])) {
                $this->curlMultiRequest($key, $path, $data);
            }
        }
        $this->runCurlMultiRequest();
    }
    public function recheckMultiProblems($alerts)
    {
        $url = '/schedule_check';
        $this->requests = [];
        $this->mh = curl_multi_init();

        foreach ($alerts as $key => $post) {
            $this->server = $post['tab'];

            $data = [
                'host' => $post['host'],
                'forced' => true
            ];

            if ($post['isHost'] == 'service') {
                $data['service'] = $post['service'];
            }

            if ($this->server != 'All') {
                $this->db->logAction($data, 're-check', $this->server, true);
            }

            $path = $this->serversList[$this->server]['url'] . ":" . $this->serversList[$this->server]['port']. $url;

            if ($this->needToProcess($path, $data)) {
                $this->curlMultiRequest($key, $path, $data);
            }
        }
        $this->runCurlMultiRequest();
    }

    private function needToProcess($path, $data)
    {
        if ($this->server == 'All') {
            return false;
        }

        if (isset($this->debug) && $this->debug) {
            file_put_contents($this->debugPath, json_encode([$path, $data]) . "\n", FILE_APPEND | LOCK_EX);
            return false;
        }

        return true;
    }
    private function curlMultiRequest($key, $path, $data)
    {
        $this->requests[$key] = array();
        $this->requests[$key]['url'] = $path;
        $this->requests[$key]['curl_handle'] = curl_init($path);
        curl_setopt($this->requests[$key]['curl_handle'], CURLOPT_PORT,           $this->serversList[$this->server]['port']);
        curl_setopt($this->requests[$key]['curl_handle'], CURLOPT_URL,            $path);
        curl_setopt($this->requests[$key]['curl_handle'], CURLOPT_RETURNTRANSFER, true);
        curl_setopt($this->requests[$key]['curl_handle'], CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($this->requests[$key]['curl_handle'], CURLOPT_HTTPHEADER,     array('Content-Type: application/json'));
        curl_setopt($this->requests[$key]['curl_handle'], CURLOPT_POSTFIELDS,     json_encode($data));
        curl_multi_add_handle($this->mh, $this->requests[$key]['curl_handle']);
    }
    private function runCurlMultiRequest()
    {
        $stillRunning = false;
        do {
            curl_multi_exec($this->mh, $stillRunning);
        } while ($stillRunning);

        foreach($this->requests as $k => $request){
            curl_multi_remove_handle($this->mh, $request['curl_handle']);
            $this->requests[$k]['content'] = curl_multi_getcontent($request['curl_handle']);
            $this->requests[$k]['http_code'] = curl_getinfo($request['curl_handle'], CURLINFO_HTTP_CODE);
            curl_close($this->requests[$k]['curl_handle']);
        }

        curl_multi_close($this->mh);
    }
}