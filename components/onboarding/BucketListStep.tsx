import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  Calendar,
  Trash2,
  Sparkles,
  Plus,
  ArrowRight,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { C } from "./theme";

type Props = {
  bucketList: any[];
  onGenerateWithAI?: () => void;
  onAddManual: () => void;
  onUpdateBucket: (index: number, key: string, value: any) => void;
  onRemoveBucket: (index: number) => void;
  onContinue: () => void;
  generating?: boolean;
};

export default function BucketListStep({
  bucketList,
  onGenerateWithAI,
  onAddManual,
  onUpdateBucket,
  onRemoveBucket,
  onContinue,
  generating,
}: Props) {
  const [activePicker, setActivePicker] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>STEP 3 OF 4</Text>
      <Text style={styles.title}>The List</Text>
      <Text style={styles.subtitle}>
        Draft your first few goals, or let AI suggest some based on your vibe.
      </Text>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {onGenerateWithAI && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.aiBtn]}
            onPress={onGenerateWithAI}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <ActivityIndicator color={C.accentDark} size="small" />
            ) : (
              <>
                <Sparkles
                  color={C.accentDark}
                  size={16}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.aiBtnText}>Suggest Goals</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.manualBtn]}
          onPress={onAddManual}
          activeOpacity={0.8}
        >
          <Plus color="#fff" size={16} style={{ marginRight: 6 }} />
          <Text style={styles.manualBtnText}>Add Manually</Text>
        </TouchableOpacity>
      </View>

      {/* Goal cards */}
      {bucketList.map((item: any, i: number) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIndex}>GOAL {i + 1}</Text>
            <TouchableOpacity
              onPress={() => onRemoveBucket(i)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.removeBtn}
            >
              <Trash2 color={C.red} size={16} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldWrap}>
            <TextInput
              value={item.title}
              onChangeText={(t) => onUpdateBucket(i, "title", t)}
              placeholder="What do you want to do?"
              placeholderTextColor={C.textLight}
              style={styles.fieldInput}
            />
          </View>

          {Platform.OS === "web" ? (
            <View style={styles.fieldWrap}>
              <TextInput
                value={item.deadline}
                onChangeText={(t) => onUpdateBucket(i, "deadline", t)}
                placeholder="Deadline (YYYY-MM-DD)"
                placeholderTextColor={C.textLight}
                style={styles.fieldInput}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.dateRow}
              onPress={() => setActivePicker(i)}
              activeOpacity={0.7}
            >
              <Calendar size={15} color={C.accent} style={{ marginRight: 8 }} />
              <Text
                style={{
                  color: item.deadline ? C.textPrimary : C.textLight,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {item.deadline || "Set a target date"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {activePicker !== null && Platform.OS !== "web" && (
        <DateTimePicker
          value={
            bucketList[activePicker]?.deadline
              ? new Date(bucketList[activePicker].deadline)
              : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date()}
          onChange={(e: any, d?: Date) => {
            setActivePicker(null);
            if (d && e.type === "set")
              onUpdateBucket(
                activePicker,
                "deadline",
                d.toISOString().split("T")[0],
              );
          }}
        />
      )}

      {/* Continue */}
      <TouchableOpacity
        style={[styles.btn, bucketList.length === 0 && styles.btnDisabled]}
        onPress={onContinue}
        disabled={bucketList.length === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>Continue to account</Text>
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
    marginBottom: 24,
    lineHeight: 22,
  },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
  },
  aiBtn: {
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: C.borderMid,
  },
  aiBtnText: { color: C.accentDark, fontWeight: "700", fontSize: 14 },
  manualBtn: { backgroundColor: C.accentDark },
  manualBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIndex: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.redBg,
    borderWidth: 1,
    borderColor: C.redBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldWrap: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    marginBottom: 8,
    height: 44,
    justifyContent: "center",
  },
  fieldInput: { fontSize: 14, color: C.textPrimary, fontWeight: "400" },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },

  // Continue button
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
