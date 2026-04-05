import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { MapPin, Smile, Tag, ArrowRight } from "lucide-react-native";
import { C } from "./theme";

const Field = ({
  icon,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  icon: React.ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) => (
  <View style={[styles.inputWrap, multiline && styles.inputWrapTall]}>
    <View style={styles.inputIcon}>{icon}</View>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textLight}
      style={[styles.input, multiline && styles.inputMulti]}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
    />
  </View>
);

export default function ProfileStep({
  personality,
  hobbiesInput,
  location,
  onChangePersonality,
  onChangeHobbiesInput,
  onChangeLocation,
  onContinue,
}: any) {
  const disabled = !personality || !hobbiesInput || !location;

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>STEP 2 OF 4</Text>
      <Text style={styles.title}>Your vibe</Text>
      <Text style={styles.subtitle}>
        Tell us where you are and what you are about.
      </Text>

      <Field
        icon={<MapPin size={16} color={C.accent} />}
        value={location}
        onChangeText={onChangeLocation}
        placeholder="Current city"
      />
      <Field
        icon={<Smile size={16} color={C.accent} />}
        value={personality}
        onChangeText={onChangePersonality}
        placeholder="Adventurous, creative..."
      />
      <Field
        icon={<Tag size={16} color={C.accent} />}
        value={hobbiesInput}
        onChangeText={onChangeHobbiesInput}
        placeholder="Hiking, coding, surfing..."
        multiline
      />

      <TouchableOpacity
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={onContinue}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>Continue</Text>
        <ArrowRight color="#fff" size={18} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },

  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: C.textLight,
    marginBottom: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1.2,
    color: C.textPrimary,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 22,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    marginBottom: 12,
    minHeight: 52,
  },
  inputWrapTall: { alignItems: "flex-start", paddingTop: 14, minHeight: 100 },
  inputIcon: { marginRight: 10, marginTop: 2 },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.textPrimary,
    fontWeight: "400",
    paddingVertical: 0,
  },
  inputMulti: { height: 72 },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accentDark,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.1,
  },
});
