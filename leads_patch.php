    // ── Notes ──────────────────────────────────────────────────
    /** GET /api/leads/notes?lead_id= */
    public function notes_get() {
        $lead_id = $this->input->get('lead_id');
        if (!is_numeric($lead_id)) { $this->response(['status' => false, 'message' => 'Lead ID required'], 400); return; }
        $this->load->model('leads_model');
        $notes = $this->db->select('id,description,addedfrom,DATE_FORMAT(dateadded,"%Y-%m-%d %H:%i:%s") as dateadded')
            ->where('rel_id', (int)$lead_id)->where('rel_type', 'lead')
            ->order_by('dateadded', 'DESC')->get(db_prefix().'notes')->result_array();
        $this->response(['status' => true, 'data' => $notes], 200);
    }
    /** POST /api/leads/notes  Body: { "lead_id":N, "description":"..." } */
    public function notes_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $lead_id = $input['lead_id'] ?? $this->input->get('lead_id');
        if (!is_numeric($lead_id)) { $this->response(['status' => false, 'message' => 'Lead ID required'], 400); return; }
        $this->db->insert(db_prefix().'notes', [
            'rel_id' => (int)$lead_id, 'rel_type' => 'lead',
            'description' => $input['description'] ?? '',
            'addedfrom' => get_staff_user_id(),
            'dateadded' => date('Y-m-d H:i:s'),
        ]);
        $id = $this->db->insert_id();
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? 201 : 400);
    }

    // ── Statuses ───────────────────────────────────────────────
    /** GET /api/leads/statuses */
    public function statuses_get() {
        $this->load->model('leads_model');
        $statuses = $this->leads_model->get_status();
        $this->response(['status' => true, 'data' => $statuses], 200);
    }

    // ── Sources ────────────────────────────────────────────────
    /** GET /api/leads/sources */
    public function sources_get() {
        $this->load->model('leads_model');
        $sources = $this->leads_model->get_source();
        $this->response(['status' => true, 'data' => $sources], 200);
    }
