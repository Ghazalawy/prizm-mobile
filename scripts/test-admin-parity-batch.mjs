import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(process.env.PRIZM331_SOURCE_ROOT || path.join(workspace, "..", "prizm331-wt-mobile-admin-parity"));
const read = (root, relative) => fs.readFileSync(path.join(root, relative), "utf8");
const registry = read(workspace, "lib/module-registry.ts");
const detail = read(workspace, "components/crud/CrudDetailScreen.tsx");
const form = read(workspace, "components/crud/CrudFormScreen.tsx");
const knowledge = read(workspace, "lib/queries/knowledge.ts");
const knowledgeScreen = read(workspace, "components/knowledge/KnowledgeBaseScreen.tsx");
const knowledgeViewer = read(workspace, "components/knowledge/ArticleViewer.tsx");
const surveyResults = read(workspace, "components/surveys/SurveyResultsTab.tsx");
const appConfig = JSON.parse(read(workspace, "app.json"));

const intent = appConfig.expo.android.intentFilters.find((item) => item.action === "VIEW" && item.autoVerify);
assert.ok(intent?.data.some((item) => item.scheme === "https" && item.host === "ms.prizm-energy.com" && item.pathPrefix === "/MS"));
const routing = read(workspace, "lib/native-routing.ts");
assert.match(routing, /payment_request/);
assert.match(routing, /view_payment_request/);
assert.match(routing, /purchase_payment_requests/);
assert.match(read(workspace, "app/(tabs)/settings.tsx"), /APP_OPEN_BY_DEFAULT_SETTINGS/);

for (const hook of ["useCreateKBArticle", "useUpdateKBArticle", "useDeleteKBArticle"]) assert.match(knowledge, new RegExp(`function ${hook}\\(`));
assert.match(knowledgeScreen, /canCreate\("knowledge_base"\)/);
assert.match(knowledgeViewer, /canEdit\("knowledge_base"\)/);
assert.match(knowledgeViewer, /canDelete\("knowledge_base"\)/);
assert.doesNotMatch(registry.match(/key: "knowledge",[\s\S]*?(?=\n  \{\n    key: "surveys")/)?.[0] || "", /can(?:Create|Update|Delete): false/);

for (const child of ["cost_center_members", "cost_center_supervisors", "cost_center_activity"]) assert.match(registry, new RegExp(`key: "${child}"`));
assert.match(registry, /moduleKey: "cost_center_members"/);
assert.match(registry, /moduleKey: "cost_center_supervisors"/);
assert.match(registry, /moduleKey: "cost_center_activity"/);
assert.match(form, /field\.hidden/);
assert.match(form, /invalidateModule, invalidateId, "tab"/);

assert.match(registry, /kind: "survey_results"/);
assert.match(detail, /SurveyResultsTab/);
assert.match(surveyResults, /useSurveyResults/);
assert.match(surveyResults, /totalResponses/);
assert.match(surveyResults, /accessibilityRole="progressbar"/);

const kbApi = read(backend, "modules/api/controllers/Knowledge_api.php");
for (const method of ["add_article", "update_article", "delete_article"]) assert.match(kbApi, new RegExp(`knowledge_base_model->${method}\\(`));
assert.match(kbApi, /api_apply_advanced_filters/);
const surveyApi = read(backend, "modules/api/controllers/Surveys_api.php");
assert.match(surveyApi, /form_results/);
assert.match(surveyApi, /surveyresultsets/);
assert.doesNotMatch(surveyApi, /prz_surveys|surveyresults(?!ets)/);
const costApi = read(backend, "modules/api/controllers/Cost_centers_api.php");
assert.match(costApi, /cm\.member_id/);
assert.match(costApi, /cs\.supervisor_id/);
assert.match(costApi, /order_by\('date'/);
assert.match(costApi, /add_edit_members/);
assert.match(costApi, /add_edit_supervisors/);

console.log("Admin parity batch contracts passed.");
