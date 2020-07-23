<?php

class emergency
{
    public $hash;
    function __construct()
    {
        $this->db          = new db;
        $this->xml         = new xml;
        $this->plannedData = new planned;
        $this->actions     = new actions;
        $this->utils       = new utils;
        $this->xml->setCurrentTab('All');
        $this->plannedData->server  = 'All';
        $this->alertsList = json_decode(json_encode(simplexml_load_string($this->xml->returnXml(false))),TRUE);
        $this->emergencyAlerts = [];


        global $emergencyConfig;
        $this->emergency = $emergencyConfig;
        $this->memcache = $this->utils->getMemcache();
    }

    private function setRequestUrl()
    {
        $this->link = $this->emergency['mnuUrl'];
    }
    public function run()
    {
        $this->log("Starting Emergency");
        $this->verifyConfig();
        $this->setRequestUrl();
        $this->emergencyAlerts = $this->getEmergencyAlerts();
        $this->process();

        $this->log("Finishing Emergency");
    }
    public function runTest($phone)
    {
        $this->hash = md5(rand());
        $this->hash = 'test_' . $this->hash;
        $this->verifyConfig();
        $this->testCall($phone);
    }
    private function verifyConfig()
    {
        if (!$this->emergency
            || !isset($this->emergency['mnuUrl'])
            || !isset($this->emergency['mailto'])
            || !isset($this->emergency['domain'])
            || !isset($this->emergency['root'])
            || !isset($this->emergency['twilio'])
            || !isset($this->emergency['twilio']['language'])
            || !isset($this->emergency['twilio']['helloText'])
            || !isset($this->emergency['twilio']['emergencyText'])
            || !isset($this->emergency['twilio']['yourTimeText'])
            || !isset($this->emergency['twilio']['notPickedUpText'])
            || !isset($this->emergency['twilio']['listenMusicText'])
            || !isset($this->emergency['twilio']['musicLink'])
            || !isset($this->emergency['twilio']['decisionText'])
        ) {
            $this->log("Please add config to config.php");
            die;
        }
    }
    private function isNeededToSendEmail($alert)
    {
        if ($this->memcache) {
            $key  = $this->utils->getMemcacheFullName($alert['tab']);
            $key .= "_email_";
            $key .= md5($alert['host'] . $alert['service'] . $alert['tab']);

            if ($this->memcache->get($key)) {
                return false;
            }

            $this->memcache->set($key, "1", 0, 1800);
        }

        return true;
    }

