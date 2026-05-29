    public function image_desc_post() {
        $image_id = $this->input->post('id');
        $desc = $this->input->post('description') ?? '';
        if (!is_numeric($image_id)) {
            $this->response(['status' => false, 'message' => 'Image ID required'], 400);
            return;
        }
        $r = $this->prizm_report_model->update_image_description((int)$image_id, $desc);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], 200);
    }
