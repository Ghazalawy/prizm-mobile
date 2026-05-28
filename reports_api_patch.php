<?php
defined('BASEPATH') or exit('No direct script access allowed');
require_once __DIR__ . '/REST_Controller.php';

class Reports_api extends REST_Controller
{
    public function __construct() {
        parent::__construct();
        $this->load->model('prizm_reports/prizm_report_model');
        $this->load->helper('api/api_auth');
        $this->load->helper('api/mobile_parity');
        $this->_require_staff();
    }

    // ── JWT fallback for get_staff_user_id() ──────────────────
    private function _real_staff_id()
    {
        if (function_exists('api_mobile_parity_real_staff_id')) {
            $id = (int) api_mobile_parity_real_staff_id();
            if ($id > 0) return $id;
        }
        try {
            $token_data = $this->authorization_token->validateToken();
            if (!empty($token_data['status']) && !empty($token_data['data']->user)) {
                $email = $token_data['data']->user;
                $staff = $this->db
                    ->select('staffid')
                    ->from(db_prefix() . 'staff')
                    ->where('email', $email)
                    ->limit(1)
                    ->get()->row();
                $this->db->reset_query();
                if ($staff && !empty($staff->staffid)) {
                    return (int) $staff->staffid;
                }
            }
        } catch (\Throwable $e) {}
        if (function_exists('get_staff_user_id')) {
            return (int) get_staff_user_id();
        }
        return 0;
    }

    public function get_staff_user_id()
    {
        return $this->_real_staff_id();
    }

    // ── _remap: handle {id} segments ─────────────────────────
    public function _remap($object_called, $arguments = [])
    {
        // data/71 → data_{method}(71)
        if ($object_called === 'data' && !empty($arguments) && is_numeric($arguments[0])) {
            $id = array_shift($arguments);
            $method = 'data_' . $this->request->method;
            if (method_exists($this, $method)) {
                call_user_func_array([$this, $method], [$id]);
                return;
            }
        }
        // images/71 → images_{method}(71)
        if ($object_called === 'images' && !empty($arguments) && is_numeric($arguments[0])) {
            $id_param = array_shift($arguments);
            $method = 'images_' . $this->request->method;
            if (method_exists($this, $method)) {
                call_user_func_array([$this, $method], [$id_param]);
                return;
            }
        }
        // image_description/71 → image_description_{method}(71)
        if ($object_called === 'image_description' && !empty($arguments) && is_numeric($arguments[0])) {
            $img_id = array_shift($arguments);
            $method = 'image_description_' . $this->request->method;
            if (method_exists($this, $method)) {
                call_user_func_array([$this, $method], [$img_id]);
                return;
            }
        }
        parent::_remap($object_called, $arguments);
    }

    private function _require_staff()
    {
        $staff_id = $this->_real_staff_id();
        if (empty($staff_id)) {
            $this->response([
                'status' => false,
                'message' => 'Authentication required'
            ], self::HTTP_UNAUTHORIZED);
            exit;
        }
    }

    // ── data endpoints ────────────────────────────────────────