    private function process()
    {
        if ($this->emergencyAlerts) {
            foreach($this->emergencyAlerts as $alert) {
                $this->hash = md5(rand());

                if ($alert['state'] != 'CRITICAL') {
                    if ($this->isNeededToSendEmail($alert)) {
                        if (!$this->sendEmail($alert)) {
                            $this->log("Sending failed");
                        }
                    }

                    $this->log("Not going to call. Finishing");
                    continue;
                }

                $this->log("Sending email");
                if (!$this->sendEmail($alert)) {
                    $this->log("Sending failed");
                }
                $this->db->insertToEmergencyTable($alert['host'], $alert['service'], 'email', $alert['statusInfo'], $this->hash);


                $this->log("Waiting 300 sec");
                sleep(300);

                $this->log("Calling cycle");
                $alreadyCalled = array();
                $timesCalled = 0;
                $rejectedTimes = 0;

                $didSomeoneAckInTwilio = 0;

                while (true) {
                    $doesAlertStillExist = $this->doesAlertStillExist($alert['host'], $alert['service']);

                    if ($didSomeoneAckInTwilio === 1 || !$doesAlertStillExist) {
                        $this->log("Alert {$alert['service']} at {$alert['host']} has gone (acked or sched). Finising");
                        $this->log("Procedure doesAlertStillExist returned: {$doesAlertStillExist} STATUS");
                        $this->log("Variable didSomeoneAckInTwilio returned: {$didSomeoneAckInTwilio} STATUS");
                        $this->db->insertToEmergencyTable($alert['host'], $alert['service'], 'OK/ACKED/SCHED', $alert['statusInfo'], $this->hash);

                        break;
                    } else {
                        $this->log("New calling iteration because no one set ack in Twilio");
                        $this->log("Procedure doesAlertStillExist returned: {$doesAlertStillExist} STATUS");
                        $this->log("Variable didSomeoneAckInTwilio returned: {$didSomeoneAckInTwilio} STATUS");
                    }

                    $adminData = $this->getAdminData($timesCalled);
                    if (empty($adminData['name'])){
                        break;
                    }
                    $timesCalled++;

                    if ($rejectedTimes != 1 && empty($adminData['name'])) {
                        if ($timesCalled > 4) {
                            break;
                        }

                        $alreadyCalled = array();
                        continue;
                    }

                    if ($rejectedTimes == 2) {
                        $rejectedTimes = 0;
                    }
                    $this->log("calling {$adminData['name']}");

                    $notificationUrl = $this->call($adminData['name'], $adminData['phone'], $alert['service'], $alreadyCalled, $adminData['nagios_name']);
                    $alreadyCalled[] = $adminData['name'];
                    $this->log("Notification URL = {$notificationUrl}");

                    if (!$notificationUrl) {
                        continue;
                    }

                    while (true) {
                        $status = @file_get_contents($notificationUrl);
                        $status = @json_decode($status);

                        if (!isset($status->start_time)) {
                            $this->log("Cannot decode status from $notificationUrl. We're not waiting for response from {$adminData['name']} any more");
                            break;
                        }

                        if (!$status->end_time) {
                            $this->log("Still calling");
                            sleep(5);
                            continue;
                        }

                        $this->log("Call finished, status: ". $status->status);
                        $statusMap = array('completed' => 'call accepted', 'busy' => 'call rejected', 'no-answer' => 'didn\'t pick up');
                        $this->db->insertToEmergencyTable($alert['host'], $alert['service'], $adminData['name'] .":". (isset($statusMap[$status->status]) ? $statusMap[$status->status] : $status->status), $alert['statusInfo'], $this->hash);

                        if ($status->status == 'busy') {
                            $rejectedTimes++;
                            if ($rejectedTimes == 2) {
                                continue 2;
                            }
                        } else {
                            $rejectedTimes = 0;
                        }
                        if ($status->status == 'no-answer' || $status->status == 'failed') {
                            continue 2;
                        }

                        break;
                    }

                    if (!$this->doesAlertStillExist($alert['host'], $alert['service'])) {
                        $this->log("Alert {$alert['service']} at {$alert['host']} has gone (acked or sched. or not critical). No need to wait for acknowledgement. Finising");
                        $this->db->insertToEmergencyTable($alert['host'], $alert['service'], 'OK/ACKED/SCHED', $alert['statusInfo'], $this->hash);
                        break;
                    }

                    $time = microtime(true);
                    $this->log("Waiting for acknowledgment from {$adminData['name']}");
                    $this->db->insertToEmergencyTable($alert['host'], $alert['service'], 'Waiting for acknowledgment from ' . $adminData['name'], $alert['statusInfo'], $this->hash);

                    while (true) {
                        if (microtime(true) - $time > 20) {
                            $this->log("Timeout happened. Not waiting for ack any more");
                            break;
                        }

                        if (!$this->isTwilioAcked($adminData['nagios_name'])) {
                            $this->log("No ack file yet. Waiting for API Answer");
                            sleep(1);
                            continue;
                        }

                        $this->log("{$adminData['name']} decided to acknowledge the alert. Acknowledging");
                        $this->db->insertToEmergencyTable($alert['host'], $alert['service'], $adminData['name'] . ' acking in nagios', $alert['statusInfo'], $this->hash);
                        $this->ackInNagios($alert, $adminData['nagios_name']);

                        $didSomeoneAckInTwilio = 1;
                        $this->db->insertToEmergencyTable($alert['host'], $alert['service'], $adminData['name'] . ' acked in nagios', $alert['statusInfo'], $this->hash);
                        $this->db->insertToEmergencyTable($alert['host'], $alert['service'], 'OK/ACKED/SCHED', $alert['statusInfo'], $this->hash);

                        break 2;
                    }
                }

                if (!$didSomeoneAckInTwilio) {
                    $this->log("Nobody could handle the call");
                }
            }
        }
    }
    private function ackInNagios($alert, $nagiosName)
    {
        $data = [
            'host'     => $alert['host'],
            'service'  => $alert['service'],
            'tab'      => $alert['tab'],
            'com_data' => 'temp',
            'author'   => $nagiosName,
            'isHost'   => $alert['hostOrService'],
        ];
        $this->actions->setType('quickAck');
        $this->actions->setServer($alert['tab']);
        $this->actions->runActions([$data]);
        $this->log("sent signal to Nagios pipe to ack the alert. Waiting");
        $this->log("alert was acknowledged. Nothing else to do");
    }
    private function isTwilioAcked($name)
    {
        $name = str_replace(' ', '%20', $name);
        $ackedcheckurl = $this->emergency['root'] . "twiml/ack_{$this->hash}" . "_$name";

        $curl_handle=curl_init();
        curl_setopt($curl_handle, CURLOPT_URL,$ackedcheckurl);
        curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($curl_handle, CURLOPT_SSL_VERIFYPEER, false);
        $ackedcheckdata = curl_exec($curl_handle);
        curl_close($curl_handle);

        $this->log("function isTwilioAcked received from {$ackedcheckurl} data: {$ackedcheckdata}");
        if ($ackedcheckdata === "ack") {
            return true;
        }

        return false;
    }
    private function getAdminData($timesCalled)
    {
        $curl_handle=curl_init();
        curl_setopt($curl_handle, CURLOPT_URL,$this->emergency['domain'] . 'getresponsibleadmin?number=' . $timesCalled);
        curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($curl_handle, CURLOPT_SSL_VERIFYPEER, false);
        $adminData = curl_exec($curl_handle);
        curl_close($curl_handle);

        $adminData = json_decode($adminData,true);

        if (empty($adminData['nagios_name'])) {
            $adminData['nagios_name'] = $adminData['name'];
        }

        return $adminData;
    }
    private function sendEmail($alert) {
        if (in_array($alert['state'], array("CRITICAL", "WARNING"))) $body = "Emergency has happened:";
        else if ($alert['state'] == "OK") $body = "Emergency has been solved:";
        else return false;

        $body .= "\n\nHost: {$alert['host']}\nService: {$alert['service']}\nId: $this->hash\nPlugin output: {$alert['statusInfo']}\n\n";
        $body .= "Ack: {$this->link}post.php?data%5B0%5D%5Bhost%5D=".urlencode($alert['host'])."&data%5B0%5D%5Bservice%5D=".urlencode($alert['service'])."&data%5B0%5D%5Bcom_data%5D=temp&data%5B0%5D%5Bauthor%5D=email&data%5B0%5D%5BisHost%5D=service&data%5B0%5D%5Btab%5D=".urlencode($alert['tab'])."&type=quickAck\n\n";
        return mail($this->emergency['mailto'], "{$alert['state']} for {$alert['service']} ({$this->hash})", $body, "From: Emergency <{$this->emergency['mailto']}>\r\n");
    }
    private function call($name, $phone, $service, $alreadyCalled, $nagios_name = '')
    {
        $twimlMessage = $this->newGenerateTwiml($service, $name, $alreadyCalled, $nagios_name);
        $__username = str_replace(' ', '%20', $name);
        $_data = $this->emergency['domain'] .'makealertcall?user='. $__username .'&phone='. $phone;

        $curl_handle=curl_init();
        curl_setopt($curl_handle, CURLOPT_URL,$this->emergency['domain'] .'makealertcall?user='. urlencode($name) .'&phone='. $phone);
        curl_setopt($curl_handle, CURLOPT_POST, true);
        curl_setopt($curl_handle, CURLOPT_POSTFIELDS, http_build_query(['message' => $twimlMessage]));
        curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($curl_handle, CURLOPT_SSL_VERIFYPEER, false);
        $data = curl_exec($curl_handle);
        curl_close($curl_handle);

        $encoded = json_decode($data,true);
        if (json_last_error() === JSON_ERROR_NONE){
            $this->log("Call url: " . $encoded['url']);
            $this->log("DATA_URL: " . $_data);
            return $encoded['url'];
        } else {
            $this->log("Error in call");
            return false;
        }
    }
    private function testCall($phone) {
        return $this->call('user', $phone, 'random emergency', array()) ;
    }
    private function newGenerateTwiml($service, $name, $alreadyCalled, $nagios_name) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>
<Response>
        <Say voice="alice" language="'. $this->emergency['twilio']['language'] .'">'. $this->emergency['twilio']['helloText'] .', '.$name.'.</Say>
        <Say voice="alice" language="'. $this->emergency['twilio']['language'] .'">'. $this->emergency['twilio']['emergencyText'] .'</Say>
        <Say voice="woman">'. $service .'</Say>
';
        if (!$alreadyCalled) {
            $xml .= '        <Say voice="alice" language="'. $this->emergency['twilio']['language'] .'">'. $this->emergency['twilio']['yourTimeText'] .'</Say>';
        } else  foreach ($alreadyCalled as $admin) {
            $xml .= '        <Say voice="alice" language="'. $this->emergency['twilio']['language'] .'">'. $admin .' '. $this->emergency['twilio']['notPickedUpText'] .'</Say>';
        }

