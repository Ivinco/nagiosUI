<?php

include_once __DIR__ . '/init.php';

logText("DB setup started.");
new SetupDB();
logText("DB setup finished.");

class SetupDB
{
    private $mysql;

    function __construct()
    {
        global $database;

        $this->database = $database;
        $this->dbName   = $database['db'];
        $this->dbPrefix = $database['prefix'];

        $this->connect();
        $this->createDB();
        $this->setTableNames();
        $this->createTables();
        $this->alteringTables();
    }

    private function connect()
    {
        $this->mysql = new mysqli($this->database['host'], $this->database['user'], $this->database['pass'], '', $this->database['port']);

        if ($this->mysql->connect_errno) {
            printf("Connect failed: %s\n", $this->mysql->connect_error);
            exit();
        }
    }
    private function createDB()
    {
        if (!$this->mysql->select_db($this->dbName)) {
            if (!$this->mysql->query("CREATE DATABASE IF NOT EXISTS ". $this->dbName)) {
                logText("CREATE DATABASE IF NOT EXISTS ". $this->dbName);
                logText("Couldn't create database (". $this->dbName ."): " . $this->mysql->error);
                exit();
            }

            logText("Database ". $this->dbName ." created");
            $this->mysql->select_db($this->dbName);
            return;
        }

        logText("Database ". $this->dbName ." already exists.");
    }
    private function setTableNames()
    {
        $this->nagios_external_commands_log = $this->dbPrefix . "nagios_external_commands_log";
        $this->planned_log                  = $this->dbPrefix . "planned_log";
        $this->planned_templates            = $this->dbPrefix . "planned_templates";
        $this->users_list                   = $this->dbPrefix . "users_list";
        $this->access_list                  = $this->dbPrefix . "access_list";
        $this->notes_urls                   = $this->dbPrefix . "notes_urls";
        $this->checks                       = $this->dbPrefix . "checks";
        $this->history                      = $this->dbPrefix . "history";
        $this->emergency                    = $this->dbPrefix . "emergency";
        $this->stats                        = $this->dbPrefix . "stats";
    }
    private function createTables()
    {
        logText("Creating tables");
        $this->createNagiosExternalLogTable();
        $this->createPlannedLogTable();
        $this->createPlannedTemplatesTable();
        $this->createUsersListTable();
        $this->createAccessListTable();
        $this->createNotesUrlsTable();
        $this->createChecksTable();
        $this->createHistoryTable();
        $this->createEmergencyTable();
        $this->createStatsTable();
    }
    private function createNagiosExternalLogTable()
    {
        $nagios_external_commands_log = "
            CREATE TABLE IF NOT EXISTS `". $this->nagios_external_commands_log ."` (
                `logged`  TIMESTAMP    NOT NULL DEFAULT '1970-01-01 08:00:00',
                `host`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                `command` ENUM('ack', 'sched', 're-check', 'planned', 'unack', 'unsched') DEFAULT NULL,
                `author`  VARCHAR(255) NOT NULL,
                `comment` VARCHAR(255) NOT NULL,
                `server`  VARCHAR(255) NOT NULL,
                INDEX `logged_index`  (`logged`),
                INDEX `command_index` (`command`),
                INDEX `comment_index` (`comment`),
                INDEX `host_index`    (`host`),
                INDEX `service_index` (`service`)
            )
        ";
        if ($this->mysql->query($nagios_external_commands_log) !== true) {
            echo "Error creating table ({$this->nagios_external_commands_log}): " . $this->mysql->error;
            exit();
        }
    }
    private function createPlannedLogTable()
    {
        $planned_log = "
            CREATE TABLE IF NOT EXISTS `". $this->planned_log ."` (
                `logged`  TIMESTAMP     NOT NULL DEFAULT '1970-01-01 08:00:00',
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
                `deleted` TIMESTAMP     NOT NULL DEFAULT '1970-01-01 08:00:00',
                `remove`  TINYINT       NOT NULL DEFAULT 0,
                INDEX `server_index`  (`server`),
                INDEX `end_index`     (`end`),
                INDEX `enabled_index` (`enabled`),
                INDEX `remove_index`  (`remove`),
                INDEX `host_index`    (`host`),
                INDEX `service_index` (`service`),
                INDEX `status_index`  (`status`),
                INDEX `time_index`    (`time`),
                INDEX `date_index`    (`date`)
            )
        ";
        if ($this->mysql->query($planned_log) !== true) {
            echo "Error creating table ({$this->planned_log}): " . $this->mysql->error;
            exit();
        }
    }
    private function createPlannedTemplatesTable()
    {
        $planned_templates = "
            CREATE TABLE IF NOT EXISTS `". $this->planned_templates ."` (
                `name`    VARCHAR(255) NOT NULL,
                `host`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                `status`  VARCHAR(255) NOT NULL,
                `time`    INT          NOT NULL,
                `comment` VARCHAR(255) NOT NULL,
                `normal`  INT          NOT NULL,
                `server`  VARCHAR(255) NOT NULL,
                INDEX `server_index` (`server`)
            )
        ";
        if ($this->mysql->query($planned_templates) !== true) {
            echo "Error creating table ({$this->planned_templates}): " . $this->mysql->error;
            exit();
        }
    }
    private function createUsersListTable()
    {
        $users_list = "
            CREATE TABLE IF NOT EXISTS `". $this->users_list ."` (
                `name`   VARCHAR(255) NOT NULL,
                `email`  VARCHAR(255) NOT NULL,
                `server` VARCHAR(255) NOT NULL,
                `full_name`   VARCHAR(255) NOT NULL,
                `full_access` TINYINT DEFAULT 0 NOT NULL,
                `super_user` TINYINT DEFAULT 0 NOT NULL,
                INDEX `full_access_index` (`full_access`),
                INDEX `server_index`      (`server`)
            )
        ";
        if ($this->mysql->query($users_list) !== true) {
            echo "Error creating table ({$this->users_list}): " . $this->mysql->error;
            exit();
        }
    }
    private function createAccessListTable()
    {
        $access_list = "
            CREATE TABLE IF NOT EXISTS `". $this->access_list ."` (
                `user`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                `server`  VARCHAR(255) NOT NULL,
                INDEX `server_index` (`server`)
            )
        ";
        if ($this->mysql->query($access_list) !== true) {
            echo "Error creating table ({$this->access_list}): " . $this->mysql->error;
            exit();
        }
    }
    private function createNotesUrlsTable()
    {
        $notes_urls = "
            CREATE TABLE IF NOT EXISTS `". $this->notes_urls ."` (
                `service_or_host` VARCHAR(255) NOT NULL,
                `host`         VARCHAR(255) NOT NULL,
                `service`      VARCHAR(255) NOT NULL,
                `url`          VARCHAR(255) NOT NULL,
                `server`       VARCHAR(255) NOT NULL,
                CONSTRAINT `hostServiceServer`
                UNIQUE (`host`, `service`, `server`),
                INDEX `server_index` (`server`),
                INDEX `url_index`    (`url`)
            )
        ";
        if ($this->mysql->query($notes_urls) !== true) {
            echo "Error creating table ({$this->notes_urls}): " . $this->mysql->error;
            exit();
        }
    }
    private function createChecksTable()
    {
        $checks = "
            CREATE TABLE IF NOT EXISTS `". $this->checks ."` (
                `id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `server`  VARCHAR(255) NOT NULL,
                `host`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                PRIMARY KEY (`id`),
                INDEX `server_index`  (`server`),
                INDEX `host_index`    (`host`),
                INDEX `service_index` (`service`)
            )
        ";
        if ($this->mysql->query($checks) !== true) {
            echo "Error creating table ({$this->checks}): " . $this->mysql->error;
            exit();
        }
    }
    private function createHistoryTable()
    {
        $history = "
            CREATE TABLE IF NOT EXISTS `". $this->history ."` (
                `date`     DATETIME NOT NULL DEFAULT '1970-01-01 08:00:00',
                `check_id` INT UNSIGNED NOT NULL,
                `severity` ENUM('unhandled','quick_acked','acked','sched','planned_downtime') NOT NULL,
                `state`    ENUM('ok','warning','critical','unknown') NOT NULL,
                `user`     VARCHAR(255),
                `comment`  TEXT,
                `output`   VARCHAR(1024) NOT NULL,
                `handled`  VARCHAR(1024),
                PRIMARY KEY (`date`, `check_id`),
                INDEX `state_index`    (`state`),
                INDEX `severity_index` (`severity`)
            )
        ";
        if ($this->mysql->query($history) !== true) {
            echo "Error creating table ({$this->history}): " . $this->mysql->error;
            exit();
        }
    }
    private function createEmergencyTable()
    {
        $emergency = "
            CREATE TABLE IF NOT EXISTS `". $this->emergency ."` (
                `logged`                TIMESTAMP    NOT NULL DEFAULT '1970-01-01 08:00:00',
                `id`                    CHAR(32)     NOT NULL DEFAULT '',
                `host`                  VARCHAR(255) NOT NULL,
                `service`               VARCHAR(255) NOT NULL,
                `history`               BLOB,
                `updated`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `investigation`         TEXT,
                `output`                TEXT,
                `updated_investigation` TIMESTAMP    NOT NULL DEFAULT '1970-01-01 08:00:00',
                `prevention`            TEXT,
                `updated_prevention`    TIMESTAMP    NULL     DEFAULT NULL,
                `author_prevention`     VARCHAR(255)          DEFAULT NULL,
                `author_investigation`  VARCHAR(255)          DEFAULT NULL,
                `author`                VARCHAR(255)          DEFAULT NULL,
                `link`                  TEXT,
                PRIMARY KEY (`id`),
                INDEX `logged_index` (`logged`),
                INDEX `host_index`   (`host`)
            )
        ";
        if ($this->mysql->query($emergency) !== true) {
            echo "Error creating table ({$this->emergency}): " . $this->mysql->error;
            exit();
        }
    }
    private function createStatsTable()
    {
        $stats = "
            CREATE TABLE IF NOT EXISTS `". $this->stats ."` (
                `logged`             TIMESTAMP          NOT NULL DEFAULT '1970-01-01 08:00:00',
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
            echo "Error creating table ({$this->stats}): " . $this->mysql->error;
            exit();
        }
    }

    private function alteringTables()
    {
        logText("Altering tables");
        $this->alterNagiosExternalLogTable();
        $this->alterPlannedLogTable();
        $this->alterPlannedTemplatesTable();
        $this->alterUsersListTable();
        $this->alterAccessListTable();
        $this->alterNotesUrlsTable();
        $this->alterChecksTable();
        $this->alterHistoryTable();
        $this->alterEmergencyTable();
        $this->alterStatsTable();
    }

    private function alterNagiosExternalLogTable()
    {
        $this->mysql->query("ALTER TABLE {$this->nagios_external_commands_log} CHANGE `command` `command` ENUM('ack', 'sched', 're-check', 'planned', 'unack', 'unsched') NULL DEFAULT NULL;");
        $this->mysql->query("ALTER TABLE {$this->nagios_external_commands_log} CHANGE `logged` `logged` TIMESTAMP NOT NULL DEFAULT '1970-01-01 08:00:00';");
        $this->mysql->query("ALTER TABLE {$this->nagios_external_commands_log} ADD INDEX `logged_index`  (`logged`);");
        $this->mysql->query("ALTER TABLE {$this->nagios_external_commands_log} ADD INDEX `command_index` (`command`);");
        $this->mysql->query("ALTER TABLE {$this->nagios_external_commands_log} ADD INDEX `comment_index` (`comment`);");
        $this->mysql->query("ALTER TABLE {$this->nagios_external_commands_log} ADD INDEX `host_index`    (`host`)");
        $this->mysql->query("ALTER TABLE {$this->nagios_external_commands_log} ADD INDEX `service_index` (`service`);");
    }
    private function alterPlannedLogTable()
    {
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD COLUMN `enabled`       TINYINT    NOT NULL DEFAULT 1");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD COLUMN `deleted`       TIMESTAMP  NOT NULL DEFAULT '1970-01-01 08:00:00'");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD COLUMN `remove`        TINYINT    NOT NULL DEFAULT 0,");
        $this->mysql->query("ALTER TABLE {$this->planned_log} CHANGE `logged`  `logged`  TIMESTAMP  NOT NULL DEFAULT '1970-01-01 08:00:00';");
        $this->mysql->query("ALTER TABLE {$this->planned_log} CHANGE `deleted` `deleted` TIMESTAMP  NOT NULL DEFAULT '1970-01-01 08:00:00';");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `server_index`  (`server`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `end_index`     (`end`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `enabled_index` (`enabled`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `remove_index`  (`remove`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `host_index`    (`host`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `service_index` (`service`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `status_index`  (`status`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `time_index`    (`time`);");
        $this->mysql->query("ALTER TABLE {$this->planned_log} ADD INDEX `date_index`    (`date`);");
    }
    private function alterPlannedTemplatesTable()
    {
        $this->mysql->query("ALTER TABLE {$this->planned_templates} ADD INDEX `server_index` (`server`);");
    }
    private function alterUsersListTable()
    {
        $this->mysql->query("ALTER TABLE {$this->users_list} ADD COLUMN `full_access` TINYINT      DEFAULT 0 NOT NULL;");
        $this->mysql->query("ALTER TABLE {$this->users_list} ADD COLUMN `full_name`   VARCHAR(255)           NOT NULL;");
        $this->mysql->query("ALTER TABLE {$this->users_list} ADD COLUMN `super_user`  TINYINT      DEFAULT 0 NOT NULL;");
        $this->mysql->query("ALTER TABLE {$this->users_list} ADD INDEX `full_access_index` (`full_access`)");
        $this->mysql->query("ALTER TABLE {$this->users_list} ADD INDEX `server_index`      (`server`);");
    }
    private function alterAccessListTable()
    {
        $this->mysql->query("ALTER TABLE {$this->access_list} ADD INDEX `server_index` (`server`);");
    }
    private function alterNotesUrlsTable()
    {
        $this->mysql->query("ALTER TABLE {$this->notes_urls} ADD COLUMN `host`         VARCHAR(255) NOT NULL;");
        $this->mysql->query("ALTER TABLE {$this->notes_urls} ADD COLUMN `service`      VARCHAR(255) NOT NULL;");
        $this->mysql->query("ALTER TABLE {$this->notes_urls} ADD CONSTRAINT `hostServiceServer` UNIQUE (`host`, `service`, `server`);");
        $this->mysql->query("ALTER TABLE {$this->notes_urls} ADD INDEX `server_index` (`server`);");
        $this->mysql->query("ALTER TABLE {$this->notes_urls} ADD INDEX `url_index`    (`url`)''");
    }
    private function alterChecksTable()
    {
        $this->mysql->query("ALTER TABLE {$this->checks} ADD INDEX `server_index`  (`server`);");
        $this->mysql->query("ALTER TABLE {$this->checks} ADD INDEX `host_index`    (`host`);");
        $this->mysql->query("ALTER TABLE {$this->checks} ADD INDEX `service_index` (`service`);");
    }
    private function alterHistoryTable()
    {
        $this->mysql->query("ALTER TABLE {$this->history} CHANGE `output` `output` VARCHAR(1024) NOT NULL;");
        $this->mysql->query("ALTER TABLE {$this->history} CHANGE `date`   `date`   DATETIME NOT NULL DEFAULT '1970-01-01 08:00:00';");
        $this->mysql->query("ALTER TABLE {$this->history} ADD INDEX `state_index`    (`state`);");
        $this->mysql->query("ALTER TABLE {$this->history} ADD INDEX `severity_index` (`severity`);");
        $this->mysql->query("ALTER TABLE {$this->history} ADD COLUMN `handled`     VARCHAR(1024);");
    }
    private function alterEmergencyTable()
    {
        $this->mysql->query("ALTER TABLE {$this->emergency} CHANGE `logged` `logged` TIMESTAMP NOT NULL DEFAULT '1970-01-01 08:00:00';");
        $this->mysql->query("ALTER TABLE {$this->emergency} CHANGE `updated_investigation` `updated_investigation` TIMESTAMP NOT NULL DEFAULT '1970-01-01 08:00:00';");
        $this->mysql->query("ALTER TABLE {$this->emergency} ADD INDEX `logged_index` (`logged`);");
        $this->mysql->query("ALTER TABLE {$this->emergency} ADD INDEX `host_index` (`host`);");
    }
    private function alterStatsTable()
    {
        $this->mysql->query("ALTER TABLE {$this->stats} CHANGE `logged` `logged` TIMESTAMP NOT NULL DEFAULT '1970-01-01 08:00:00';");
    }
}