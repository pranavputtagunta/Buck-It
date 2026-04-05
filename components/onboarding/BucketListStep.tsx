import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Calendar, Trash2, Sparkles, Plus } from 'lucide-react-native';

// Fallback for Web
let DateTimePicker: any;
if (Platform.OS !== 'web') { DateTimePicker = require('@react-native-community/datetimepicker').default; }

type Props = {
  bucketList: any[];
  onGenerateWithAI: () => void;
  onAddManual: () => void;
  onUpdateBucket: (index: number, key: string, value: any) => void;
  onRemoveBucket: (index: number) => void; // <-- NEW PROP
  onContinue: () => void;
  generating?: boolean;
};

export default function BucketListStep({ bucketList, onGenerateWithAI, onAddManual, onUpdateBucket, onRemoveBucket, onContinue, generating }: Props) {
  const [activePicker, setActivePicker] = useState<number | null>(null);

  return (
    <View>
      <Text style={styles.title}>The List</Text>
      <Text style={styles.subtitle}>Draft your first few goals, or let AI suggest a few based on your vibe.</Text>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.aiBtn]} onPress={onGenerateWithAI} disabled={generating}>
          {generating ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Sparkles color="#fff" size={18} style={{ marginRight: 6 }} />
              <Text style={styles.aiBtnText}>Suggest Goals</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.manualBtn]} onPress={onAddManual}>
          <Plus color="#000" size={18} style={{ marginRight: 6 }} />
          <Text style={styles.manualBtnText}>Add Manual</Text>
        </TouchableOpacity>
      </View>

      {/* The Bucket List */}
      {bucketList.map((item: any, i: number) => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIndex}>Goal {i + 1}</Text>
            {/* REMOVE BUTTON */}
            <TouchableOpacity onPress={() => onRemoveBucket(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Trash2 color="#FF3B30" size={20} />
            </TouchableOpacity>
          </View>

          <TextInput 
            value={item.title} 
            onChangeText={t => onUpdateBucket(i, 'title', t)} 
            placeholder="What do you want to do?" 
            style={styles.miniInput} 
            placeholderTextColor="#999"
          />
          
          {Platform.OS === 'web' ? (
            <TextInput 
              value={item.deadline} 
              onChangeText={t => onUpdateBucket(i, 'deadline', t)} 
              placeholder="Deadline (YYYY-MM-DD)" 
              style={styles.miniInput} 
              placeholderTextColor="#999"
            />
          ) : (
            <TouchableOpacity style={styles.datePicker} onPress={() => setActivePicker(i)}>
              <Text style={{ color: item.deadline ? '#000' : '#999' }}>
                {item.deadline || 'Set a target date'}
              </Text>
              <Calendar size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Native Date Picker Modal */}
      {activePicker !== null && Platform.OS !== 'web' && (
        <DateTimePicker 
          value={bucketList[activePicker]?.deadline ? new Date(bucketList[activePicker].deadline) : new Date()} 
          mode="date" 
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(e: any, d?: Date) => { 
            setActivePicker(null); 
            if (d && e.type === 'set') {
              onUpdateBucket(activePicker, 'deadline', d.toISOString().split('T')[0]); 
            }
          }} 
        />
      )}

      {/* Continue Button */}
      <TouchableOpacity 
        style={[styles.button, bucketList.length === 0 && { opacity: 0.5 }]} 
        onPress={onContinue} 
        disabled={bucketList.length === 0}
      >
        <Text style={styles.buttonText}>Continue to account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 40, fontWeight: '900', color: '#000', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20, lineHeight: 22 },
  
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16 },
  aiBtn: { backgroundColor: '#000' },
  aiBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  manualBtn: { backgroundColor: '#F0F0F0' },
  manualBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardIndex: { fontSize: 13, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  
  miniInput: { backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, marginBottom: 10, fontSize: 15, color: '#000', borderWidth: 1, borderColor: '#F0F0F0' },
  datePicker: { backgroundColor: '#F8F8F8', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  
  button: { backgroundColor: '#000', borderRadius: 20, padding: 18, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});