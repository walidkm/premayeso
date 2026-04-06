import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../lib/AuthContext";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

const EXAM_PATH_LABEL: Record<string, string> = {
  JCE:   "Junior Certificate of Education",
  MSCE:  "Malawi School Certificate of Education",
  PSLCE: "Primary School Leaving Certificate",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const { state, signOut, setExamPath } = useAuth();

  if (state.status !== "authenticated") return null;

  const { user, examPath } = state;

  const handleChangeExamPath = () => {
    // Temporarily clear exam path → nav will show ExamPathScreen
    setExamPath("").catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      {/* Avatar */}
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {user.phone.replace(/\D/g, "").slice(-2)}
        </Text>
      </View>
      <Text style={s.phone}>{user.phone}</Text>
      <Text style={s.roleTag}>{user.role}</Text>

      {/* Details */}
      <View style={s.card}>
        <Row label="Phone"     value={user.phone} />
        <View style={s.divider} />
        <Row label="Role"      value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} />
        <View style={s.divider} />
        <Row
          label="Subscription"
          value="Free"
        />
        <View style={s.divider} />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Exam path</Text>
            <Text style={s.rowValue}>
              {examPath
                ? `${examPath} — ${EXAM_PATH_LABEL[examPath] ?? ""}`
                : "Not set"}
            </Text>
          </View>
          <TouchableOpacity style={s.changeBtn} onPress={handleChangeExamPath}>
            <Text style={s.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={s.signOutBtn}
        onPress={async () => {
          await signOut();
        }}
      >
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={s.version}>PreMayeso v1.0.0 · JCE first</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    gap: 16,
    backgroundColor: "#f9f9f9",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  phone:   { fontSize: 20, fontWeight: "700", color: "#111" },
  roleTag: {
    backgroundColor: "#f4f4f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "capitalize",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    overflow: "hidden",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  rowLabel: { fontSize: 12, color: "#999", flex: 1 },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#111", flex: 2, textAlign: "right" },
  divider: { height: 1, backgroundColor: "#f4f4f5", marginHorizontal: 16 },
  changeBtn: {
    backgroundColor: "#f4f4f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeBtnText: { fontSize: 12, fontWeight: "600", color: "#444" },
  signOutBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
  version: { fontSize: 12, color: "#ccc", marginTop: 8 },
});
