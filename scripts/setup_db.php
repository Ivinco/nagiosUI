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
                `logged`  TIMESTAMP    NOT NULL DEFAULT '1970-01-01 00:00:01',
                `host`    VARCHAR(255) NOT NULL,
                `service` VARCHAR(255) NOT NULL,
                `command` ENUM('ack', 'sched', 're-check', 'planned', 'unack', 'unsched') DEFAULT NULL,
                `author`  VARCHAR(255) NOT NULL,
                `comment` VARCHAR(255) NOT NULL,
                `server`  VARCHAR(255) NOT NULL,
                INDEX (`logged`),
                INDEX (`command`),
                INDEX (`comment`),
                INDEX (`host`),
                INDEX (`service`)
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
                `logged`  TIMESTAMP     NOT NULL DEFAULT '1970-01-01 00:00:01',
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
                `deleted` TIMESTAMP     NOT NULL DEFAULT '1970-01-01 00:00:01',
                `remove`  TINYINT       NOT NULL DEFAULT 0,
                INDEX (`server`),
                INDEX (`end`),
                INDEX (`enabled`),
                INDEX (`remove`),
                INDEX (`host`),
                INDEX (`service`),
                INDEX (`status`),
                INDEX (`time`),
                INDEX (`date`)
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
                INDEX (`server`)
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
                INDEX (`full_access`),
                INDEX (`server`)
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
                INDEX (`server`)
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
                INDEX (`server`),
                INDEX (`url`)
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
                INDEX (`server`),
                INDEX (`host`),
                INDEX (`service`)
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
                `date`     DATETIME NOT NULL DEFAULT '1970-01-01 00:00:01',
                `check_id` INT UNSIGNED NOT NULL,
                `severity` ENUM('unhandled','quick_acked','acked','sched','planned_downtime') NOT NULL,
                `state`    ENUM('ok','warning','critical','unknown') NOT NULL,
                `user`     VARCHAR(255),
                `comment`  TEXT,
                `output`   VARCHAR(1024) NOT NULL,
                PRIMARY KEY (`date`, `check_id`),
                INDEX (`state`),
                INDEX (`severity`)
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
                `logged`                TIMESTAMP    NOT NULL DEFAULT '1970-01-01 00:00:01',
                `id`                    CHAR(32)     NOT NULL DEFAULT '',
                `host`                  VARCHAR(255) NOT NULL,
                `service`               VARCHAR(255) NOT NULL,
                `history`               BLOB,
                `updated`               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `investigation`         TEXT,
                `output`                TEXT,
                `updated_investigation` TIMESTAMP    NOT NULL DEFAULT '1970-01-01 00:00:01',
                `prevention`            TEXT,
                `updated_prevention`    TIMESTAMP    NULL     DEFAULT NULL,
                `author_prevention`     VARCHAR(255)          DEFAULT NULL,
                `author_investigation`  VARCHAR(255)          DEFAULT NULL,
                `author`                VARCHAR(255)          DEFAULT NULL,
                `link`                  TEXT,
                PRIMARY KEY (`id`),
                INDEX (`logged`),
                INDEX (`host`)
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
                `logged`             TIMESTAMP          NOT NULL DEFAULT '1970-01-01 00:00:01',
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
        $nagios_external_commands_log_alter = "
            ALTER TABLE {$this->nagios_external_commands_log}
            CHANGE `command` `command` ENUM('ack', 'sched', 're-check', 'planned', 'unack', 'unsched') NULL DEFAULT NULL,
            CHANGE `logged` `logged` TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:01',
            ADD INDEX (`logged`),
            ADD INDEX (`command`),
            ADD INDEX (`comment`),
            ADD INDEX (`host`),
            ADD INDEX (`service`);
        ";
        $this->mysql->query($nagios_external_commands_log_alter);
    }
    private function alterPlannedLogTable()
    {
        $planned_log_alter = "
            ALTER TABLE {$this->planned_log}
            ADD COLUMN `enabled`     TINYINT    NOT NULL DEFAULT 1, 
            ADD COLUMN `deleted`     TIMESTAMP  NOT NULL DEFAULT '1970-01-01 00:00:01',
            ADD COLUMN `remove`      TINYINT    NOT NULL DEFAULT 0,
            CHANGE `logged` `logged` TIMESTAMP  NOT NULL DEFAULT '1970-01-01 00:00:01',
            ADD INDEX (`server`),
            ADD INDEX (`end`),
            ADD INDEX (`enabled`),
            ADD INDEX (`remove`),
            ADD INDEX (`host`),
            ADD INDEX (`service`),
            ADD INDEX (`status`),
            ADD INDEX (`time`),
            ADD INDEX (`date`);
        ";
        $this->mysql->query($planned_log_alter);
    }
    private function alterPlannedTemplatesTable()
    {
        $planned_templates = "
            ALTER TABLE {$this->planned_templates}
            ADD INDEX (`server`);
        ";
        $this->mysql->query($planned_templates);
    }
    private function alterUsersListTable()
    {
        $users_list_alter = "
            ALTER TABLE {$this->users_list}
            ADD COLUMN `full_access` TINYINT      DEFAULT 0 NOT NULL,
            ADD COLUMN `full_name`   VARCHAR(255)           NOT NULL,
            ADD COLUMN `super_user`  TINYINT      DEFAULT 0 NOT NULL,
            ADD INDEX (`full_access`),
            ADD INDEX (`server`);
        ";
        $this->mysql->query($users_list_alter);
    }
    private function alterAccessListTable()
    {
        $access_list = "
            ALTER TABLE {$this->access_list}
            ADD INDEX (`server`);
        ";
        $this->mysql->query($access_list);
    }
    private function alterNotesUrlsTable()
    {
        $notes_urls_alter = "
            ALTER TABLE {$this->notes_urls}
            ADD COLUMN `host`         VARCHAR(255) NOT NULL,
            ADD COLUMN `service`      VARCHAR(255) NOT NULL,
            ADD CONSTRAINT `hostServiceServer` UNIQUE (`host`, `service`, `server`),
            ADD INDEX (`server`),
            ADD INDEX (`url`);
        ";
        $this->mysql->query($notes_urls_alter);
    }
    private function alterChecksTable()
    {
        $checks = "
            ALTER TABLE {$this->checks}
            ADD INDEX (`server`),
            ADD INDEX (`host`),
            ADD INDEX (`service`);
        ";
        $this->mysql->query($checks);
    }
    private function alterHistoryTable()
    {
        $history_alter = "
            ALTER TABLE {$this->history}
            CHANGE `output` `output` VARCHAR(1024) NOT NULL,
            CHANGE `date`   `date`   DATETIME NOT NULL DEFAULT '1970-01-01 00:00:01',
            ADD INDEX (`state`),
            ADD INDEX (`severity`);
            ;
        ";
        $this->mysql->query($history_alter);
    }
    private function alterEmergencyTable()
    {
        $emergency = "
            ALTER TABLE {$this->emergency}
            CHANGE `logged`                `logged`                TIMESTAMP    NOT NULL DEFAULT '1970-01-01 00:00:01',
            CHANGE `updated_investigation` `updated_investigation` TIMESTAMP    NOT NULL DEFAULT '1970-01-01 00:00:01',
            ADD INDEX (`logged`),
            ADD INDEX (`host`);
        ";
        $this->mysql->query($emergency);
    }
    private function alterStatsTable()
    {
        $stats = "
            ALTER TABLE {$this->stats}
            CHANGE `logged` `logged` TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:01';
        ";
        $this->mysql->query($stats);
    }
}