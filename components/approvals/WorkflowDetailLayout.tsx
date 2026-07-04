import type { ReactNode } from "react";
import { View } from "react-native";

type WorkflowDetailLayoutProps = {
  hero: ReactNode;
  approvers?: ReactNode;
  actions?: ReactNode;
  resubmit?: ReactNode;
  lineItems?: ReactNode;
  notes?: ReactNode;
  footer?: ReactNode;
};

/** Shared vertical stack for workflow approval Info tab sections. */
export function WorkflowDetailLayout({
  hero,
  approvers,
  actions,
  resubmit,
  lineItems,
  notes,
  footer,
}: WorkflowDetailLayoutProps) {
  return (
    <View className="gap-3">
      {hero}
      {approvers}
      {actions}
      {resubmit}
      {lineItems}
      {notes}
      {footer}
    </View>
  );
}
