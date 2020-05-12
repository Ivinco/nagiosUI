<?php

class db
{
    public $mysql;

    function __construct()
    {
        global $database;
        global $infoRecordMark;

        $this->database = $database;
        $this->infoRecordMark = $infoRecordMark;

        $this->connect();
        $this->createTables();
    }

    private function connect()
    {
        $this->mysql = new mysqli($this->database['host'], $this->database['user'], $this->database['pass'], '', $this->database['port']);

        if ($this->mysql->connect_errno) {
            printf("Connect failed: %s\n", $this->mysql->connect_error);
            exit();
        }

        if (!$this->mysql->select_db($this->database['db'])) {
            if (!$this->mysql->query("CREATE DATABASE IF NOT EXISTS ". $this->database['db'])) {
                echo "CREATE DATABASE IF NOT EXISTS ". $this->database['db'];
                echo "Couldn't create database (". $this->database['db'] ."): " . $this->mysql->error;
            }

            $this->mysql->select_db($this->database['db']);
        }
    }
    private function createTables()
    {
        $this->nagios_external_commands_log = $this->database['prefix'] . "nagios_external_commands_log";
        $nagios_external_commands_log = "
            CREATE TABLE IF NOT EXISTS `". $this->nagios_external_commands_log ."` (
                `logged`  TIMESTAMP    NOT NULL DEFAULT '0000-00-00 00:00:00',
                `host`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                `command` ENUM('ack', 'sched', 're-check', 'planned', 'unack', 'unsched') DEFAULT NULL,
                `author`  VARCHAR(255) NOT NULL,
                `comment` VARCHAR(255) NOT NULL,
                `server`  VARCHAR(255) NOT NULL
            )
        ";
        if ($this->mysql->query($nagios_external_commands_log) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $nagios_external_commands_log_alter = "
            ALTER TABLE
                {$this->nagios_external_commands_log}
            CHANGE
                `command` `command` ENUM('ack', 'sched', 're-check', 'planned', 'unack', 'unsched') NULL DEFAULT NULL;
        ";
        $this->mysql->query($nagios_external_commands_log_alter);

        $this->planned_log = $this->database['prefix'] . "planned_log";
        $planned_log = "
            CREATE TABLE IF NOT EXISTS `". $this->planned_log ."` (
                `logged`  TIMESTAMP     NOT NULL DEFAULT '0000-00-00 00:00:00',
                `host`    VARCHAR(255)  NOT NULL,
                `service` VARCHAR(255)  NOT NULL,
                `status`  VARCHAR(255)  NOT NULL,
                `comment` VARCHAR(1000) NOT NULL,
                `time`    INT           NOT NULL,
                `end`     INT           NOT NULL,
                `date`    VARCHAR(255)  NOT NULL,
                `user`    VARCHAR(255)  NOT NULL,
                `normal`  INT           NOT NULL,
                `list`    TEXT          NOT NULL,
                `server`  VARCHAR(255)  NOT NULL,
                `enabled` TINYINT       NOT NULL DEFAULT 1,
                `deleted` TIMESTAMP     NOT NULL DEFAULT '0000-00-00 00:00:00'
            )
        ";
        if ($this->mysql->query($planned_log) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $planned_log_alter = "
            ALTER TABLE
                {$this->planned_log}
            ADD COLUMN
                `enabled` TINYINT    NOT NULL DEFAULT 1,
            ADD COLUMN 
                `deleted` TIMESTAMP  NOT NULL DEFAULT '0000-00-00 00:00:00';
        ";
        $this->mysql->query($planned_log_alter);

        $this->planned_templates = $this->database['prefix'] . "planned_templates";
        $planned_templates = "
            CREATE TABLE IF NOT EXISTS `". $this->planned_templates ."` (
                `name`    VARCHAR(255) NOT NULL,
                `host`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                `status`  VARCHAR(255) NOT NULL,
                `time`    INT          NOT NULL,
                `comment` VARCHAR(255) NOT NULL,
                `normal`  INT          NOT NULL,
                `server`  VARCHAR(255) NOT NULL
            )
        ";
        if ($this->mysql->query($planned_templates) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $this->users_list = $this->database['prefix'] . "users_list";
        $users_list = "
            CREATE TABLE IF NOT EXISTS `". $this->users_list ."` (
                `name`   VARCHAR(255) NOT NULL,
                `email`  VARCHAR(255) NOT NULL,
                `server` VARCHAR(255) NOT NULL,
                `full_name`   VARCHAR(255) NOT NULL,
                `full_access` TINYINT DEFAULT 0 NOT NULL
            )
        ";
        if ($this->mysql->query($users_list) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }
        $users_list_alter = "
            ALTER TABLE
                {$this->users_list}
            ADD
                `full_access` TINYINT DEFAULT 0 NOT NULL;
        ";
        $this->mysql->query($users_list_alter);

        $users_list_alter1 = "
            ALTER TABLE
                {$this->users_list}
            ADD
                `full_name` VARCHAR(255) NOT NULL;
        ";
        $this->mysql->query($users_list_alter1);

        $this->access_list = $this->database['prefix'] . "access_list";
        $access_list = "
            CREATE TABLE IF NOT EXISTS `". $this->access_list ."` (
                `user`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                `server`  VARCHAR(255) NOT NULL
            )
        ";
        if ($this->mysql->query($access_list) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $this->notes_urls = $this->database['prefix'] . "notes_urls";
        $notes_urls = "
            CREATE TABLE IF NOT EXISTS `". $this->notes_urls ."` (
                `service_or_host` VARCHAR(255) NOT NULL,
                `url`          VARCHAR(255) NOT NULL,
                `server`       VARCHAR(255) NOT NULL
            )
        ";
        if ($this->mysql->query($notes_urls) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $this->checks = $this->database['prefix'] . "checks";
        $checks = "
            CREATE TABLE IF NOT EXISTS `". $this->checks ."` (
                `id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `server`  VARCHAR(255) NOT NULL,
                `host`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                PRIMARY KEY (`id`)
            )
        ";
        if ($this->mysql->query($checks) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $this->history = $this->database['prefix'] . "history";
        $history = "
            CREATE TABLE IF NOT EXISTS `". $this->history ."` (
                `date`     DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
                `check_id` INT UNSIGNED NOT NULL,
                `severity` ENUM('unhandled','quick_acked','acked','sched','planned_downtime') NOT NULL,
                `state`    ENUM('ok','warning','critical','unknown') NOT NULL,
                `user`     VARCHAR(255),
                `comment`  TEXT,
                `output`   VARCHAR(1024) NOT NULL,
                PRIMARY KEY (`date`, `check_id`)
            )
        ";
        if ($this->mysql->query($history) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $history_alter = "
            ALTER TABLE
                {$this->history}
            CHANGE
                `output` `output` VARCHAR(1024) NOT NULL;
        ";
        $this->mysql->query($history_alter);
    }
    public function getLatestActions()
    {
        $list   = [];
        $sql    = "SELECT * FROM {$this->nagios_external_commands_log} WHERE `logged` > '". date('Y-m-d H:i:s', strtotime('-5 minutes')) ."' ORDER BY `logged`";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $list[] = $row;
        }

        return $list;
    }
    public function logAction($data, $command, $server, $insertToDb = false) {
        $host    = (isset($data['host']))    ? $data['host']    : '';
        $service = (isset($data['service'])) ? $data['service'] : '';
        $author  = (isset($data['author']))  ? $data['author']  : '';
        $comment = (isset($data['comment'])) ? $data['comment'] : '';

        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $author  = $this->mysql->real_escape_string($author);
        $comment = $this->mysql->real_escape_string($comment);
        $command = $this->mysql->real_escape_string($command);
        $server  = $this->mysql->real_escape_string($server);

        if (!$host && !$service && !$server) {
            return;
        }

        if ($insertToDb) {
            $sql = "
                INSERT INTO `{$this->nagios_external_commands_log}`
                    (`logged`, `host`, `service`, `command`, `author`, `comment`, `server`) 
                VALUES 
                    (CURRENT_TIMESTAMP(), '{$host}', '{$service}', '{$command}', '{$author}', '{$comment}', '{$server}')
            ";

            if ($this->mysql->query($sql) !== true) {
                echo "Error saving data: " . $this->mysql->error;
            }
        }

        /*if (in_array($command, ['ack', 'sched', 'unack', 'unsched'])) {
            $xml = new xml;
            $xml->updateMemcache($server, $data, $command);
        }*/
    }

    public function returnPlanned($server) {
        $list = [];
        $time = time();
        $server = $this->mysql->real_escape_string($server);
        $serversQuery = '';

        if ($server != 'All') {
            $serversQuery = "  AND `server` IN ('{$server}', 'All')";
        }

        $sql = "SELECT * FROM `{$this->planned_log}` WHERE `end` > {$time}{$serversQuery} AND `enabled` = 1";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $row['list'] = json_decode($row['list'], true);

            $list[] = $row;
        }

        return $list;
    }
    public function deleteOldPlanned($server) {
        $time = time();
        $server = $this->mysql->real_escape_string($server);

        $sql = "
            UPDATE
                `{$this->planned_log}`
            SET 
                `enabled` = 0,
                `deleted` = CURRENT_TIMESTAMP()
            WHERE
                `end`    < {$time}
              AND
                `server` = '{$server}'
              AND 
                `enabled` = 1
        ";

        $this->mysql->query($sql);
    }
    public function addNewPlanned($host, $service, $status, $comment, $time, $end, $date, $user, $normal, $server) {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $status  = $this->mysql->real_escape_string($status);
        $comment = $this->mysql->real_escape_string($comment);
        $time    = $this->mysql->real_escape_string($time);
        $end     = $this->mysql->real_escape_string($end);
        $date    = $this->mysql->real_escape_string($date);
        $user    = $this->mysql->real_escape_string($user);
        $normal  = $this->mysql->real_escape_string($normal);
        $server  = $this->mysql->real_escape_string($server);

        $sql = "
            INSERT INTO `{$this->planned_log}`
                (`logged`, `host`, `service`, `status`, `comment`, `time`, `end`, `date`, `user`, `normal`, `list`, `server`, `enabled`) 
            VALUES 
                (CURRENT_TIMESTAMP(), '{$host}', '{$service}', '{$status}', '{$comment}', {$time}, {$end}, '{$date}', '{$user}', {$normal}, '', '{$server}', 1)
        ";

        $this->mysql->query($sql);
    }
    public function editPlanned($id, $host, $service, $status, $comment, $normal, $server, $time, $end, $date) {
        $id = explode('___', $id);

        $oldHost    = $this->mysql->real_escape_string($id[0]);
        $oldService = $this->mysql->real_escape_string($id[1]);
        $oldStatus  = $this->mysql->real_escape_string($id[2]);
        $oldServer  = $this->mysql->real_escape_string($id[3]);

        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $status  = $this->mysql->real_escape_string($status);
        $comment = $this->mysql->real_escape_string($comment);
        $normal  = $this->mysql->real_escape_string($normal);
        $server  = $this->mysql->real_escape_string($server);

        $changeEnd = '';
        if ($time && $end && $date) {
            $time = $this->mysql->real_escape_string($time);
            $end  = $this->mysql->real_escape_string($end);
            $date = $this->mysql->real_escape_string($date);

            $changeEnd = " , `time`  = '{$time}', `end`  = '{$end}', `date`  = '{$date}'";
        }

        $sql = "
            UPDATE
                `{$this->planned_log}`
            SET 
                `host`    = '{$host}',
                `service` = '{$service}',
                `status`  = '{$status}',
                `comment` = '{$comment}',
                `normal`  = '{$normal}',
                `server`  = '{$server}'
                {$changeEnd}
            WHERE
                `host` = '{$oldHost}'
              AND
                `service` = '{$oldService}'
              AND
                `status` = '{$oldStatus}'
              AND
                `server` = '{$oldServer}'
              AND
                `enabled` = 1
        ";

        $this->mysql->query($sql);
    }
    public function editPlannedComment($id, $comment, $server) {
        $id = explode('___', $id);

        $host    = $this->mysql->real_escape_string($id[0]);
        $service = $this->mysql->real_escape_string($id[1]);
        $status  = $this->mysql->real_escape_string($id[2]);
        $comment = $this->mysql->real_escape_string($comment);
        $server  = $this->mysql->real_escape_string($server);

        $sql = "
            UPDATE
                `{$this->planned_log}`
            SET 
                `comment` = '{$comment}'
            WHERE
                `host` = '{$host}'
              AND
                `service` = '{$service}'
              AND
                `status` = '{$status}'
              AND
                `server` = '{$server}'
              AND 
                `enabled` = 1
        ";

        $this->mysql->query($sql);
    }
    public function editPlannedList($list, $host, $service, $status, $server) {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $status  = $this->mysql->real_escape_string($status);
        $list    = $this->mysql->real_escape_string(json_encode($list));
        $server  = $this->mysql->real_escape_string($server);

        $sql = "
            UPDATE
                `{$this->planned_log}`
            SET 
                `list` = '{$list}'
            WHERE
                `host` = '{$host}'
              AND
                `service` = '{$service}'
              AND
                `status` = '{$status}'
              AND
                `server` = '{$server}'
              AND 
                `enabled` = 1
        ";

        $this->mysql->query($sql);
    }
    public function removePlanned($id, $server) {
        $id = explode('___', $id);

        $host    = $this->mysql->real_escape_string($id[0]);
        $service = $this->mysql->real_escape_string($id[1]);
        $status  = $this->mysql->real_escape_string($id[2]);
        $server  = $this->mysql->real_escape_string($id[3]);

        $sql = "
            UPDATE
                `{$this->planned_log}`
            SET 
                `enabled` = 0,
                `deleted` = CURRENT_TIMESTAMP()
            WHERE
                `host` = '{$host}'
              AND
                `service` = '{$service}'
              AND
                `status` = '{$status}'
              AND
                `server` = '{$server}'
              AND
                `enabled` = 1
        ";

        $this->mysql->query($sql);
    }
    public function returnPlannedRecord($id, $server) {
        $id = explode('___', $id);

        $host    = $this->mysql->real_escape_string($id[0]);
        $service = $this->mysql->real_escape_string($id[1]);
        $status  = $this->mysql->real_escape_string($id[2]);
        $server  = $this->mysql->real_escape_string($id[3]);

        $sql = "
            SELECT 
                * 
            FROM 
                `{$this->planned_log}` 
            WHERE 
                `host` = '{$host}'
              AND
                `service` = '{$service}'
              AND
                `status` = '{$status}'
              AND
                `server` = '{$server}'
              AND
                `enabled` = 1
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);
        $row = $result->fetch_assoc();

        return $row;
    }

    public function plannedTemplatesList($server) {
        $server = $this->mysql->real_escape_string($server);
        $list = [];
        $serversQuery = '';

        if ($server != 'All') {
            $serversQuery = " WHERE `server` IN ('{$server}', 'All')";
        }

        $sql = "SELECT * FROM `{$this->planned_templates}`{$serversQuery}";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $list[] = $row;
        }

        return $list;
    }

    public function usersList($server) {
        $server = $this->mysql->real_escape_string($server);
        $where = ($server == 'All') ? "" : " WHERE `server` = '{$server}'";
        $sql = "SELECT * FROM `{$this->users_list}` {$where}";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[$row['name']] = $row['email'];
        }

        return $list;
    }

    public function usersListStatsPage() {
        $sql = "SELECT * FROM `{$this->users_list}`";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = ['All' => []];
        while ($row = $result->fetch_assoc()){
            if (!isset($list[$row['server']])) {
                $list[$row['server']] = [];
            }

            $list['All'][$row['name']] = $list[$row['server']][$row['name']] = $row['full_name'];
        }

        return $list;
    }

    public function returnComments($host, $service, $server) {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $server  = $this->mysql->real_escape_string($server);

        if ($host && $service) {
            $where = " `host` = '{$host}' AND `service` = '{$service}'";
        } else if ($host) {
            $where = " `host` = '{$host}' ";
        } else {
            $where = " `service` = '{$service}' ";
        }

        $sql = "
            SELECT 
                `comment`, max(`logged`) `last_seen`
            FROM 
                `{$this->nagios_external_commands_log}`
            WHERE
                `comment` != 'temp'
              AND
                `server` = '{$server}'
              AND 
                {$where}
            GROUP BY
                `comment`
            ORDER BY
                `last_seen` DESC
            LIMIT 10
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[] = [
                'name' => $row['comment'],
                'date' => $row['last_seen'],
            ];
        }

        return $list;
    }

    public function lastActionsList()
    {
        $sql = "
            SELECT 
                *
            FROM 
                `{$this->nagios_external_commands_log}`
            WHERE
                `command` IN ('sched', 'ack')
              AND 
                `logged` > date_sub(now(), INTERVAL 30 MINUTE)
              AND 
                `comment` NOT LIKE '(planned)%'
            ORDER BY
                `logged` ASC
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[] = [
                'logged'  => trim($row['logged']),
                'host'    => trim($row['host']),
                'service' => trim($row['service']),
                'command' => trim($row['command']),
                'author'  => trim($row['author']),
                'comment' => trim($row['comment']),
                'server'  => trim($row['server']),
            ];
        }

        return $list;
    }
    public function plannedActionsList()
    {
        $sql = "
            SELECT 
                *
            FROM 
                `{$this->nagios_external_commands_log}`
            WHERE
                `command` = 'planned'
              AND 
                `logged` > date_sub(now(), INTERVAL 30 MINUTE)
            ORDER BY
                `logged` ASC
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[] = [
                'logged'  => trim($row['logged']),
                'host'    => trim($row['host']),
                'service' => trim($row['service']),
                'command' => trim($row['command']),
                'author'  => trim($row['author']),
                'comment' => trim($row['comment']),
                'server'  => trim($row['server']),
            ];
        }

        return $list;
    }

    public function notesUrls($server) {
        $server = $this->mysql->real_escape_string($server);

        $sql = "
            SELECT 
                *
            FROM 
                `{$this->notes_urls}`
            WHERE
                `server` = '{$server}'
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[$row['service_or_host']] = $row['url'];
        }

        return $list;
    }

    public function getSuperUsers($server) {
        $server = $this->mysql->real_escape_string($server);
        $list = [];
        $serversQuery = '';

        if ($server != 'All') {
            $serversQuery = " AND `server` IN ('{$server}')";
        }

        $sql = "SELECT `name` FROM {$this->users_list} WHERE `full_access` = 1 {$serversQuery}";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $list[] = $row['name'];
        }

        return $list;
    }
    public function getAccessList($server) {
        $server = $this->mysql->real_escape_string($server);
        $list = [];
        $serversQuery = '';

        if ($server != 'All') {
            $serversQuery = " WHERE `server` IN ('{$server}')";
        }

        $sql = "SELECT `user`,`service` FROM {$this->access_list} {$serversQuery}";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            if (!isset($list[$row['user']])) {
                $list[$row['user']] = [];
            }
            $list[$row['user']][] = $row['service'];
        }

        return $list;
    }

    public function historyGetChecks($server)
    {
        $server = $this->mysql->real_escape_string($server);
        $sql = "SELECT * FROM `{$this->checks}` WHERE `server` = '{$server}'";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [
            'ids'    => [],
            'checks' => [],
        ];
        while ($row = $result->fetch_assoc()){
            $list['ids'][] = $row['id'];
            $list['checks'][$row['host']][$row['service']] = $row['id'];
        }

        return $list;
    }
    public function historyAddCheck($host, $service, $server)
    {
        $server  = $this->mysql->real_escape_string($server);
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);

        $sql = "
            INSERT INTO `{$this->checks}`
                (`server`, `host`, `service`) 
            VALUES 
                ('{$server}', '{$host}', '{$service}')
        ";

        if ($this->mysql->query($sql) !== true) {
            echo "Error: " . $this->mysql->error;
        }

        return $this->mysql->insert_id;
    }
    public function historyAddHistory($checkId, $severity, $state, $user, $comment, $output)
    {
        $checkId  = $this->mysql->real_escape_string($checkId);
        $severity = $this->mysql->real_escape_string($severity);
        $state    = $this->mysql->real_escape_string($state);
        $user     = $this->mysql->real_escape_string($user);
        $user     = ($user) ? "'$user'" : "NULL";
        $comment  = $this->mysql->real_escape_string($comment);
        $comment  = ($comment) ? "'$comment'" : "NULL";
        $output   = $this->mysql->real_escape_string($output);
        $output   = substr($output, 0, 1024);

        $sql = "
            INSERT INTO 
                `{$this->history}` (`date`, `check_id`, `severity`, `state`, `user`, `comment`, `output`) 
            VALUES 
                (NOW(), {$checkId}, '{$severity}', '{$state}', {$user}, {$comment}, '{$output}')
        ";

        if ($this->mysql->query($sql) !== true) {
            echo "Error: " . $this->mysql->error;
        }
    }
    public function historyGetUnfinishedAlerts($server)
    {
        $server = $this->mysql->real_escape_string($server);

        $sql = "
            SELECT 
                `history1`.*, `checks`.`server`, `checks`.`host`, `checks`.`service`
            FROM 
                `{$this->history}` AS `history1`
            JOIN
                  (SELECT MAX(`date`) `date`, `check_id` FROM `{$this->history}` GROUP BY `check_id`) AS `history2`
                ON
                  `history1`.`date` = `history2`.`date` AND `history1`.`check_id` = `history2`.`check_id`
            LEFT JOIN 
                  `{$this->checks}` AS `checks`
                ON
                  `history1`.`check_id` = `checks`.`id`
            WHERE
                  `history1`.`state` != 'ok'
                AND
                  `checks`.`server` = '{$server}'
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[$row['host']][$row['service']] = $row;
        }

        return $list;
    }

    public function historyGetUnfinishedAlertsWithDate($server, $dateTo)
    {
        $server = $this->mysql->real_escape_string($server);
        $dateTo = $this->mysql->real_escape_string($dateTo);
        $users  = $this->usersList($server);

        if ($dateTo) {
            $dateTo = "WHERE `date` < '{$dateTo}'";
        }

        $sql = "
            SELECT 
                `history1`.*, `checks`.`server`, `checks`.`host`, `checks`.`service`
            FROM 
                `{$this->history}` AS `history1`
            JOIN
                  (SELECT MAX(`date`) `date`, `check_id` FROM `{$this->history}` {$dateTo} GROUP BY `check_id`) AS `history2`
                ON
                  `history1`.`date` = `history2`.`date` AND `history1`.`check_id` = `history2`.`check_id`
            LEFT JOIN 
                  `{$this->checks}` AS `checks`
                ON
                  `history1`.`check_id` = `checks`.`id`
            WHERE
                  `history1`.`state` != 'ok'
                AND
                  `checks`.`server` = '{$server}'
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [
            'normal'    => [],
            'acked'     => [],
            'sched'     => [],
            'EMERGENCY' => [],
        ];

        while ($row = $result->fetch_assoc()){
            $tab = 'normal';

            if ($row['severity'] == 'acked') {
                $tab = 'acked';
            }

            if ($row['severity'] == 'planned_downtime' || $row['severity'] == 'sched') {
                $tab = 'sched';
            }

            if (strpos(implode(' ', $row), 'EMERGENCY') !== false) {
                $tab = 'EMERGENCY';
            }

            $row['state_id'] = $this->returnState($row['state']);
            $row['avatar'] = '';

            $row['info'] = false;
            $infoRecord = $this->returnInfoRecord($row['service'], $row['output']);
            if ($infoRecord['info']) {
                $row['info']    = true;
                $row['service'] = $infoRecord['service'];
                $row['output']  = $infoRecord['status'];
            }

            if ($row['user'] && isset($users[$row['user']])) {
                $row['avatar'] = md5(strtolower(trim($users[$row['user']])));
            }

            $list[$tab][] = $row;
        }

        return $list;
    }
    private function returnState($state) {
        if ($state == 'warning') {
            return '1';
        }

        if ($state == 'critical') {
            return '2';
        }

        if ($state == 'unknown') {
            return '3';
        }

        return '0';
    }
    private function returnInfoRecord($service, $status) {
        $return = [
            'service' => $service,
            'status'  => $status,
            'info'    => false,
        ];

        if (count($this->infoRecordMark['everywhere']['remove'])) {
            foreach ($this->infoRecordMark['everywhere']['remove'] as $item) {
                if ($match = $this->infoPregMatch($item, $return['service'], false, true)) {
                    $return['service'] = $match;
                    $return['info']    = true;
                }
                if ($match = $this->infoPregMatch($item, $return['status'], false, true)) {
                    $return['status'] = $match;
                    $return['info']   = true;
                }
            }
        }
        if (count($this->infoRecordMark['everywhere']['leave'])) {
            foreach ($this->infoRecordMark['everywhere']['leave'] as $item) {
                if ($this->infoPregMatch($item, $return['service'], false, false) || $this->infoPregMatch($item, $return['status'], false, false)) {
                    $return['info'] = true;
                }
            }
        }

        if (count($this->infoRecordMark['begin']['remove'])) {
            foreach ($this->infoRecordMark['begin']['remove'] as $item) {
                if ($match = $this->infoPregMatch($item, $return['service'], true, true)) {
                    $return['service'] = $match;
                    $return['info']    = true;
                }
                if ($match = $this->infoPregMatch($item, $return['status'], true, true)) {
                    $return['status'] = $match;
                    $return['info']   = true;
                }
            }
        }
        if (count($this->infoRecordMark['begin']['leave'])) {
            foreach ($this->infoRecordMark['begin']['leave'] as $item) {
                if ($this->infoPregMatch($item, $return['service'], true, false) || $this->infoPregMatch($item, $return['status'], true, false)) {
                    $return['info'] = true;
                }
            }
        }

        return $return;
    }
    private function infoPregMatch($marker, $subject, $start = false, $remove = false) {
        $return  = '';
        $pattern = '/'. (($start) ? '^' : '') . $marker .'/';

        if (preg_match($pattern, $subject)) {
            if ($remove) {
                if ($start) {
                    $return = substr($subject, mb_strlen($marker));
                } else {
                    $return = str_replace($marker, '', $subject);
                }
            } else {
                $return = $subject;
            }
        }

        return $return;
    }
    public function historyGetUnfinishedAlertsWithPeriod($dateFrom, $dateTo)
    {
        $dateTo   = $this->mysql->real_escape_string($dateTo);
        $dateFrom = $this->mysql->real_escape_string($dateFrom);

        if ($dateTo) {
            $dateTo = "AND `history`.`date` < '{$dateTo}'";
        }

        $sql = "
            SELECT 
                `history1`.*, `checks`.`server`, `checks`.`host`, `checks`.`service`
            FROM 
                `{$this->history}` AS `history1`
            JOIN
                  (SELECT MAX(`date`) `date`, `check_id` FROM `{$this->history}` WHERE `date` < '{$dateFrom}' GROUP BY `check_id`) AS `history2`
                ON
                  `history1`.`date` = `history2`.`date` AND `history1`.`check_id` = `history2`.`check_id`
            LEFT JOIN 
                  `{$this->checks}` AS `checks`
                ON
                  `history1`.`check_id` = `checks`.`id`
            WHERE
                  `history1`.`state` != 'ok'
                AND
                  (`history1`.`severity` = 'unhandled' OR `history1`.`severity` = 'quick_acked')
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);
        $list = [];

        while ($row = $result->fetch_assoc()){
            $row['info'] = false;
            $infoRecord = $this->returnInfoRecord($row['service'], $row['output']);

            if ($infoRecord['info']) {
                $row['info']    = true;
                $row['service'] = $infoRecord['service'];
                $row['output']  = $infoRecord['status'];
            }

            if ($row['date'] < $dateFrom) {
                $row['date'] = $dateFrom;
            }

            $list[$row['server']][$row['check_id'].$row['date']] = $row;
        }

        $sql = "
            SELECT 
                `history`.*, `checks`.`server`, `checks`.`host`, `checks`.`service`
            FROM 
                `{$this->history}` AS `history`
            LEFT JOIN 
                  `{$this->checks}` AS `checks`
                ON
                  `history`.`check_id` = `checks`.`id`
            WHERE
                `history`.`date` > '{$dateFrom}'
                {$dateTo}
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $row['info'] = false;
            $infoRecord = $this->returnInfoRecord($row['service'], $row['output']);

            if ($infoRecord['info']) {
                $row['info']    = true;
                $row['service'] = $infoRecord['service'];
                $row['output']  = $infoRecord['status'];
            }

            $list[$row['server']][$row['check_id'].$row['date']] = $row;
        }

        $orderedList = [];

        foreach ($list as $server => $data) {
            ksort($data);
            $data = array_values($data);
            $orderedList[$server] = $data;
        }

        return $orderedList;
    }
}
