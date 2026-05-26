import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useState, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { useExpenseCategories } from "@/lib/queries/expenses";
import { useSubmitExpense } from "@/lib/queries/my";
import { takePhoto, pickImage, uploadAttachment, type PickedFile } from "@/lib/files";
import { colors } from "@/lib/theme";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  travel: "airplane-outline",
  meals: "restaurant-outline",
  food: "restaurant-outline",
  supplies: "cart-outline",
  equipment: "hardware-chip-outline",
  hosting: "cloud-outline",
  software: "code-outline",
  office: "business-outline",
  fuel: "car-outline",
  transport: "bus-outline",
  phone: "call-outline",
  utilities: "flash-outline",
  marketing: "megaphone-outline",
  training: "school-outline",
};

function categoryIcon(name?: string | null): keyof typeof Ionicons.glyphMap {
  if (!name) return "receipt-outline";
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "receipt-outline";
}

export function QuickExpenseScreen() {
  const categories = useExpenseCategories();
  const submitExpense = useSubmitExpense();

  const [receipt, setReceipt] = useState<PickedFile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const amountRef = useRef<TextInput>(null);

  const today = new Date().toISOString().slice(0, 10);

  const handleSnapReceipt = useCallback(async () => {
    const photo = await takePhoto();
    if (photo) {
      setReceipt(photo);
      amountRef.current?.focus();
    }
  }, []);

  const handlePickReceipt = useCallback(async () => {
    const photo = await pickImage();
    if (photo) {
      setReceipt(photo);
      amountRef.current?.focus();
    }
  }, []);

  const canSave = amount.length > 0 && parseFloat(amount) > 0;

  const handleSave = useCallback(
    async (addAnother: boolean) => {
      if (!canSave || saving) return;
      setSaving(true);

      const catObj = selectedCategory
        ? categories.data?.find((c) => c.id === selectedCategory)
        : null;
      const expenseName = name.trim() || catObj?.name || "Expense";

      try {
        const payload: Record<string, any> = {
          expense_name: expenseName,
          amount: parseFloat(amount),
          date: today,
          note: note.trim() || undefined,
        };
        if (selectedCategory) payload.category = selectedCategory;
        const result = await submitExpense.mutateAsync(payload as any);

        const newId = result?.data?.id;

        if (receipt && newId) {
          try {
            await uploadAttachment({
              relType: "expense",
              relId: newId,
              file: receipt,
            });
          } catch {
            Toast.show({
              type: "info",
              text1: "Expense saved",
              text2: "Receipt upload failed — attach it later",
            });
          }
        }

        Toast.show({ type: "success", text1: "Expense saved" });

        if (addAnother) {
          setReceipt(null);
          setAmount("");
          setName("");
          setNote("");
        } else {
          router.back();
        }
      } catch (err: any) {
        Alert.alert("Save failed", err?.message || "Try again");
      } finally {
        setSaving(false);
      }
    },
    [
      canSave,
      saving,
      amount,
      name,
      note,
      today,
      selectedCategory,
      receipt,
      categories.data,
      submitExpense,
    ]
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Camera section */}
        <View className="px-4 pt-4">
          {receipt ? (
            <View className="rounded-2xl overflow-hidden bg-slate-900 mb-3">
              <Image
                source={{ uri: receipt.uri }}
                className="w-full"
                style={{ height: 200 }}
                resizeMode="cover"
              />
              <View className="absolute bottom-3 right-3 flex-row">
                <TouchableOpacity
                  onPress={handleSnapReceipt}
                  className="bg-white/90 rounded-full px-3 py-2 mr-2 flex-row items-center"
                >
                  <Ionicons name="camera" size={16} color={colors.slate700} />
                  <Text className="text-xs font-medium text-slate-700 ml-1">
                    Retake
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setReceipt(null)}
                  className="bg-white/90 rounded-full px-3 py-2 flex-row items-center"
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-3 mb-3">
              <TouchableOpacity
                onPress={handleSnapReceipt}
                activeOpacity={0.8}
                className="flex-1 rounded-2xl py-8 items-center justify-center shadow-sm"
                style={{ backgroundColor: colors.primary }}
              >
                <Ionicons name="camera" size={40} color={colors.white} />
                <Text className="text-white font-bold text-base mt-2">
                  Snap Receipt
                </Text>
                <Text className="text-white/70 text-xs mt-0.5">
                  Quick capture
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickReceipt}
                activeOpacity={0.8}
                className="flex-1 rounded-2xl py-8 items-center justify-center shadow-sm bg-white"
              >
                <Ionicons
                  name="images-outline"
                  size={40}
                  color={colors.primary}
                />
                <Text
                  className="font-bold text-base mt-2"
                  style={{ color: colors.primary }}
                >
                  Gallery
                </Text>
                <Text className="text-muted text-xs mt-0.5">Pick photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Amount input */}
        <View className="px-4 mb-3">
          <View className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <Text className="text-xs text-muted uppercase tracking-wide mb-2">
              Amount
            </Text>
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              className="text-4xl font-bold text-foreground"
              style={{ minHeight: 52 }}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Category grid */}
        <View className="px-4 mb-3">
          <Text className="text-xs text-muted uppercase tracking-wide mb-2 px-1">
            Category
          </Text>
          {categories.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View className="flex-row flex-wrap">
              {(categories.data || []).map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.7}
                    className="rounded-xl p-3 items-center mr-2 mb-2"
                    style={{
                      width: "30%",
                      backgroundColor: active
                        ? colors.primary
                        : colors.white,
                    }}
                  >
                    <Ionicons
                      name={categoryIcon(cat.name)}
                      size={24}
                      color={active ? colors.white : colors.primary}
                    />
                    <Text
                      className="text-xs font-medium mt-1 text-center"
                      style={{
                        color: active ? colors.white : colors.slate600,
                      }}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Name (optional) */}
        <View className="px-4 mb-3">
          <View className="bg-white rounded-2xl px-5 py-3 shadow-sm">
            <Text className="text-xs text-muted uppercase tracking-wide mb-1">
              Name (optional)
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Taxi to site"
              className="text-sm text-foreground"
              style={{ minHeight: 36 }}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Note (optional) */}
        <View className="px-4 mb-4">
          <View className="bg-white rounded-2xl px-5 py-3 shadow-sm">
            <Text className="text-xs text-muted uppercase tracking-wide mb-1">
              Note (optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Any details..."
              className="text-sm text-foreground"
              style={{ minHeight: 36 }}
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>
        </View>

        {/* Buttons */}
        <View className="px-4 flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleSave(true)}
            disabled={!canSave || saving}
            activeOpacity={0.8}
            className="flex-1 rounded-2xl py-4 items-center shadow-sm"
            style={{
              backgroundColor: canSave ? colors.slate700 : colors.slate200,
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-white font-bold text-base">
                Save & Add Another
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSave(false)}
            disabled={!canSave || saving}
            activeOpacity={0.8}
            className="flex-1 rounded-2xl py-4 items-center shadow-sm"
            style={{
              backgroundColor: canSave ? colors.primary : colors.slate200,
            }}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-white font-bold text-base">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
