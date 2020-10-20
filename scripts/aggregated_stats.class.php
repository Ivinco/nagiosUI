<?php

class aggregatedStats
{
    private $stats = [
        'criticalUnhandled' => 0,
        'warningUnhandled'  => 0,
        'unknownUnhandled'  => 0,
        'acked'             => 0,
        'sched'             => 0,
        'criticalLongest'   => 0,
        'warningLongest'    => 0,
        'unknownLongest'    => 0,
    ];

    function __construct()
    {
        global $db;

        $this->db = $db;
    }

    public function run()
    {
        $alerts = $this->db->historyGetUnfinishedAlertsForAggregatedStats();
        foreach ($alerts as $host => $services) {
            foreach ($services as $alert) {
                if ($alert['info']) {
                    continue;
                }

                if ($alert['severity'] == 'acked') {
                    $this->stats['acked']++;
                }

                if (in_array($alert['severity'],  ['sched', 'planned_downtime'])) {
                    $this->stats['sched']++;
                }

                if ($alert['severity'] == 'unhandled' && in_array($alert['state'], ['warning', 'critical', 'unknown'])) {
                    $this->stats[$alert['state'] . "Unhandled"]++;

                    $diff = $this->getTimeDiffInSeconds($alert['date']);

                    if ($diff > $this->stats[$alert['state'] . "Longest"]) {
                        $this->stats[$alert['state'] . "Longest"] = $diff;
                    }
                }
            }
        }

        $this->db->insertIntoStatsTable($this->stats);
    }

    private function getTimeDiffInSeconds($date)
    {
        return time() - strtotime($date);
    }
}
