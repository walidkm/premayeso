import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { requestOtp, verifyOtp } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type Phase = "phone" | "otp";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: request OTP ──────────────────────────────────────

  const handleRequestOtp = async () => {
    setError(null);
    const cleaned = phone.trim().replace(/\s/g, "");
    if (!/^\+?\d{7,15}$/.test(cleaned)) {
      setError("Enter a valid phone number (e.g. +265 999 000 001)");
      return;
    }
    setLoading(true);
    try {
      await requestOtp(cleaned);
      setPhone(cleaned); // store cleaned version
      setPhase("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ───────────────────────────────────────

  const handleVerifyOtp = async () => {
    setError(null);
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code we sent you");
      return;
    }
    setLoading(true);
    try {
      const session = await verifyOtp(phone, code);
      await signIn(session);
      // Navigation resets automatically — App.tsx reads auth state
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.container}>
        <Text style={s.logo}>PreMayeso</Text>
        <Text style={s.tagline}>Exam prep for every Malawian student</Text>

        {phase === "phone" ? (
          <>
            <Text style={s.label}>Your phone number</Text>
            <TextInput
              style={s.input}
              placeholder="+265 999 000 001"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />

            {error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleRequestOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>Send Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.label}>Enter the 6-digit code sent to</Text>
            <Text style={s.phone}>{phone}</Text>

            <TextInput
              style={[s.input, s.otpInput]}
              placeholder="000000"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              autoFocus
            />

            {error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.link}
              onPress={() => {
                setPhase("phone");
                setOtp("");
                setError(null);
              }}
            >
              <Text style={s.linkText}>← Use a different number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    padding: 28,
    justifyContent: "center",
    gap: 14,
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 2,
  },
  tagline: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  label: { fontSize: 15, color: "#444", fontWeight: "500" },
  phone: { fontSize: 17, fontWeight: "700", color: "#111" },
  input: {
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  otpInput: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 12,
  },
  error: { color: "#dc2626", fontSize: 14 },
  btn: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { alignItems: "center", marginTop: 4 },
  linkText: { color: "#888", fontSize: 14 },
});
