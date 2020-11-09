<?php

class db
{
    public $mysql;

    function __construct()
    {
        global $database;
        global $infoRecordMark;
        global $emergencyConfig;

        $this->emergencyConfig = $emergencyConfig;
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
    public function reconnect()
    {
        $this->connect();
    }
    public function shutdown()
    {
        $this->mysql->close();
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
                `deleted` TIMESTAMP     NOT NULL DEFAULT '0000-00-00 00:00:00',
                `remove`  TINYINT       NOT NULL DEFAULT 0
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

        $planned_log_alter = "
            ALTER TABLE
                {$this->planned_log}
            ADD COLUMN
                `remove`  TINYINT    NOT NULL DEFAULT 0;
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
                `full_access` TINYINT DEFAULT 0 NOT NULL,
                `super_user` TINYINT DEFAULT 0 NOT NULL
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

        $users_list_alter2 = "
            ALTER TABLE
                {$this->users_list}
            ADD
                `super_user` TINYINT DEFAULT 0 NOT NULL;
        ";
        $this->mysql->query($users_list_alter2);

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
                `host`         VARCHAR(255) NOT NULL,
                `service`      VARCHAR(255) NOT NULL,
                `url`          VARCHAR(255) NOT NULL,
                `server`       VARCHAR(255) NOT NULL
            )
        ";
        if ($this->mysql->query($notes_urls) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $notes_urls_alter = "
            ALTER TABLE
                {$this->notes_urls}
            ADD COLUMN
                `host`         VARCHAR(255) NOT NULL,
            ADD COLUMN 
                `service`      VARCHAR(255) NOT NULL;
        ";
        $this->mysql->query($notes_urls_alter);


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


        $this->emergency = $this->database['prefix'] . "emergency";
        $emergency = "
            CREATE TABLE IF NOT EXISTS `". $this->emergency ."` (
                `logged`                TIMESTAMP    NOT NULL DEFAULT '0000-00-00 00:00:00',
                `id`                    CHAR(32)     NOT NULL DEFAULT '',
                `host`                  VARCHAR(255) NOT NULL,
                `service`               VARCHAR(255) NOT NULL,
                `history`               BLOB,
                `updated`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `investigation`         TEXT,
                `output`                TEXT,
                `updated_investigation` TIMESTAMP    NOT NULL DEFAULT '0000-00-00 00:00:00',
                `prevention`            TEXT,
                `updated_prevention`    TIMESTAMP    NULL     DEFAULT NULL,
                `author_prevention`     VARCHAR(255)          DEFAULT NULL,
                `author_investigation`  VARCHAR(255)          DEFAULT NULL,
                `author`                VARCHAR(255)          DEFAULT NULL,
                `link`                  TEXT,
                PRIMARY KEY (`id`)
            )
        ";
        if ($this->mysql->query($emergency) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }

        $this->stats = $this->database['prefix'] . "stats";
        $stats = "
            CREATE TABLE IF NOT EXISTS `". $this->stats ."` (
                `logged`             TIMESTAMP          NOT NULL DEFAULT '0000-00-00 00:00:00',
                `unhandled_critical` SMALLINT  UNSIGNED NOT NULL DEFAULT 0,
                `unhandled_warning`  SMALLINT  UNSIGNED NOT NULL DEFAULT 0,
                `unhandled_unknown`  SMALLINT  UNSIGNED NOT NULL DEFAULT 0,
                `acked`              SMALLINT  UNSIGNED NOT NULL DEFAULT 0,
                `sched`              SMALLINT  UNSIGNED NOT NULL DEFAULT 0,
                `longest_critical`   MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
                `longest_warning`    MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
                `longest_unknown`    MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY (`logged`)
            )
        ";

        if ($this->mysql->query($stats) !== true) {
            echo "Error creating table: " . $this->mysql->error;
            exit();
        }
    }
    public function insertIntoStatsTable($stats)
    {
        $unhandled_critical  = $this->mysql->real_escape_string($stats['criticalUnhandled']);
        $unhandled_warning   = $this->mysql->real_escape_string($stats['warningUnhandled']);
        $unhandled_unknown   = $this->mysql->real_escape_string($stats['unknownUnhandled']);
        $acked               = $this->mysql->real_escape_string($stats['acked']);
        $sched               = $this->mysql->real_escape_string($stats['sched']);
        $longest_critical    = $this->mysql->real_escape_string($stats['criticalLongest']);
        $longest_warning     = $this->mysql->real_escape_string($stats['warningLongest']);
        $longest_unknown     = $this->mysql->real_escape_string($stats['unknownLongest']);

        $date = date('Y-m-d H:i:s');
        $sql = "
            INSERT INTO 
                {$this->stats}
            SET 
                `logged`             = '{$date}',
                `unhandled_critical` = {$unhandled_critical},
                `unhandled_warning`  = {$unhandled_warning},
                `unhandled_unknown`  = {$unhandled_unknown},
                `acked`              = {$acked},
                `sched`              = {$sched},
                `longest_critical`   = {$longest_critical},
                `longest_warning`    = {$longest_warning},
                `longest_unknown`    = {$longest_unknown} 
        ";

        if ($this->mysql->query($sql) !== true) {
            http_response_code(404);
            die("Error saving data: " . $this->mysql->error);
        }
    }
    public function getLastEmergencyDate()
    {
        $sql = "
            SELECT 
                MAX(`logged`) 
            FROM 
                `{$this->emergency}`
            WHERE 
                `host` = 'emergency line'
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);
        $row    = $result->fetch_row();

        return $row;
    }
    public function getEmergenciesList($limit = 10, $offset = 0, $from = 0, $to = 0)
    {
        $limit  = $this->mysql->real_escape_string($limit);
        $offset = $this->mysql->real_escape_string($offset);
        $from   = $this->mysql->real_escape_string($from);
        $to     = $this->mysql->real_escape_string($to);
        $where  = $this->returnFromToWhere($from, $to);
        $list   = [];
        $sql    = "
            SELECT
                *
            FROM 
                {$this->emergency}
            {$where}
            ORDER BY
                logged DESC
            LIMIT {$offset}, {$limit}
        ";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $list[] = $row;
        }

