import { CrudListScreen } from "@/components/crud/CrudListScreen";

/** Full searchable/filterable history; the Timesheets home remains the daily dashboard. */
export default function TimesheetEntriesRoute() {
  return <CrudListScreen moduleKey="timesheets" />;
}
