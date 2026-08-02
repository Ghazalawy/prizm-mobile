import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSurveyResults } from "@/lib/queries/surveys";

export function SurveyResultsTab({ surveyId, color }: { surveyId: string | number; color: string }) {
  const query = useSurveyResults(surveyId);
  const results = query.data;
  const totalResponses = results?.total_responses ?? 0;
  const totalQuestions = results?.questions?.length ?? 0;

  if (query.isLoading && !results) {
    return <View className="flex-1 items-center justify-center"><ActivityIndicator color={color} /></View>;
  }
  if (query.isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="cloud-offline-outline" size={44} color="#DC2626" />
        <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load survey results</Text>
        <Text className="text-muted text-center text-sm mt-1">{(query.error as Error)?.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={color} />}
    >
      <View className="flex-row mb-3">
        <Metric label="Responses" value={totalResponses} icon="people-outline" color={color} />
        <View className="w-2" />
        <Metric label="Questions" value={totalQuestions} icon="help-circle-outline" color={color} />
      </View>

      {totalQuestions === 0 ? (
        <View className="bg-white rounded-2xl items-center py-12 px-6">
          <Ionicons name="bar-chart-outline" size={42} color="#94A3B8" />
          <Text className="text-foreground font-semibold mt-3">No questions yet</Text>
          <Text className="text-muted text-sm text-center mt-1">Results will appear after questions and responses are recorded.</Text>
        </View>
      ) : results?.questions.map((question, index) => (
        <View key={String(question.questionid)} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
          <View className="flex-row items-start">
            <View className="w-7 h-7 rounded-lg items-center justify-center mr-2" style={{ backgroundColor: `${color}18` }}>
              <Text className="text-xs font-bold" style={{ color }}>{index + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-bold leading-5">{question.question}</Text>
              <Text className="text-[11px] text-muted mt-0.5">{question.total_answers} answers · {question.boxtype}</Text>
            </View>
          </View>

          {question.options.map((option) => (
            <View key={String(option.id)} className="mt-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-sm text-foreground flex-1 mr-3" numberOfLines={2}>{option.label}</Text>
                <Text className="text-xs font-bold" style={{ color }}>{option.count} · {option.percent}%</Text>
              </View>
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: option.percent }} className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <View className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, option.percent))}%`, backgroundColor: color }} />
              </View>
            </View>
          ))}

          {question.answers.map((answer, answerIndex) => (
            <View key={String(answer.resultid)} className={`flex-row pt-3 ${answerIndex > 0 ? "mt-3 border-t border-slate-100" : ""}`}>
              <Text className="text-xs font-bold text-muted mr-2">{answerIndex + 1}.</Text>
              <Text className="text-sm text-foreground flex-1" selectable>{answer.answer || "—"}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Metric({ label, value, icon, color }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-3 flex-row items-center shadow-sm">
      <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${color}18` }}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View>
        <Text className="text-xl font-bold text-foreground">{value}</Text>
        <Text className="text-[11px] text-muted">{label}</Text>
      </View>
    </View>
  );
}
