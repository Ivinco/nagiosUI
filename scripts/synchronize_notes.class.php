<?php

class synchronizeNotes
{
    private $syncList = [];

    function __construct()
    {
        global $serversList;
        global $db;

        $this->serversList = $serversList;
        $this->db = $db;
    }

    public function run()
    {
        $this->setNotesDataForSync();
        $this->syncNotes();
    }
    private function syncNotes()
    {
        foreach ($this->syncList as $server => $data) {
            if ($this->isNagiosApi($server)) {
                $this->syncNotesNagiosApi($server, $data);
            } else {
                $this->syncNotesEgrep($server, $data);
            }
        }
    }
    private function syncNotesNagiosApi($server, $data)
    {
        foreach ($data['newNotes'] as $host => $notesList) {
            foreach ($notesList as $service => $url) {
                if (isset($data['oldNotes'][$host]) && isset($data['oldNotes'][$host][$service])) {
                    if ($data['oldNotes'][$host][$service] != $url) {
                        $this->db->updateNotesUrlNagiosApi($host, $service, $url, $server);
                    }

                    unset($data['oldNotes'][$host][$service]);
                    continue;
                }

                if (!isset($data['oldNotes'][$host]) || !isset($data['oldNotes'][$host][$service])) {
                    $this->db->insertNotesUrlNagiosApi($host, $service, $url, $server);
                }
            }
        }

        foreach ($data['oldNotes'] as $host => $notesList) {
            foreach ($notesList as $service => $url) {
                $this->db->deleteNotesUrlNagiosApi($host, $service, $url, $server);
            }
        }
    }
    private function syncNotesEgrep($server, $data)
    {
        foreach ($data['newNotes'] as $service_or_host => $url) {
            if (isset($data['oldNotes'][$service_or_host])) {
                if ($data['oldNotes'][$service_or_host] != $url) {
                    $this->db->updateNotesUrl($service_or_host, $url, $server);
                }

                unset($data['oldNotes'][$service_or_host]);
                continue;
            }

            if (!isset($data['oldNotes'][$service_or_host])) {
                $this->db->insertNotesUrl($service_or_host, $url, $server);
            }
        }

        foreach ($data['oldNotes'] as $service_or_host => $url) {
            $this->db->deleteNotesUrl($service_or_host, $url, $server);
        }
    }
    private function isNagiosApi($server)
    {
        $servicesPath = (isset($this->serversList[$server]['notesUrlServicesPath'])) ? $this->serversList[$server]['notesUrlServicesPath'] : '';
        $hostsPath    = (isset($this->serversList[$server]['notesUrlHostsPath']))    ? $this->serversList[$server]['notesUrlHostsPath']    : '';

        return !($servicesPath || $hostsPath);
    }
    private function setNotesDataForSync()
    {
        foreach ($this->serversList as $server => $data) {
            if (!$this->isNagiosApi($server)) {
                $this->getNotesEgrep($data['notesUrlServicesPath'], $data['notesUrlHostsPath'], $server);
            } else {
                $this->getNotesNagiosApi($server);
            }
        }
    }
    private function getNotesNagiosApi($server)
    {
        if ($this->verifyNagiosApi($server)) {
            $newNotesList = $this->curlRequest($server);

            if ($newNotesList) {
                $this->syncList[$server] = [
                    'newNotes' => $newNotesList,
                    'oldNotes' => $this->db->notesUrlsNagiosApi($server),
                ];
            }
        }
    }
    private function verifyNagiosApi($server)
    {
        $path = $this->serversList[$server]['url'] . '/status';

        $curl = null;
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_PORT,           $this->serversList[$server]['port']);
        curl_setopt($curl, CURLOPT_URL,            $path);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($curl, CURLOPT_TIMEOUT,        3);

        curl_exec($curl);

        if (curl_errno($curl)) {
            return false;
        }

        curl_close($curl);

        return true;
    }
    private function curlRequest($server)
    {
        $curl = null;
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_PORT,           $this->serversList[$server]['port']);
        curl_setopt($curl, CURLOPT_URL,            $this->serversList[$server]['url'] . '/full_notes_list');
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($curl, CURLOPT_TIMEOUT,        10);
        curl_setopt($curl, CURLOPT_HTTPHEADER,     ['Content-Type: application/json']);

        $result = curl_exec($curl);

        if (curl_errno($curl)) {
            return;
        }

        curl_close($curl);
        $result = json_decode($result, true);

        if (json_last_error()) {
            return;
        }

        $results = [];
        if (isset($result['content'])) {
            foreach ($result['content'] as $item) {
                foreach ($item['services'] as $service) {
                    if ($service['description']) {
                        $host = $item['host'];
                        if (!isset($results[$host])) {
                            $results[$host] = [];
                        }

                        $notes_url = ($service['notes_url']) ? $service['notes_url'] : ' ';
                        $results[$host][$service['description']] = $notes_url;
                    }
                }
            }
        }

        return $results;
    }
    private function getNotesEgrep($servicesPath, $hostsPath, $server)
    {
        $newNotesList = $this->getNewNotes($servicesPath, $hostsPath);

        if ($newNotesList) {
            $this->syncList[$server] = [
                'newNotes' => $newNotesList,
                'oldNotes' => $this->db->notesUrls($server),
            ];
        }
    }
    private function getNewNotes($servicesPath = '', $hostsPath = '')
    {
        $results = [];

        if ($servicesPath) {
            exec('egrep "description|notes_url" -r ' . $servicesPath, $services);

            foreach ($services as $k=>$el) {
                if (preg_match('/\s+service_description\s+(.*?)$/', $el, $serviceName)) {
                    if (isset($services[$k+1]) && preg_match('/\s+notes_url\s+(.*?)$/', trim($services[$k+1]), $serviceNotes)) {
                        $results[$serviceName[1]] = $serviceNotes[1];
                    }
                }
            }
        }

        if ($hostsPath) {
            exec('egrep "host_name|notes_url" -r ' . $hostsPath, $hosts);

            foreach ($hosts as $k=>$el) {
                if (preg_match('/\s+host_name\s+(.*?)$/', $el, $hostName)) {
                    if (isset($hosts[$k+1]) && preg_match('/\s+notes_url\s+(.*?)$/', trim($hosts[$k+1]), $hostNotes)) {
                        $results[$hostName[1]] = $hostNotes[1];
                    }
                }
            }
        }

        return $results;
    }
}
