import { useLocalSearchParams } from "expo-router";
import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";
import { TaskDetailScreen } from "@/components/tasks/TaskDetailScreen";
import { InvoiceDetailScreen } from "@/components/finance/InvoiceDetailScreen";
import { EstimateDetailScreen } from "@/components/finance/EstimateDetailScreen";
import { ProposalDetailScreen } from "@/components/finance/ProposalDetailScreen";
import { BusinessPartnerDetailScreen } from "@/components/business-partners/BusinessPartnerDetailScreen";
import { PurchaseWorkflowApprovalScreen } from "../../approvals/purchase_request/[id]";

/**
 * Generic CRUD-module detail route — covers every entity in the ERP tab
 * (customers, leads, projects, invoices, …). Modules with dedicated
 * native screens get their bespoke layout; everything else uses the
 * generic field-list view.
 */
export default function ModuleDetailRoute() {
  const { module, id } = useLocalSearchParams<{ module: string; id: string }>();
  if (module === "tasks") {
    return <TaskDetailScreen id={id} />;
  }
  if (module === "invoices") {
    return <InvoiceDetailScreen id={id} />;
  }
  if (module === "estimates") {
    return <EstimateDetailScreen id={id} />;
  }
  if (module === "proposals") {
    return <ProposalDetailScreen id={id} />;
  }
  if (module === "purchase_orders") {
    return <PurchaseWorkflowApprovalScreen kind="purchase_order" id={id} />;
  }
  if (module === "purchase_payment_requests") {
    return <PurchaseWorkflowApprovalScreen kind="payment_request" id={id} />;
  }
  if (module === "purchase_expense_requests") {
    return <PurchaseWorkflowApprovalScreen kind="expense_request" id={id} />;
  }
  if (module === "business_partners") {
    return <BusinessPartnerDetailScreen id={id} />;
  }
  return <CrudDetailScreen moduleKey={module} id={id} />;
}
