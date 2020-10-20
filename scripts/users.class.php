<?php

class users
{
    private $db;
    private $currentUser;
    private $usersList;
    private $serversList;

    function __construct()
    {
        global $serversList;
        global $db;

        $this->db          = $db;
        $this->currentUser = (isset($_GET['user']) && $_GET['user']) ? $_GET['user'] : '';
        $this->usersList   = $this->db->returnFullUsersList();
        $this->serversList = $serversList;
    }

    public function usersList()
    {
        $superUser = $this->isSuperUser();

        if ($superUser) {
            foreach ($this->usersList as &$item) {
                $item['admin_user'] = true;
            }
        }

        return [
            'users'   => $this->usersList,
            'servers' => array_keys($this->serversList),
        ];
    }
    private function isSuperUser()
    {
        foreach ($this->usersList as $item) {
            if ($this->currentUser && $item['name'] == $this->currentUser && $item['super_user']) {
                return true;
            }
        }

        return false;
    }

    public function saveUser()
    {
        $superUser = $this->isSuperUser();

        $oldData = [
            'name'       => $this->getPostData('oldData', 'name'),
            'email'      => $this->getPostData('oldData', 'email'),
            'full_name'  => $this->getPostData('oldData', 'full_name'),
            'server'     => $this->getPostData('oldData', 'server'),
            'super_user' => $this->getPostData('oldData', 'super_user'),
        ];

        $newData = [
            'name'       => $this->getPostData('newData', 'name'),
            'email'      => $this->getPostData('newData', 'email'),
            'full_name'  => $this->getPostData('newData', 'full_name'),
            'server'     => $this->getPostData('newData', 'server'),
            'super_user' => $this->getPostData('newData', 'super_user'),
        ];
        
        $this->db->saveUser($oldData, $newData, $superUser);

        return ['ok'];
    }
    public function insertUser()
    {
        $superUser = $this->isSuperUser();

        $newData = [
            'name'       => $this->getPostData('newData', 'name'),
            'email'      => $this->getPostData('newData', 'email'),
            'full_name'  => $this->getPostData('newData', 'full_name'),
            'server'     => $this->getPostData('newData', 'server'),
            'super_user' => $this->getPostData('newData', 'super_user'),
        ];

        if ($superUser) {
            $this->db->insertUser($newData);

            return ['ok'];
        }

        http_response_code(404);
        die("Error: you do not have rights to add user.");
    }
    public function deleteUser()
    {
        $superUser = $this->isSuperUser();

        $oldData = [
            'name'       => $this->getPostData('oldData', 'name'),
            'email'      => $this->getPostData('oldData', 'email'),
            'full_name'  => $this->getPostData('oldData', 'full_name'),
            'server'     => $this->getPostData('oldData', 'server'),
            'super_user' => $this->getPostData('oldData', 'super_user'),
        ];

        if ($superUser) {
            $this->db->deleteUser($oldData);

            return ['ok'];
        }

        http_response_code(404);
        die("Error: you do not have rights to delete user.");
    }
    private function getPostData($parent, $field)
    {
        return urldecode($_POST[$parent][$field]);
    }
}