        $xml .= '
        <Gather numDigits="1" timeout="2" action="'. $this->emergency['domain'] .'twilio.php?type=digit&amp;emergencyId='. $this->hash .'&amp;name='. urlencode($nagios_name) .'">
                <Say voice="alice" language="'. $this->emergency['twilio']['language'] .'">'. $this->emergency['twilio']['listenMusicText'] .'</Say>
                <Play>'. $this->emergency['twilio']['musicLink'] .'</Play>
                <Say voice="alice" language="'. $this->emergency['twilio']['language'] .'">'. $this->emergency['twilio']['decisionText'] .'</Say>
        </Gather>
        <Redirect>'. $this->emergency['domain'] .'twilio.php?type=ack&amp;emergencyId='.$this->hash.'&amp;name='.urlencode($nagios_name).'</Redirect>
</Response>';

        return base64_encode(json_encode($xml));
    }
    private function doesAlertStillExist($host, $service)
    {
        $alerts = $this->getEmergencyAlerts();
        if (!$alerts) {
            return false;
        }

        foreach ($alerts as $alert) {
            if ($alert['host'] == $host && $alert['service'] == $service && ($alert['acked'] || $alert['sched'])) {
                return false;
            }
        }

        return true;
    }

    private function getEmergencyAlerts()
    {
        $result = [];

        if (!isset($this->alertsList['alert'])) {
            return $result;
        }

        foreach ($this->alertsList['alert'] as $item) {
            $acked           = (!is_array($item['acked']))                ? $item['acked']                : implode(' ', $item['acked']);
            $ackComment      = (!is_array($item['ack_comment']))          ? $item['ack_comment']          : implode(' ', $item['ack_comment']);
            $sched           = (!is_array($item['sched']))                ? $item['sched']                : implode(' ', $item['sched']);
            $schComment      = (!is_array($item['sched_comment']))        ? $item['sched_comment']        : implode(' ', $item['sched_comment']);
            $host            = (!is_array($item['host']))                 ? $item['host']                 : implode(' ', $item['host']);
            $service         = (!is_array($item['service']))              ? $item['service']              : implode(' ', $item['service']);
            $state           = (!is_array($item['@attributes']['state'])) ? $item['@attributes']['state'] : implode(' ', $item['@attributes']['state']);
            $duration        = (!is_array($item['durationSec']))          ? $item['durationSec']          : implode(' ', $item['durationSec']);
            $downtimeId      = (!is_array($item['downtime_id']))          ? $item['downtime_id']          : implode(' ', $item['downtime_id']);
            $statusInfo      = (!is_array($item['status_information']))   ? $item['status_information']   : implode(' ', $item['status_information']);
            $tab             = (!is_array($item['tab']))                  ? $item['tab']                  : implode(' ', $item['tab']);
            $hostOrService   = (!is_array($item['host_or_service']))      ? $item['host_or_service']      : implode(' ', $item['host_or_service']);

            if (strpos(implode(" ", [$host, $service, $statusInfo]), 'EMERGENCY') === false) {
                continue;
            }

            if ($duration < 300) {
                continue;
            }

            if ($plannedRecord = $this->plannedData->findPlannedRecords($host, $service, $statusInfo, $hostOrService, $sched, $schComment, $downtimeId, $tab)) {
                $sched      = $plannedRecord['sched'];
                $schComment = $plannedRecord['comment'];
                $acked      = 0;
                $ackComment = '';
            }

            $changedComments = $this->changeLatestStatus($host, $service, $acked, $ackComment, $sched, $schComment, $tab);
            if ($changedComments) {
                $sched = $changedComments['sched'];
                $acked = $changedComments['acked'];
            }

            if ($acked || $sched) {
                continue;
            }

            $result[] = [
                'host'          => $host,
                'service'       => $service,
                'acked'         => $acked,
                'sched'         => $sched,
                'state'         => $state,
                'duration'      => $duration,
                'statusInfo'    => $statusInfo,
                'tab'           => $tab,
                'hostOrService' => $hostOrService,
            ];
        }

        return $result;
    }
    private function changeLatestStatus($host, $service, $acked, $ackComment, $sched, $schComment, $tab)
    {
        $latestActions = $this->db->getLatestActions();
        $needToReturn = false;
        $return = [
            'acked'      => $acked,
            'ackComment' => $ackComment,
            'sched'      => $sched,
            'schComment' => $schComment,
            'quickAckAu' => '',
        ];

        foreach ($latestActions as $last) {
            if ($last['host'] == $host && $last['service'] == $service && $last['server'] == $tab) {
                if ($last['command'] == 'ack') {
                    $needToReturn = true;
                    $return['acked'] = 1;
                    if ($last['comment'] == 'temp') {
                        $return['ackComment'] = $last['comment'];

                        $usersList = $this->db->usersList($tab);
                        $photo = (isset($usersList[$last['author']])) ? $usersList[$last['author']] : '';
                        $photo = ($photo) ? $photo : ((isset($usersList['default']) ? $usersList['default'] : ''));
                        $return['quickAckAu'] = md5($photo);
                    } else {
                        $return['ackComment'] = $this->utils->prepareAckSchedComment($last['comment'], $last['author'], $last['logged'], $last['server']);
                        $return['quickAckAu'] = '';
                    }
                }

                if ($last['command'] == 'unack') {
                    $needToReturn = true;
                    $return['acked'] = 0;
                    $return['ackComment'] = '';
                    $return['quickAckAu'] = '';
                }

                if ($last['command'] == 'sched') {
                    $needToReturn = true;
                    $return['acked'] = 0;
                    $return['ackComment'] = '';
                    $return['quickAckAu'] = '';
                    $return['sched'] = 1;
                    $return['schComment'] = $this->utils->prepareAckSchedComment($last['comment'], $last['author'], $last['logged'], $last['server']);
                }

                if ($last['command'] == 'unsched') {
                    $needToReturn = true;
                    $return['sched'] = 0;
                    $return['schComment'] = '';
                }
            }
        }

        return ($needToReturn) ? $return : false;
    }

    public function import()
    {
        $this->log("Emergencies import started");
        $this->getLastImportedRecordDate();
        $this->getCallsList();
        $this->processImportsList();
        $this->log("Emergencies import finished");
    }
    private function getLastImportedRecordDate()
    {
        $this->importFrom = $this->db->getLastEmergencyDate();
        $this->importFrom = array_shift($this->importFrom);

        $this->log("Emergencies import from: " . $this->importFrom);
    }
    private function getCallsList()
    {
        $urlDate = str_replace(' ', '%20', $this->importFrom);

        $curl_handle=curl_init();
        curl_setopt($curl_handle, CURLOPT_URL, $this->emergency['domain'] . 'twilio-emergency-sync.php?from_date_time=' . $urlDate);
        curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($curl_handle, CURLOPT_SSL_VERIFYPEER, false);
        $list = curl_exec($curl_handle);
        curl_close($curl_handle);

        $this->callsList = json_decode($list, true);
    }
    private function processImportsList()
    {
        foreach ($this->callsList as $item) {
            if ((!in_array($item['type'], $this->emergency['typeSkip']) && !in_array($item['subtype'], $this->emergency['subtypeSkip'])) || $item['data'] == 'incoming_call' || $item['date_create'] <= $this->importFrom) {
                continue;
            }

            $logged = $item['date_create'];
            $id = $item['tag'];
            $host = 'emergency line';
            $service = 'caller: ' . $item['caller'];
            $output = 'status: ' . $item['status'];
            $link = explode("|", $item['data']);
            $link = end($link);
            $history = $this->getImportHistory($item);

            $this->db->importToEmergencyTable($logged, $id, $host, $service, $output, $link, $history);
        }
    }
    private function getImportHistory($record)
    {
        foreach ($this->callsList as $item) {
            if ($item['tag'] == $record['tag'] && $item['type'] == 'outgoing queue call' && $item['status'] != 'calling') {
                return $item['recipient'] . " - " . $item['status'];
            }
        }

        return $record['recipient'] . " - " . $record['status'];
    }

    public function log($text) {
        echo date("Y-m-d H:i:s") . " " . $text . "\n";
    }
}
