<?php

class synchronizeNotes
{
    private $syncList = [];

    function __construct()
    {
        global $serversList;

        $this->serversList = $serversList;
        $this->db = new db;

        $this->setNotesDataForSync();
    }

    public function run()
    {
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
            $newNotesList = $this->getNewNotes($servicesPath, $hostsPath);

            if ($newNotesList) {
                $this->syncList[$server] = [
                    'newNotes' => $newNotesList,
                    'oldNotes' => $this->db->notesUrls($server),
                ];
            }
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
