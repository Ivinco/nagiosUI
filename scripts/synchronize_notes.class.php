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

        foreach ($this->syncList as $server => $data) {
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
    }
    private function setNotesDataForSync()
    {
        foreach ($this->serversList as $server => $data) {
            $servicesPath = (isset($data['notesUrlServicesPath'])) ? $data['notesUrlServicesPath'] : '';
            $hostsPath    = (isset($data['notesUrlHostsPath']))    ? $data['notesUrlHostsPath']    : '';

            if ($servicesPath || $hostsPath) {
                $this->getNotesEgrep($servicesPath, $hostsPath, $server);
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
                    'oldNotes' => $this->db->notesUrls($server),
                ];
            }
        }
    }
    private function verifyNagiosApi($server)
    {
        $path = $this->serversList[$server]['url'] . '/status';

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_PORT,           $this->serversList[$server]['port']);
        curl_setopt($curl, CURLOPT_URL,            $path);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 1);
        curl_setopt($curl, CURLOPT_TIMEOUT,        1);

        curl_exec($curl);

        if (curl_errno($curl)) {
            return false;
        }

        curl_close($curl);

        return true;
    }
    private function curlRequest($server)
    {
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_PORT,           $this->serversList[$server]['port']);
        curl_setopt($curl, CURLOPT_URL,            $this->serversList[$server]['url'] . '/notes_url');
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($curl, CURLOPT_TIMEOUT,        10);
        curl_setopt($curl, CURLOPT_POSTFIELDS,     '{"type" : "filled"}');
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
                if (isset($item['description']) && $item['description'] && $item['notes_url']) {
                    $results[$item['description']] = $item['notes_url'];
                }

                if (isset($item['host_name']) && $item['host_name'] && $item['notes_url']) {
                    $hosts = explode(',', $item['host_name']);

                    foreach ($hosts as $host) {
                        $results[$host] = $item['notes_url'];
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
