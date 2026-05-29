    // ── Members ─────────────────────────────────────────────────
    /** GET/POST /api/projects/members?project_id=  */
    public function members_get() {
        $project_id = $this->input->get('project_id') ?? $this->uri->segment(4);
        if (!is_numeric($project_id)) { $this->response(['status' => false, 'message' => 'Project ID required'], 400); return; }
        $members = $this->projects_model->get_project_members((int)$project_id, true);
        $this->response(['status' => true, 'data' => $members], 200);
    }
    /** POST /api/projects/members  Body: { "project_id":N, "members": [staff_id, ...] } */
    public function members_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $project_id = $input['project_id'] ?? $this->input->get('project_id');
        if (!is_numeric($project_id)) { $this->response(['status' => false, 'message' => 'Project ID required'], 400); return; }
        $data = ['project_members' => $input['members'] ?? $input['project_members'] ?? []];
        $r = $this->projects_model->add_edit_members($data, (int)$project_id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }
    /** DELETE /api/projects/members  Body: { "project_id":N, "staff_id":N } */
    public function members_delete() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $project_id = $input['project_id'] ?? $this->input->get('project_id');
        $staff_id = $input['staff_id'] ?? $this->input->get('staff_id');
        if (!is_numeric($project_id) || !is_numeric($staff_id)) { $this->response(['status' => false, 'message' => 'Project ID and Staff ID required'], 400); return; }
        $r = $this->projects_model->remove_team_member((int)$project_id, (int)$staff_id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }

    // ── Discussions ────────────────────────────────────────────
    /** GET /api/projects/discussions?project_id= */
    public function discussions_get() {
        $project_id = $this->input->get('project_id') ?? $this->uri->segment(4);
        if (!is_numeric($project_id)) { $this->response(['status' => false, 'message' => 'Project ID required'], 400); return; }
        $rows = $this->projects_model->get_discussions((int)$project_id);
        $this->response(['status' => true, 'data' => $rows], 200);
    }
    /** POST /api/projects/discussions  Body: { "project_id":N, "subject":"...", "description":"..." } */
    public function discussions_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $project_id = $input['project_id'] ?? $this->input->get('project_id');
        if (!is_numeric($project_id)) { $this->response(['status' => false, 'message' => 'Project ID required'], 400); return; }
        $data = [
            'subject' => $input['subject'] ?? '',
            'description' => $input['description'] ?? '',
            'project_id' => (int)$project_id,
            'show_to_customer' => $input['show_to_customer'] ?? 0,
        ];
        $id = $this->projects_model->add_discussion($data);
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? 201 : 400);
    }

    // ── Notes ──────────────────────────────────────────────────
    /** GET /api/projects/notes?project_id= */
    public function notes_get() {
        $project_id = $this->input->get('project_id') ?? $this->uri->segment(4);
        if (!is_numeric($project_id)) { $this->response(['status' => false, 'message' => 'Project ID required'], 400); return; }
        $notes = $this->projects_model->get_staff_notes((int)$project_id);
        $this->response(['status' => true, 'data' => $notes], 200);
    }
    /** POST /api/projects/notes  Body: { "project_id":N, "content":"..." } */
    public function notes_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $project_id = $input['project_id'] ?? $this->input->get('project_id');
        if (!is_numeric($project_id)) { $this->response(['status' => false, 'message' => 'Project ID required'], 400); return; }
        $data = ['content' => $input['content'] ?? ''];
        $r = $this->projects_model->save_note($data, (int)$project_id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }

