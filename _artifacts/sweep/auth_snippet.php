        $this->load->helper('api/mobile_parity');
        $this->_require_staff();

    private function _require_staff()
    {
        $staff_id = function_exists('api_mobile_parity_real_staff_id')
            ? (int) api_mobile_parity_real_staff_id()
            : (int) get_staff_user_id();
        if (empty($staff_id)) {
            $this->response(['status' => false, 'message' => 'Authentication required'], 400);
            exit;
        }
    }
