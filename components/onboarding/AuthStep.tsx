import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { C } from './theme';

const Field = ({
  icon, value, onChangeText, placeholder, secure, keyboardType, autoCapitalize,
}: {
  icon: React.ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) => {
  const [hidden, setHidden] = useState(secure ?? false);
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldIcon}>{icon}</View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textLight}
        style={styles.fieldInput}
        secureTextEntry={hidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
      {secure && (
        <TouchableOpacity onPress={() => setHidden(h => !h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {hidden
            ? <Eye size={16} color={C.textLight} />
            : <EyeOff size={16} color={C.textLight} />}
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function AuthStep({
  mode, username, email, password,
  onChangeUsername, onChangeEmail, onChangePassword,
  onSubmit, submitting,
}: any) {
  const isNew = mode === 'new';

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>STEP 4 OF 4</Text>
      <Text style={styles.title}>{isNew ? 'Secure\nyour spot.' : 'Welcome\nback.'}</Text>
      <Text style={styles.subtitle}>
        {isNew ? 'Create your account to save your bucket list.' : 'Sign in to pick up where you left off.'}
      </Text>

      {isNew && (
        <Field
          icon={<User size={16} color={C.accent} />}
          value={username}
          onChangeText={onChangeUsername}
          placeholder="Username"
        />
      )}
      <Field
        icon={<Mail size={16} color={C.accent} />}
        value={email}
        onChangeText={onChangeEmail}
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        icon={<Lock size={16} color={C.accent} />}
        value={password}
        onChangeText={onChangePassword}
        placeholder="Password"
        secure
      />

      <TouchableOpacity
        style={[styles.btn, submitting && styles.btnDisabled]}
        onPress={onSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <>
              <Text style={styles.btnText}>{isNew ? 'Create Account' : 'Sign In'}</Text>
              <ArrowRight color="#fff" size={18} style={{ marginLeft: 8 }} />
            </>}
      </TouchableOpacity>

      {isNew && (
        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },

  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: C.textLight, marginBottom: 8 },
  title:   { fontSize: 40, fontWeight: '700', letterSpacing: -1.2, color: C.textPrimary, lineHeight: 44 },
  subtitle:{ fontSize: 15, color: C.textMuted, marginTop: 8, marginBottom: 28, lineHeight: 22 },

  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, marginBottom: 12, height: 52,
  },
  fieldIcon:  { marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: '400' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.accentDark, borderRadius: 14,
    paddingVertical: 16, marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.1 },

  legal: { fontSize: 11, color: C.textLight, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});