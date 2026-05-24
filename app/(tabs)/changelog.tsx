import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BUILD_VERSION } from "@/lib/build-info";
// CHANGELOG.json is bundled at build-time. JSON import is supported
// out of the box by Metro + the project's tsconfig (resolveJsonModule).
import changelog from "@/CHANGELOG.json";

/**
 * Vertical-timeline changelog. Renders every entry from CHANGELOG.json
 * as a beaded thread:
 *
 *   ● 1.5.0 · May 25  ── View As + smooth DnD …
 *   │   • bullet
 *   │   • bullet
 *   ● 1.4.0 · May 24  ── Popover polish …
 *   │   • bullet
 *
 * The "rope" itself is a left-side vertical line drawn with a thin
 * View whose top extends to the dot above and bottom to the dot below.
 * Bullets attach to that line via small dots and inset text.
 *
 * The CURRENT version (matches BUILD_VERSION) gets a highlighted
 * "you're here" pill so users can instantly orient themselves.
 */
type Release = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

export default function ChangelogScreen() {
  const releases = (changelog.releases as Release[]) || [];
  return (
    <>
      <Stack.Screen
        options={{
          title: "Changelog",
          headerShown: true,
          headerBackTitle: "Settings",
        }}
      />
      <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ padding: 16 }}>
        <View className="mb-4">
          <Text className="text-2xl font-bold text-foreground">What's changed</Text>
          <Text className="text-sm text-muted mt-1">
            Every release since the app's launch, newest first.
          </Text>
        </View>

        {releases.map((r, idx) => (
          <ReleaseRow
            key={r.version}
            release={r}
            isCurrent={r.version === BUILD_VERSION}
            isFirst={idx === 0}
            isLast={idx === releases.length - 1}
          />
        ))}
      </ScrollView>
    </>
  );
}

function ReleaseRow({
  release,
  isCurrent,
  isFirst,
  isLast,
}: {
  release: Release;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <View style={{ flexDirection: "row" }}>
      {/* Rope rail — the vertical line + dot at each release. */}
      <View
        style={{
          width: 22,
          alignItems: "center",
          // Bring the top of the rail up to align with the version-pill
          // top; the bottom continues to the next entry.
          paddingTop: 4,
        }}
      >
        {/* Top half of the line (suppressed for the first entry) */}
        <View
          style={{
            width: 2,
            flex: 0,
            height: isFirst ? 0 : 8,
            backgroundColor: "#CBD5E1",
          }}
        />
        {/* Dot */}
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: isCurrent ? "#0284C7" : "#94A3B8",
            borderWidth: isCurrent ? 3 : 0,
            borderColor: "#BAE6FD",
          }}
        />
        {/* Bottom of the rail extends to next entry */}
        {!isLast ? (
          <View
            style={{
              width: 2,
              flex: 1,
              backgroundColor: "#CBD5E1",
              marginTop: 2,
            }}
          />
        ) : null}
      </View>

      {/* Content card */}
      <View style={{ flex: 1, marginLeft: 8, paddingBottom: isLast ? 8 : 24 }}>
        <View className="flex-row items-center flex-wrap mb-1">
          <View
            style={{
              backgroundColor: isCurrent ? "#0284C7" : "#F1F5F9",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: isCurrent ? "white" : "#475569",
              }}
            >
              v{release.version}
            </Text>
          </View>
          <Text className="text-xs text-muted ml-2">{formatDate(release.date)}</Text>
          {isCurrent ? (
            <View
              style={{
                marginLeft: 6,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: "#DCFCE7",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark" size={10} color="#15803D" />
              <Text style={{ fontSize: 10, color: "#15803D", fontWeight: "700", marginLeft: 2 }}>
                INSTALLED
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-sm font-semibold text-foreground mb-2" selectable>
          {release.title}
        </Text>
        {(release.highlights || []).map((h, i) => (
          <View key={i} className="flex-row mb-1.5">
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#94A3B8",
                marginTop: 7,
                marginRight: 8,
              }}
            />
            <Text className="text-xs text-foreground/80 flex-1 leading-relaxed" selectable>
              {h}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
