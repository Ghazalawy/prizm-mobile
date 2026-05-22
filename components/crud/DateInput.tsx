import { useState } from "react";
import { Platform, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  mode: "date" | "datetime";
  placeholder?: string;
};

/**
 * Native date / datetime picker that produces a string in Perfex's expected
 * format: "YYYY-MM-DD" for date, "YYYY-MM-DD HH:MM:SS" for datetime.
 *
 * Tap to open. Android shows the modal picker; iOS shows the inline spinner.
 * Clear button hands back an empty string so optional fields can be cleared.
 */
export function DateInput({ value, onChange, mode, placeholder }: DateInputProps) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const initial = parseInputDate(value) ?? new Date();

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowDate(false);
    if (event.type === "dismissed" || !selected) return;
    if (mode === "date") {
      onChange(formatDate(selected));
    } else {
      // For datetime mode, after date is picked we open the time picker too.
      const merged = new Date(selected);
      // Preserve existing time-of-day if the input already had one.
      const existing = parseInputDate(value);
      if (existing) {
        merged.setHours(existing.getHours(), existing.getMinutes(), existing.getSeconds());
      }
      onChange(formatDateTime(merged));
      setShowTime(true);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowTime(false);
    if (event.type === "dismissed" || !selected) return;
    const current = parseInputDate(value) ?? selected;
    current.setHours(selected.getHours(), selected.getMinutes(), 0);
    onChange(formatDateTime(current));
  };

  const display = displayValue(value, mode, placeholder);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowDate(true)}
        activeOpacity={0.7}
        className="flex-row items-center bg-gray-50 rounded-xl px-3 h-11"
      >
        <Ionicons
          name={mode === "datetime" ? "time-outline" : "calendar-outline"}
          size={18}
          color="#64748B"
        />
        <Text className={`flex-1 ml-2 ${value ? "text-foreground" : "text-muted"}`}>
          {display}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {showDate ? (
        <DateTimePicker
          value={initial}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      ) : null}
      {showTime ? (
        <DateTimePicker
          value={initial}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
          is24Hour
        />
      ) : null}
    </>
  );
}

function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  // Perfex date strings: "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4] ?? 0),
    Number(m[5] ?? 0),
    Number(m[6] ?? 0)
  );
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(d: Date): string {
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function displayValue(value: string, mode: "date" | "datetime", placeholder?: string): string {
  if (!value) return placeholder || (mode === "datetime" ? "Pick date and time" : "Pick a date");
  const d = parseInputDate(value);
  if (!d) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: mode === "datetime" ? "2-digit" : undefined,
    minute: mode === "datetime" ? "2-digit" : undefined,
  });
}
