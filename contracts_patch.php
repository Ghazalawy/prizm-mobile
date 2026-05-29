    // ── Comments ───────────────────────────────────────────────
    /** GET /api/contracts/comments?contract_id= */
    public function comments_get() {
        $contract_id = $this->input->get('contract_id');
        if (!is_numeric($contract_id)) { $this->response(['status' => false, 'message' => 'Contract ID required'], 400); return; }
        $comments = $this->contracts_model->get_comments((int)$contract_id);
        $this->response(['status' => true, 'data' => $comments], 200);
    }
    /** POST /api/contracts/comments  Body: { "contract_id":N, "content":"..." } */
    public function comments_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $contract_id = $input['contract_id'] ?? $this->input->get('contract_id');
        if (!is_numeric($contract_id)) { $this->response(['status' => false, 'message' => 'Contract ID required'], 400); return; }
        $data = ['content' => $input['content'] ?? '', 'contract_id' => (int)$contract_id];
        $id = $this->contracts_model->add_comment($data);
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? 201 : 400);
    }
    /** DELETE /api/contracts/comments  Body: { "id":N } */
    public function comments_delete() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $id = $input['id'] ?? $this->input->get('id');
        if (!is_numeric($id)) { $this->response(['status' => false, 'message' => 'Comment ID required'], 400); return; }
        $r = $this->contracts_model->remove_comment((int)$id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }

    // ── Types ──────────────────────────────────────────────────
    /** GET /api/contracts/types?id= */
    public function types_get() {
        $id = $this->input->get('id');
        $types = $this->contracts_model->get_contract_types(is_numeric($id) ? (int)$id : '');
        $this->response(['status' => true, 'data' => $types], 200);
    }
    /** POST /api/contracts/types  Body: { "name":"..." } */
    public function types_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $id = $this->contracts_model->add_contract_type($input);
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? 201 : 400);
    }

    // ── Unsign ─────────────────────────────────────────────────
    /** POST /api/contracts/unsign  Body: { "id":N } */
    public function unsign_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $id = $input['id'] ?? $this->input->get('id');
        if (!is_numeric($id)) { $this->response(['status' => false, 'message' => 'Contract ID required'], 400); return; }
        $r = $this->contracts_model->clear_signature((int)$id);
        $this->response(['status' => true, 'data' => ['success' => $r]], $r ? 200 : 400);
    }

    // ── Notes ──────────────────────────────────────────────────
    /** GET /api/contracts/notes?contract_id= */
    public function notes_get() {
        $contract_id = $this->input->get('contract_id');
        if (!is_numeric($contract_id)) { $this->response(['status' => false, 'message' => 'Contract ID required'], 400); return; }
        $notes = $this->db->select('id,description,addedfrom,DATE_FORMAT(dateadded,"%Y-%m-%d %H:%i:%s") as dateadded')
            ->where('rel_id', (int)$contract_id)->where('rel_type', 'contract')
            ->order_by('dateadded', 'DESC')->get(db_prefix().'notes')->result_array();
        $this->response(['status' => true, 'data' => $notes], 200);
    }
    /** POST /api/contracts/notes  Body: { "contract_id":N, "description":"..." } */
    public function notes_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $contract_id = $input['contract_id'] ?? $this->input->get('contract_id');
        if (!is_numeric($contract_id)) { $this->response(['status' => false, 'message' => 'Contract ID required'], 400); return; }
        $this->db->insert(db_prefix().'notes', [
            'rel_id' => (int)$contract_id, 'rel_type' => 'contract',
            'description' => $input['description'] ?? '',
            'addedfrom' => get_staff_user_id(),
            'dateadded' => date('Y-m-d H:i:s'),
        ]);
        $id = $this->db->insert_id();
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? 201 : 400);
    }
