    // ── Contacts ───────────────────────────────────────────────
    /** GET /api/customers/contacts?customer_id= */
    public function contacts_get() {
        $customer_id = $this->input->get('customer_id');
        if (!is_numeric($customer_id)) { $this->response(['status' => false, 'message' => 'Customer ID required'], 400); return; }
        $contacts = $this->clients_model->get_contacts((int)$customer_id);
        $this->response(['status' => true, 'data' => $contacts], 200);
    }
    /** POST /api/customers/contacts  Body: { "customer_id":N, "firstname":"...", "lastname":"...", "email":"...", ... } */
    public function contacts_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $customer_id = $input['customer_id'] ?? $this->input->get('customer_id');
        if (!is_numeric($customer_id)) { $this->response(['status' => false, 'message' => 'Customer ID required'], 400); return; }
        unset($input['customer_id']);
        $id = $this->clients_model->add_contact($input, (int)$customer_id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? 201 : 400);
    }
    /** PUT /api/customers/contacts  Body: { "id":N, "firstname":"...", ... } */
    public function contacts_put() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $id = $input['id'] ?? $this->input->get('id');
        if (!is_numeric($id)) { $this->response(['status' => false, 'message' => 'Contact ID required'], 400); return; }
        unset($input['id']);
        $r = $this->clients_model->update_contact($input, (int)$id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }
    /** DELETE /api/customers/contacts  Body: { "id":N } */
    public function contacts_delete() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $id = $input['id'] ?? $this->input->get('id');
        if (!is_numeric($id)) { $this->response(['status' => false, 'message' => 'Contact ID required'], 400); return; }
        $r = $this->clients_model->delete_contact((int)$id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }

    // ── Groups ─────────────────────────────────────────────────
    /** GET /api/customers/groups?id= */
    public function groups_get() {
        $id = $this->input->get('id');
        $rows = is_numeric($id) ? $this->clients_model->get_groups((int)$id) : $this->clients_model->get_groups();
        $this->response(['status' => true, 'data' => $rows], 200);
    }
    /** POST /api/customers/groups  Body: { "name":"..." } */
    public function groups_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $id = $this->clients_model->add_group($input);
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? 201 : 400);
    }
    /** PUT /api/customers/groups  Body: { "id":N, "name":"..." } */
    public function groups_put() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $r = $this->clients_model->edit_group($input);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }

    // ── Admins ─────────────────────────────────────────────────
    /** GET /api/customers/admins?customer_id= */
    public function admins_get() {
        $customer_id = $this->input->get('customer_id');
        if (!is_numeric($customer_id)) { $this->response(['status' => false, 'message' => 'Customer ID required'], 400); return; }
        $admins = $this->clients_model->get_admins((int)$customer_id);
        $this->response(['status' => true, 'data' => $admins], 200);
    }
    /** POST /api/customers/admins  Body: { "customer_id":N, "admins": [staff_id, ...] } */
    public function admins_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $customer_id = $input['customer_id'] ?? $this->input->get('customer_id');
        if (!is_numeric($customer_id)) { $this->response(['status' => false, 'message' => 'Customer ID required'], 400); return; }
        $r = $this->clients_model->assign_admins($input, (int)$customer_id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }

    // ── Billing/Shipping ──────────────────────────────────────
    /** GET /api/customers/billing_shipping?customer_id= */
    public function billing_shipping_get() {
        $customer_id = $this->input->get('customer_id');
        if (!is_numeric($customer_id)) { $this->response(['status' => false, 'message' => 'Customer ID required'], 400); return; }
        $data = $this->clients_model->get_customer_billing_and_shipping_details((int)$customer_id);
        $this->response(['status' => true, 'data' => $data], 200);
    }
