import { useLocalSearchParams } from "expo-router";
import { ArticleViewer } from "@/components/knowledge/ArticleViewer";

export default function ArticleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ArticleViewer id={id!} />;
}
