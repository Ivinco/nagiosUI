<?php

include_once __DIR__ . '/../scripts/init.php';

ob_start('ob_gzhandler');
header('Content-Type: application/json');

class emergencyList
{
    const BROWSER_TYPE_NAME = 'Browser';

    function __construct()
    {
        global $timeZone;
        global $timeZonesList;
        global $timeZonesListAliases;

        $this->utils = new utils();
        $this->db    = new db();
        $this->usersList = $this->db->usersListStatsPage();
        $this->timeZone  = $timeZone;
        $this->timeZonesListAliases = $timeZonesListAliases;

        $this->setTimeZonesList($timeZonesList);
        $this->setParams();
    }

    public function getData()
    {
        if ($this->type) {
            return $this->saveById();
        } else if ($this->list) {
            return ['timeZonesList'  => $this->utils->getTimeZonesList()];
        } else if ($this->id && $this->id != 'null') {
            return $this->getRecordById();
        } else {
            return $this->getList();
        }

        return $this;
    }

    //$list     = (isset($_GET['list'])      && $_GET['list'])      ? $_GET['list']      : '';
    //id: null,
    //    limit: 20,
    //    page: 1,
    //    from: null,
    //    to: null,

    //list

    private function setParams()
    {
        $this->list   = (isset($_GET['list'])   &&        $_GET['list'])   ?        $_GET['list']   : '';
        $this->id     = (isset($_GET['id'])     &&        $_GET['id'])     ?        $_GET['id']     : '';
        $this->from   = (isset($_GET['from'])   &&        $_GET['from'])   ?        $_GET['from']   : '';
        $this->to     = (isset($_GET['to'])     &&        $_GET['to'])     ?        $_GET['to']     : '';
        $this->tz     = (isset($_GET['tz'])     &&        $_GET['tz'])     ?        $_GET['tz']     : '';
        $this->diff   = (isset($_GET['diff'])   && intval($_GET['diff']))  ? intval($_GET['diff'])  : 0;
        $this->limit  = (isset($_GET['limit'])  && intval($_GET['limit'])) ? intval($_GET['limit']) : 20;
        $this->page   = (isset($_GET['page'])   && intval($_GET['page']))  ? intval($_GET['page'])  : 1;
        $this->author = (isset($_GET['author']) &&        $_GET['author']) ?        $_GET['author'] : '';
        $this->type   = (isset($_GET['type'])   &&        $_GET['type'])   ?        $_GET['type']   : '';
        $this->value  = (isset($_POST['value']) &&        $_POST['value']) ?        $_POST['value'] : '';

        $this->offset = ($this->page - 1) * $this->limit;

        $this->setTimeCorrection();

        $this->from = $this->correctDate($this->from);
        $this->to   = $this->correctDate($this->to);
    }
    private function correctRecordsDate($data)
    {
        $list = [];

        foreach ($data as $item) {
            $item['logged'] = $this->correctRecordDate($item['logged']);
            $item['updated'] = $this->correctRecordDate($item['updated']);
            $item['updated_investigation'] = $this->correctRecordDate($item['updated_investigation']);
            $item['updated_prevention'] = $this->correctRecordDate($item['updated_prevention']);

            $list[] = $item;
        }

        return $list;
    }
    private function correctRecordDate($requestDate, $format = 'Y-m-d H:i:s')
    {
        if (!$requestDate) {
            return $requestDate;
        }

        $this->tz = $this->validateTimeZone($this->tz);
        $date = DateTime::createFromFormat($format, $requestDate, new DateTimeZone($this->timeZone));
        $date->setTimeZone(new DateTimeZone($this->tz));
        $date->modify($this->diff . ' minutes');

        return $date->format($format);
    }
    private function correctDate($requestDate, $format = 'Y-m-d H:i:s')
    {
        if (!$requestDate) {
            return $requestDate;
        }

        $this->tz = $this->validateTimeZone($this->tz);
        $date = DateTime::createFromFormat($format, $requestDate, new DateTimeZone($this->tz));
        $date->setTimeZone(new DateTimeZone($this->timeZone));
        $date->modify($this->diff . ' minutes');

        return $date->format($format);
    }
    private function setTimeCorrection()
    {
        $this->tz = urldecode($this->tz);
        $this->tz = $this->getTimeZoneWithAliases($this->tz);
        $this->diff = 0;

        if ($this->tz == self::BROWSER_TYPE_NAME && isset($_GET['diff'])) {
            $this->diff = (int) $_GET['time_correction_diff'];
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
    private function validateTimeZone($tz) {
        try {
            new DateTimeZone($tz);
        } catch(Exception $e) {
            return $this->timeZone;
        }

        return $tz;
    }
    private function saveById()
    {
        if ($this->author && $this->value && $this->id) {
            $this->author = ($this->getUserFullName($this->author, 'All')) ? $this->getUserFullName($this->author, 'All') : $this->author;

            $this->db->changeEmergenciesRecord($this->id, $this->author, $this->value, $this->type);

            return $this->getRecordById();
        }

        http_response_code(404);
        die;
    }
    private function getList()
    {
        $records = $this->db->getEmergenciesList($this->limit, $this->offset, $this->from, $this->to);
        $records = $this->correctRecordsDate($records);

        return [
            "total" => $this->db->getEmergenciesTotal($this->from, $this->to),
            "data"  => $records,
        ];
    }
    private function getRecordById()
    {
        $records = $this->db->getEmergenciesRecord($this->id);
        $records = $this->correctRecordsDate($records);

        return [
            "total" => 1,
            "data"  => $records,
        ];
    }
    private function getUserFullName($name, $server) {
        if (isset($this->usersList[$server]) && isset($this->usersList[$server][$name])) {
            return $this->usersList[$server][$name];
        }

        return '';
    }
}

$emergency = new emergencyList();
echo json_encode($emergency->getData());
http_response_code(200);
die;
