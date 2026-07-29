import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";
import { useLocalSearchParams } from "expo-router";

export default function TenderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudDetailScreen moduleKey="tenders" id={id} />;
}
