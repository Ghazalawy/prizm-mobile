import { Text, TextInput, TouchableOpacity, View } from "react-native";
import type { ModuleField } from "@/lib/module-registry";
import { DateInput } from "./DateInput";
import { RelationPicker } from "./RelationPicker";
import { SignatureInput } from "./SignatureInput";

type FieldInputProps = {
  field: ModuleField;
  value: string;
  onChange: (value: string) => void;
};

/** Native input shared by full CRUD forms and compact workflow forms. */
export function FieldInput({ field, value, onChange }: FieldInputProps) {
  if (field.type === "signature") {
    return <SignatureInput value={value} onChange={onChange} />;
  }
  if (field.relation) {
    return (
      <RelationPicker
        relation={field.relation}
        value={value}
        onChange={onChange}
        multiple={field.multiple}
        placeholder={field.placeholder || field.label}
      />
    );
  }

  if (field.type === "date" || field.type === "datetime") {
    return (
      <DateInput
        value={value}
        onChange={onChange}
        mode={field.type === "datetime" ? "datetime" : "date"}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === "boolean") {
    const active = ["1", "on", "true", "yes"].includes(value.toLowerCase());
    return (
      <TouchableOpacity
        onPress={() => onChange(active ? "" : "on")}
        className={`self-start rounded-full px-3 py-1.5 ${active ? "bg-primary" : "bg-gray-100"}`}
      >
        <Text className={`font-medium ${active ? "text-white" : "text-foreground"}`}>
          {active ? "Yes" : "No"}
        </Text>
      </TouchableOpacity>
    );
  }

  if (field.type === "select" && field.options?.length) {
    return (
      <View className="flex-row flex-wrap">
        {field.options.map((option) => {
          const selected = String(option.value) === String(value);
          return (
            <TouchableOpacity
              key={String(option.value)}
              onPress={() => onChange(String(option.value))}
              className={`rounded-full px-3 py-1.5 mr-2 mb-2 ${selected ? "bg-primary" : "bg-gray-100"}`}
            >
              <Text className={`font-medium ${selected ? "text-white" : "text-foreground"}`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const multiline = field.type === "multiline" || field.type === "json";
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={field.placeholder || field.label}
      placeholderTextColor="#94A3B8"
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      autoCapitalize={field.type === "email" || field.type === "url" ? "none" : "sentences"}
      autoCorrect={field.type !== "email" && field.type !== "url"}
      keyboardType={keyboardType(field)}
      className={`text-foreground bg-gray-50 rounded-xl px-3 ${multiline ? "min-h-[104px] py-3" : "h-11"}`}
    />
  );
}

function keyboardType(field: ModuleField) {
  switch (field.type) {
    case "email": return "email-address";
    case "phone": return "phone-pad";
    case "url": return "url";
    case "number": return "numeric";
    case "money": return "decimal-pad";
    default: return "default";
  }
}