    public function data_get($id = '') {
        $p = db_prefix();
        if (empty($id) || !is_numeric($id)) {
            $seg4 = $this->uri->segment(4);
            if (is_numeric($seg4)) $id = $seg4;
        }
        if (is_numeric($id) && $id > 0) {
            $r = $this->prizm_report_model->get_report_by_id((int)$id);
            if (!$r) { $this->response(['status' => false, 'message' => 'Not found'], self::HTTP_NOT_FOUND); return; }
            $report = (array)$r;
            $report['details']  = $this->prizm_report_model->get_report_details_by_report_id((int)$id);
            $report['images']   = $this->prizm_report_model->get_report_images_by_id((int)$id);
            $report['creator_name'] = '';
            if (!empty($report['created_by'])) {
                $staff = $this->db->select('firstname, lastname')
                    ->where('staffid', (int)$report['created_by'])
                    ->get($p.'staff')->row();
                if ($staff) $report['creator_name'] = trim($staff->firstname.' '.$staff->lastname);
            }
            $this->response(['status' => true, 'data' => $report], self::HTTP_OK); return;
        }
        $project_id = $this->input->get('project_id');
        $search     = $this->input->get('search');
        $status     = $this->input->get('status');
        $date_from  = $this->input->get('date_from');
        $date_to    = $this->input->get('date_to');
        $limit  = (int)($this->input->get('limit') ?: 50);
        $offset = (int)($this->input->get('offset') ?: 0);

        $this->db->select("r.*, p.name as project_name, pn.value as project_number, c.company as client_name,
            CONCAT(s.firstname,' ',s.lastname) as creator_name");
        $this->db->from($p.'prizm_report r');
        $this->db->join($p.'projects p', 'p.id = r.project_id', 'left');
        $this->db->join($p.'customfieldsvalues pn', "pn.relid = r.project_id AND pn.fieldto = 'projects' AND pn.fieldid = (SELECT cf.id FROM {$p}customfields cf WHERE cf.slug = 'projects_project_number' LIMIT 1)", 'left');
        $this->db->join($p.'clients c', 'c.userid = r.client_id', 'left');
        $this->db->join($p.'staff s', 's.staffid = r.created_by', 'left');
        $this->db->where('r.deleteDate IS NULL');

        if ($project_id) $this->db->where('r.project_id', (int)$project_id);
        if ($status)     $this->db->where('r.status', $status);
        if ($date_from)  $this->db->where('r.report_date >=', $date_from);
        if ($date_to)    $this->db->where('r.report_date <=', $date_to);
        if ($search)     $this->db->group_start()
                             ->like('r.report_code', $search)
                             ->or_like('p.name', $search)
                             ->or_like('r.scope_description', $search)
                             ->group_end();

        $count_db = clone $this->db;
        $total = $count_db->count_all_results();

        $this->db->order_by('r.report_date', 'DESC')->order_by('r.id', 'DESC');
        $this->db->limit($limit, $offset);
        $rows = $this->db->get()->result_array();

        $this->response(['status' => true, 'data' => $rows, 'total' => $total], self::HTTP_OK);
    }

    public function data_post() {
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $_POST = $input;
        $id = $this->prizm_report_model->add_report($input);
        if (is_array($id) && isset($id['status']) && $id['status'] === 'error') {
            $this->response(['status' => false, 'message' => $id['message']], self::HTTP_BAD_REQUEST);
            return;
        }
        $this->response(['status' => true, 'data' => ['success' => (bool)$id, 'id' => $id]], $id ? self::HTTP_CREATED : self::HTTP_BAD_REQUEST);
    }

    public function data_put($id = '') {
        if (empty($id) || !is_numeric($id)) {
            $seg4 = $this->uri->segment(4);
            if (is_numeric($seg4)) $id = $seg4;
        }
        if (!is_numeric($id)) { $this->response(['status' => false, 'message' => 'ID required'], self::HTTP_BAD_REQUEST); return; }
        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        $details = [];
        if (isset($input['work_done']) && is_array($input['work_done'])) {
            foreach (($input['work_done']['locations'] ?? []) as $i => $loc) {
                $details[] = [
                    'location'            => $loc,
                    'description_of_work' => $input['work_done']['descriptions'][$i] ?? '',
                    'item_no'             => $input['work_done']['item_nos'][$i] ?? '',
                    'today_percent'       => $input['work_done']['today_percent'][$i] ?? '',
                    'overall_percent'     => $input['work_done']['overall_percent'][$i] ?? '',
                    'submission_status'   => $input['work_done']['submissions_raq'][$i] ?? 'no',
                    'planned_percent'     => null,
                    'type'                => 'done'
                ];
            }
            unset($input['work_done']);
        }
        if (isset($input['next_activities']) && is_array($input['next_activities'])) {
            foreach (($input['next_activities']['locations'] ?? []) as $i => $loc) {
                $details[] = [
                    'location'            => $loc,
                    'description_of_work' => $input['next_activities']['descriptions'][$i] ?? '',
                    'item_no'             => $input['next_activities']['item_nos'][$i] ?? '',
                    'planned_percent'     => $input['next_activities']['planned_percent'][$i] ?? '',
                    'overall_percent'     => $input['next_activities']['overall_percent'][$i] ?? '',
                    'submission_status'   => $input['next_activities']['submissions_raq'][$i] ?? 'no',
                    'today_percent'       => null,
                    'type'                => 'next'
                ];
            }
            unset($input['next_activities']);
        }

        $report_fields = ['related_to','report_date','type','outstanding_issues','suggestions','scope_description','status'];
        $data = array_intersect_key($input, array_flip($report_fields));

        $r = $this->prizm_report_model->update_report((int)$id, $data, $details);
        if (is_array($r) && isset($r['status']) && $r['status'] === 'error') {
            $this->response(['status' => false, 'message' => $r['message']], self::HTTP_BAD_REQUEST);
            return;
        }
        $this->response(['status' => true, 'data' => ['success' => (bool)$r, 'id' => (int)$id]], self::HTTP_OK);
    }

    public function data_delete($id = '') {
        if (empty($id) || !is_numeric($id)) {
            $seg4 = $this->uri->segment(4);
            if (is_numeric($seg4)) $id = $seg4;
        }
        if (!is_numeric($id)) { $this->response(['status' => false, 'message' => 'ID required'], self::HTTP_BAD_REQUEST); return; }
        $r = $this->prizm_report_model->delete_report((int)$id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r, 'id' => (int)$id]], self::HTTP_OK);
    }

    // ── image endpoints ───────────────────────────────────────

    public function images_post($report_id = '') {
        if (empty($report_id) || !is_numeric($report_id)) {
            $seg4 = $this->uri->segment(4);
            if (is_numeric($seg4)) $report_id = $seg4;
        }
        if (!is_numeric($report_id)) {
            $this->response(['status' => false, 'message' => 'Report ID required'], self::HTTP_BAD_REQUEST);
            return;
        }
        $input = json_decode(file_get_contents('php://input'), true) ?: $this->input->post();
        $upload_dir = FCPATH . 'modules/prizm_reports/assets/images/';
        if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);

        $uploaded = [];
        $items = isset($input['images']) ? $input['images'] : [$input];
        foreach ($items as $img) {
            $data_b64 = $img['content_base64'] ?? '';
            $desc     = $img['description'] ?? '';
            $ext      = $img['extension'] ?? 'jpg';
            if (empty($data_b64)) continue;

            $filename = 'report_'.$report_id.'_'.time().'_'.mt_rand(1000,9999).'.'.$ext;
            $decoded  = base64_decode($data_b64);
            if ($decoded === false) continue;
            file_put_contents($upload_dir . $filename, $decoded);

            $this->db->insert(db_prefix().'prizm_report_images', [
                'report_id'               => (int)$report_id,
                'work_image_descriptions'  => $desc,
                'image_path'               => $filename,
            ]);
            $uploaded[] = [
                'id'          => $this->db->insert_id(),
                'image_path'  => $filename,
                'description' => $desc,
            ];
        }
        $this->response(['status' => true, 'data' => $uploaded], self::HTTP_CREATED);
    }

    public function images_delete($image_id = '') {
        if (empty($image_id) || !is_numeric($image_id)) {
            $seg4 = $this->uri->segment(4);
            if (is_numeric($seg4)) $image_id = $seg4;
        }
        if (!is_numeric($image_id)) {
            $this->response(['status' => false, 'message' => 'Image ID required'], self::HTTP_BAD_REQUEST);
            return;
        }
        $r = $this->prizm_report_model->delete_image((int)$image_id);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], self::HTTP_OK);
    }

    /**
     * PUT /api/reports_api/image_description/{image_id}
     * Body: { "description": "New description text" }
     */
    public function image_description_put($image_id = '') {
        if (empty($image_id) || !is_numeric($image_id)) {
            $seg5 = $this->uri->segment(5);
            if (is_numeric($seg5)) $image_id = $seg5;
        }
        if (!is_numeric($image_id)) {
            $this->response(['status' => false, 'message' => 'Image ID required'], self::HTTP_BAD_REQUEST);
            return;
        }
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $desc = $input['description'] ?? '';
        $r = $this->prizm_report_model->update_image_description((int)$image_id, $desc);
        $this->response(['status' => true, 'data' => ['success' => (bool)$r]], self::HTTP_OK);
    }

    // ── image description update ─────────────────────────────

    /**
     * POST /api/reports_api/image_desc
     * Body: { "id": 123, "description": "New description" }
     */
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

    // ── projects ──────────────────────────────────────────────

    public function projects_get() {
        $p = db_prefix();
        $this->db->select('p.id, p.name, c.company as client_name');
        $this->db->from($p.'projects p');
        $this->db->join($p.'clients c', 'c.userid = p.clientid', 'left');
        $this->db->where_in('p.status', [2, 3]);
        $this->db->order_by('p.name', 'ASC');
        $rows = $this->db->get()->result_array();
        $this->response(['status' => true, 'data' => $rows], self::HTTP_OK);
    }
}