        return $list;
    }
    private function returnFromToWhere($from, $to)
    {
        $where = [];

        if ($from) {
            $where[] = "`logged` >= '{$from}'";
        }

        if ($to) {
            $where[] = "`logged` <= '{$to}'";
        }

        $where = implode(" AND ", $where);

        if ($where) {
            $where = "WHERE " . $where;
        }

        return $where;
    }
    public function getEmergenciesTotal($from, $to)
    {
        $total  = 0;
        $from   = $this->mysql->real_escape_string($from);
        $to     = $this->mysql->real_escape_string($to);
        $where  = $this->returnFromToWhere($from, $to);
        $sql    = "
            SELECT
                count(*) as cnt
            FROM 
                {$this->emergency}
            {$where}
        ";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $total = intval($row['cnt']);
        }

        return $total;
    }
    public function getEmergenciesRecord($id)
    {
        $id   = $this->mysql->real_escape_string($id);
        $list = [];

        $sql    = "
            SELECT
                *
            FROM 
                {$this->emergency} 
            WHERE
                `id` = '{$id}'
        ";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $list[] = $row;
        }

        return $list;
    }
    public function changeEmergenciesRecord($id, $author, $value, $type)
    {
        $id     = $this->mysql->real_escape_string($id);
        $author = $this->mysql->real_escape_string($author);
        $value  = $this->mysql->real_escape_string($value);
        $type   = $this->mysql->real_escape_string($type);

        $sql = "
            UPDATE 
                `{$this->emergency}`
            SET
                `author_{$type}` = '{$author}',
                `{$type}` = '{$value}',
                `updated_{$type}` = NOW()
            WHERE
                `id` = '{$id}'
        ";

        if ($this->mysql->query($sql) !== true) {
            http_response_code(404);
            die("Error saving data: " . $this->mysql->error);
        }
    }
    public function getLatestActions()
    {
        $list   = [];
        $sql    = "SELECT * FROM {$this->nagios_external_commands_log} WHERE `logged` > '". date('Y-m-d H:i:s', strtotime('-5 minutes')) ."' AND command != 're-check' ORDER BY logged DESC";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $key = md5($row['host'] . $row['service'] . $row['server']);

            if (!isset($list[$key])) {
                $list[$key] = $row;
            }
        }

        return $list;
    }
    public function getActionsByDate($dateFrom, $dateTo)
    {
        $dateTo   = $this->mysql->real_escape_string($dateTo);
        $dateFrom = $this->mysql->real_escape_string($dateFrom);

        $list   = [];
        $sql    = "
            SELECT 
                * 
            FROM 
                {$this->nagios_external_commands_log}
            WHERE 
                    `logged` > '{$dateFrom}' 
                AND
                    `logged` < '{$dateTo}'
                AND
                    `command` IN ('ack') 
            ORDER BY 
                `host`, `service`, `logged`
        ";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            if (!isset($list[$row['host']])) {
                $list[$row['host']] = [];
            }

            if (!isset($list[$row['host']][$row['service']])) {
                $list[$row['host']][$row['service']] = [];
            }

            $list[$row['host']][$row['service']][] = $row;
        }

        return $list;
    }
    public function logAction($data, $command, $server, $insertToDb = false, $saveDate = false) {
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
            $date = ($saveDate) ? 'DATE_ADD(CURRENT_TIMESTAMP(), interval -1 second)' : 'CURRENT_TIMESTAMP()';
            $sql = "
                INSERT INTO `{$this->nagios_external_commands_log}`
                    (`logged`, `host`, `service`, `command`, `author`, `comment`, `server`) 
                VALUES 
                    ({$date}, '{$host}', '{$service}', '{$command}', '{$author}', '{$comment}', '{$server}')
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

    public function insertToEmergencyTable($host, $service, $status, $info, $hash)
    {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $status  = $this->mysql->real_escape_string($status);
        $info    = $this->mysql->real_escape_string($info);
        $hash    = $this->mysql->real_escape_string($hash);

        if ($this->emergencyConfig) {
            $sql    = "
                INSERT INTO 
                    {$this->emergency}
                SET 
                    `logged`  = NOW(),
                    `updated` = NOW(),
                    `updated_investigation` = NOW(),
                    `id`      = '{$hash}',
                    `host`    = '{$host}',
                    `service` = '{$service}',
                    `history` = '{$status}',
                    `output`  = '{$info}'
                ON DUPLICATE KEY UPDATE history=concat(history, '|', VALUES(history))
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
    }
    public function importToEmergencyTable($logged, $id, $host, $service, $output, $link, $history)
    {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $logged  = $this->mysql->real_escape_string($logged);
        $output  = $this->mysql->real_escape_string($output);
        $id      = $this->mysql->real_escape_string($id);
        $link    = $this->mysql->real_escape_string($link);
        $history = $this->mysql->real_escape_string($history);

        if ($this->emergencyConfig) {
            $sql    = "
                INSERT INTO 
                    {$this->emergency}
                SET 
                    `logged`  = '{$logged}',
                    `updated` = NOW(),
                    `updated_investigation` = NOW(),
                    `id`      = '{$id}',
                    `host`    = '{$host}',
                    `service` = '{$service}',
                    `history` = '{$history}',
                    `output`  = '{$output}',
                    `link`    = '{$link}'
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
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
                `deleted` = CURRENT_TIMESTAMP(),
                `remove`  = 1
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
                `deleted` = CURRENT_TIMESTAMP(),
                `remove`  = 1
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
    public function returnOldPlanned()
    {
        $sql = "
            SELECT 
                * 
            FROM 
                `{$this->planned_log}` 
            WHERE 
                `remove` = 1
        ";

        $list   = [];
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $list[] = $row;
        }

        return $list;
    }
    public function removeOldPlanned($old)
    {
        foreach ($old as $item) {
            $host    = $this->mysql->real_escape_string($item['host']);
            $service = $this->mysql->real_escape_string($item['service']);
            $status  = $this->mysql->real_escape_string($item['status']);
            $server  = $this->mysql->real_escape_string($item['server']);

            $sql = "
                UPDATE
                    `{$this->planned_log}`
                SET 
                    `remove`  = 0
                WHERE
                    `host` = '{$host}'
                  AND
                    `service` = '{$service}'
                  AND
                    `status` = '{$status}'
                  AND
                    `server` = '{$server}'
                  AND
                    `remove` = 1
            ";

            $this->mysql->query($sql);
        }
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
        $where = (!$server || $server == 'All') ? "" : " WHERE `server` = '{$server}'";
        $sql = "SELECT * FROM `{$this->users_list}` {$where}";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[$row['name']] = $row['email'];
        }

        return $list;
    }
    public function returnUsersList() {
        $return = [];
        $list = $this->returnFullUsersList();

        foreach ($list as $item) {
            $return[$item['name']] = $item['email'];
        }

        return $return;
    }
    public function returnUsersListWithServer($server)
    {
        $return = [];
        $list = $this->returnFullUsersList();

        foreach ($list as $item) {
            if (in_array($server, $item['server'])) {
                $return[$item['name']] = $item['email'];
            }
        }

        return $return;
    }
    public function returnFullUsersList()
    {
        $list   = [];
        $sql    = "SELECT * FROM `{$this->users_list}` ORDER BY `name`";
        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        while ($row = $result->fetch_assoc()){
            $row['server'] = explode(',', $row['server']);
            $list[] = $row;
        }

        return $list;
    }
    public function saveUser($oldData, $newData, $superUser)
    {
        $newServer    = ($superUser) ? $newData['server']     : $oldData['server'];
        $newSuperUser = ($superUser) ? $newData['super_user'] : $oldData['super_user'];

        $newName      = $this->mysql->real_escape_string($newData['name']);
        $newEmail     = $this->mysql->real_escape_string($newData['email']);
        $newFullName  = $this->mysql->real_escape_string($newData['full_name']);
        $newServer    = $this->mysql->real_escape_string($newServer);
        $newSuperUser = $this->mysql->real_escape_string($newSuperUser);

        $oldName      = $this->mysql->real_escape_string($oldData['name']);
        $oldEmail     = $this->mysql->real_escape_string($oldData['email']);
        $oldFullName  = $this->mysql->real_escape_string($oldData['full_name']);
        $oldServer    = $this->mysql->real_escape_string($oldData['server']);
        $oldSuperUser = $this->mysql->real_escape_string($oldData['super_user']);

        if (!$newName || !$newEmail || !$newFullName) {
            http_response_code(404);
            die("Please fill: login, email, full name.");
        }

        $sql        = "
            UPDATE
                {$this->users_list}
            SET 
                `name`       = '{$newName}',
                `email`      = '{$newEmail}',
                `server`     = '{$newServer}',
                `full_name`  = '{$newFullName}',
                `super_user` = '{$newSuperUser}'
            WHERE
                    `name`       = '{$oldName}'
                AND
                    `email`      = '{$oldEmail}'
                AND
                    `server`     = '{$oldServer}'
                AND
                    `full_name`  = '{$oldFullName}'
                AND
                    `super_user` = '{$oldSuperUser}'
        ";

        if ($this->mysql->query($sql) !== true) {
            http_response_code(404);
            die("Error saving data: " . $this->mysql->error);
        }
    }
    public function deleteUser($oldData)
    {
        $oldName      = $this->mysql->real_escape_string($oldData['name']);
        $oldEmail     = $this->mysql->real_escape_string($oldData['email']);
        $oldFullName  = $this->mysql->real_escape_string($oldData['full_name']);
        $oldServer    = $this->mysql->real_escape_string($oldData['server']);
        $oldSuperUser = $this->mysql->real_escape_string($oldData['super_user']);

        $sql = "
            DELETE FROM
                {$this->users_list}
            WHERE
                    `name`       = '{$oldName}'
                AND
                    `email`      = '{$oldEmail}'
                AND
                    `server`     = '{$oldServer}'
                AND
                    `full_name`  = '{$oldFullName}'
                AND
                    `super_user` = '{$oldSuperUser}'
        ";

        if ($this->mysql->query($sql) !== true) {
            http_response_code(404);
            die("Error saving data: " . $this->mysql->error);
        }
    }
    public function insertUser($newData)
    {
        $newName      = $this->mysql->real_escape_string($newData['name']);
        $newEmail     = $this->mysql->real_escape_string($newData['email']);
        $newFullName  = $this->mysql->real_escape_string($newData['full_name']);
        $newServer    = $this->mysql->real_escape_string($newData['server']);
        $newSuperUser = $this->mysql->real_escape_string($newData['super_user']);

        if (!$newName || !$newEmail || !$newFullName) {
            http_response_code(404);
            die("Please fill: login, email, full name.");
        }

        $sql = "
            INSERT INTO 
                {$this->users_list}
            SET 
                `name`       = '{$newName}',
                `email`      = '{$newEmail}',
                `server`     = '{$newServer}',
                `full_name`  = '{$newFullName}',
                `super_user` = '{$newSuperUser}'
        ";

        if ($this->mysql->query($sql) !== true) {
            http_response_code(404);
            die("Error saving data: " . $this->mysql->error);
        }
    }
    public function usersListStatsPage() {
        $sql = "SELECT * FROM `{$this->users_list}`";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = ['All' => []];
        while ($row = $result->fetch_assoc()){
            $servers = explode(',', $row['server']);

            $list['All'][$row['name']] = $row['full_name'];

            foreach ($servers as $server) {
                if (!isset($list[$server])) {
                    $list[$server] = [];
                }

                $list[$server][$row['name']] = $row['full_name'];
            }
        }

        return $list;

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
    public function notesUrlsNagiosApi($server) {
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
            $host = $row['host'];
            $service = $row['service'];

            if (!$host || !$service) {
                continue;
            }

            if (!isset($list[$host])) {
                $list[$host] = [];
            }

            $list[$host][$row['service']] = $row['url'];
        }

        return $list;
    }
    public function insertNotesUrl($service_or_host, $url, $server) {
        $service_or_host = $this->mysql->real_escape_string($service_or_host);
        $url             = $this->mysql->real_escape_string($url);
        $server          = $this->mysql->real_escape_string($server);

        if ($service_or_host && $url && $server) {
            $sql = "
                INSERT INTO 
                    {$this->notes_urls}
                SET 
                    `service_or_host` = '{$service_or_host}',
                    `url`             = '{$url}',
                    `server`          = '{$server}',
                    `host`            = ' ',
                    `service`         = ' '
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
    }
    public function insertNotesUrlNagiosApi($host, $service, $url, $server) {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $url     = $this->mysql->real_escape_string($url);
        $server  = $this->mysql->real_escape_string($server);

        if ($host && $service && $url && $server) {
            $sql = "
                INSERT INTO 
                    {$this->notes_urls}
                SET 
                    `host`    = '{$host}',
                    `service` = '{$service}',
                    `url`     = '{$url}',
                    `server`  = '{$server}',
                    `service_or_host` = ' '
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
    }
    public function updateNotesUrl($service_or_host, $url, $server) {
        $service_or_host = $this->mysql->real_escape_string($service_or_host);
        $url             = $this->mysql->real_escape_string($url);
        $server          = $this->mysql->real_escape_string($server);

        if ($service_or_host && $url && $server) {
            $sql = "
                UPDATE
                    {$this->notes_urls}
                SET 
                    `url` = '{$url}'
                WHERE
                        `service_or_host` = '{$service_or_host}'
                    AND
                        `server` = '{$server}'
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
    }
    public function updateNotesUrlNagiosApi($host, $service, $url, $server) {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $url     = $this->mysql->real_escape_string($url);
        $server  = $this->mysql->real_escape_string($server);

        if ($host && $service && $url && $server) {
            $sql = "
                UPDATE
                    {$this->notes_urls}
                SET 
                    `url` = '{$url}'
                WHERE
                        `host` = '{$host}'
                    AND
                        `service` = '{$service}'
                    AND
                        `server` = '{$server}'
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
    }
    public function deleteNotesUrl($service_or_host, $url, $server) {
        $service_or_host = $this->mysql->real_escape_string($service_or_host);
        $url             = $this->mysql->real_escape_string($url);
        $server          = $this->mysql->real_escape_string($server);

        if ($service_or_host && $url && $server) {
            $sql = "
                DELETE FROM
                    {$this->notes_urls}
                WHERE
                        `service_or_host` = '{$service_or_host}'
                    AND
                        `server` = '{$server}'
                    AND
                        `url` = '{$url}'
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
    }
    public function deleteNotesUrlNagiosApi($host, $service, $url, $server) {
        $host    = $this->mysql->real_escape_string($host);
        $service = $this->mysql->real_escape_string($service);
        $url     = $this->mysql->real_escape_string($url);
        $server  = $this->mysql->real_escape_string($server);

        if ($host && $service && $url && $server) {
            $sql = "
                DELETE FROM
                    {$this->notes_urls}
                WHERE
                        `host` = '{$host}'
                    AND
                        `service` = '{$service}'
                    AND
                        `server` = '{$server}'
                    AND
                        `url` = '{$url}'
            ";

            if ($this->mysql->query($sql) !== true) {
                http_response_code(404);
                die("Error saving data: " . $this->mysql->error);
            }
        }
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
    public function historyGetUnfinishedAlertsForAggregatedStats()
    {
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
        ";

        $result = $this->mysql->query($sql, MYSQLI_USE_RESULT);

        $list = [];
        while ($row = $result->fetch_assoc()){
            $list[$row['host']][$row['service']] = $row;
            $list[$row['host']][$row['service']]['info'] = 0;

            $infoRecord = $this->returnInfoRecord($row['service'], $row['output']);
            if ($infoRecord['info']) {
                $list[$row['host']][$row['service']]['info'] = 1;
            }
        }

        return $list;
    }

    public function historyGetUnfinishedAlertsWithDate($server, $dateTo)
    {
        $server = $this->mysql->real_escape_string($server);
        $dateTo = $this->mysql->real_escape_string($dateTo);
        $users  = $this->returnUsersListWithServer($server);

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
