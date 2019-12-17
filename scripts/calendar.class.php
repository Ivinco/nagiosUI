<?php

class calendar
{
    private $timeZone;
    private $calendarId;
    private $credentialPath;
    private $basePath;
    private $clienSecretPath;
    private $scopes;
    private $client;
    private $timeStart;
    private $timeFinish;
    public $usersList;
    public $usersShift;

    function __construct()
    {
        global $timeZone;
        global $calendarId;

        $this->timeZone = $timeZone;
        $this->calendarId = $calendarId;
        $this->basePath = realpath(dirname(__FILE__));
        $this->credentialPath = $this->basePath . '/../config/calendar.json';
        $this->clienSecretPath = $this->basePath . '/../config/client_secret.json';
        $this->scopes = implode(' ', array(Google_Service_Calendar::CALENDAR_READONLY));

        $this->setClient();
        $this->getUsersList();
    }

    private function setClient()
    {
        $this->client = new Google_Client();
        $this->client->setApplicationName("Google Calendar API for nagiosUI");
        $this->client->setScopes($this->scopes);
        $this->client->setAuthConfig($this->clienSecretPath);
        $this->client->setAccessType('offline');

        $accessToken = json_decode(file_get_contents($this->credentialPath), true);

        $this->client->setAccessToken($accessToken);

        if ($this->client->isAccessTokenExpired()) {
            $refreshTokenSaved = $this->client->getRefreshToken();
            $this->client->fetchAccessTokenWithRefreshToken($refreshTokenSaved);
            $accessTokenUpdated = $this->client->getAccessToken();
            $accessTokenUpdated['refresh_token'] = $refreshTokenSaved;
            file_put_contents($this->credentialPath, json_encode($accessTokenUpdated));
        }
    }
    public function setTime($start, $finish)
    {
        $this->timeStart = $start;
        $this->timeFinish = $finish;
    }
    public function getEvents() {
        $dtz = new DateTimeZone($this->timeZone);

        $optParams = array(
            'maxResults' => 2500,
            'orderBy' => 'startTime',
            'singleEvents' => TRUE,
            'timeMin' => date('c', $this->timeStart),
            'timeMax' => date('c', $this->timeFinish),
            'timeZone' => $this->timeZone,
            'fields' => 'items(end,start,summary),summary,timeZone'
        );

        $service = new Google_Service_Calendar($this->client);
        $results = $service->events->listEvents($this->calendarId, $optParams);

        $result = [];

        foreach ($results->getItems() as $event) {
            $start = ($event->start->dateTime) ? $event->start->dateTime : $event->start->date;
            $finish = ($event->end->dateTime) ? $event->end->dateTime : $event->end->date;
            $tmp = explode("covering", $event->getSummary());
            $name = trim($tmp[0]);

            if (empty($result[$name])) {
                $result[$name] = [];
            }

            $st = new DateTime($start, new DateTimeZone('Europe/London'));
            $ft = new DateTime($finish, new DateTimeZone('Europe/London'));
            $st_time = $st->format('U');
            if ($st_time < $this->timeStart){
                $st_time = $this->timeStart;
            }
            if ($st_time > $this->timeFinish){
                continue;
            }
            $ft_time = $ft->format('U');
            if ($ft_time > $this->timeFinish){
                $ft_time = $this->timeFinish;
            }
            if ($ft_time < $this->timeStart){
                continue;
            }
            $result[$name][] = [
                'start' => $st_time,
                'finish' => $ft_time,
            ];
        }

        return $result;
    }
    public function getUsersList()
    {
        $dtz = new DateTimeZone($this->timeZone);
        $sd = new DateTime(date("d-m-Y") . ' -3 month ', $dtz);
        $timeStart = $sd->format('U');
        $sd = new DateTime(date("d-m-Y"), $dtz);
        $timeFinish = $sd->format('U');

        $optParams = array(
            'maxResults' => 2500,
            'orderBy' => 'startTime',
            'singleEvents' => TRUE,
            'timeMin' => date('c', $timeStart),
            'timeMax' => date('c', $timeFinish),
            'timeZone' => $this->timeZone,
            'fields' => 'items(end,start,summary),summary,timeZone'
        );

        $service = new Google_Service_Calendar($this->client);
        $results = $service->events->listEvents($this->calendarId, $optParams);

        $result = [];

        foreach ($results->getItems() as $event) {
            $name = explode("covering", $event->getSummary());
            $name = trim($name[0]);

            if (!in_array($name, $result)) {
                $result[] = $name;
            }
        }

        sort($result);

        $this->usersList = $result;
    }
}