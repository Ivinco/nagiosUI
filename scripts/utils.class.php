<?php

class utils
{
    const BROWSER_TYPE_NAME = 'Browser';
    public $timeCorrectionDiff;
    public $timeCorrectionType;
    public $default_time_zone;

    function __construct() {
        global $timeZonesList;
        global $timeZonesListAliases;
        global $serversList;
        global $timeZone;

        $this->default_time_zone = $timeZone;
        $this->timeZonesListAliases = $timeZonesListAliases;

        $this->setTimeZonesList($timeZonesList);
        $this->setServerTabsList($serversList);
        $this->setTimeCorrection();
    }


    public function getTimeZone($server)
    {
        $tz = $this->default_time_zone;

        if (isset($this->serversList[$server]) && isset($this->serversList[$server]['timeZone'])) {
            $tz = $this->serversList[$server]['timeZone'];
        }

        return $this->validateTimeZone($tz);
    }
    public function validateTimeZone($tz) {
        try {
            new DateTimeZone($tz);
        } catch(Exception $e) {
            return $this->default_time_zone;
        }

        return $tz;
    }
    public function returnCorrectedDate($requestDate, $serverName, $format = 'm-d-Y H:i:s', $checkMonth = false) {
        $serverTimeZone  = $this->getTimeZone($serverName);
        $requestTimeZone = $this->validateTimeZone($this->timeCorrectionType);

        $date = DateTime::createFromFormat($format, $requestDate, new DateTimeZone($serverTimeZone));
        $date->setTimeZone(new DateTimeZone($requestTimeZone));
        $date->modify($this->timeCorrectionDiff . ' minutes');

        if ($checkMonth && intval($date->format('n')) > intval(date('n'))) {
            $date->modify('-1 year');
        }

        return $date->format($format);
    }

    private function setTimeCorrection()
    {
        $this->timeCorrectionType = (isset($_GET['time_correction_type'])) ? $_GET['time_correction_type'] : '';
        $this->timeCorrectionType = urldecode($this->timeCorrectionType);
        $this->timeCorrectionType = $this->getTimeZoneWithAliases($this->timeCorrectionType);
        $this->timeCorrectionDiff = 0;

        if ($this->timeCorrectionType == self::BROWSER_TYPE_NAME && isset($_GET['time_correction_diff'])) {
            $this->timeCorrectionDiff = (int) $_GET['time_correction_diff'];
        }
    }

    private function getTimeZoneWithAliases($tz)
    {
        if (isset($this->timeZonesListAliases) && $this->timeZonesListAliases) {
            foreach ($this->timeZonesListAliases as $key => $value) {
                if ($value == $tz) {
                    return $key;
                }
            }
        }

        return $tz;
    }

    public function getTimeZonesList()
    {
        return $this->timeZonesList;
    }
    private function setTimeZonesList($timeZonesList)
    {
        if (isset($this->timeZonesListAliases) && $this->timeZonesListAliases) {
            $this->timeZonesList = array_values($this->timeZonesListAliases);
        } else {
            $this->timeZonesList = $timeZonesList;
        }

        $this->timeZonesList[] = 'UTC';
        $this->timeZonesList[] = self::BROWSER_TYPE_NAME;
        sort($this->timeZonesList);
    }

    public function getServerTabsList()
    {
        return $this->serverTabsList;
    }
    private function setServerTabsList($serversList) {
        $this->serversList    = $serversList;
        $this->serverTabsList = array_keys($serversList);
        sort($this->serverTabsList);
        array_unshift($this->serverTabsList, 'All');
    }

}
