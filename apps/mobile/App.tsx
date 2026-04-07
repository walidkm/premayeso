import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Subject, Topic, ExamPaper } from "./src/lib/api";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import SubjectsScreen from "./src/screens/SubjectsScreen";
import TopicsScreen from "./src/screens/TopicsScreen";
import LessonsScreen from "./src/screens/LessonsScreen";
import LessonDetailScreen from "./src/screens/LessonDetailScreen";
import QuizScreen from "./src/screens/QuizScreen";
import PapersScreen from "./src/screens/PapersScreen";
import PaperDrillScreen from "./src/screens/PaperDrillScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import LoginScreen from "./src/screens/LoginScreen";

export type RootStackParamList = {
  Login: undefined;
  Subjects: undefined;
  Topics: { subject: Subject };
  Lessons: { topic: Topic };
  LessonDetail: { lessonId: string; lessonTitle: string };
  Quiz: { topic: Topic };
  Papers: { subject: Subject };
  PaperDrill: { paper: ExamPaper; subject: Subject };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: "#0f172a",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#f4f7fb" },
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#f4f7fb" },
      }}
    >
      {state.status === "unauthenticated" ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Subjects"
            component={SubjectsScreen}
            options={({ navigation }) => ({
              title: "",
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Settings")}
                  style={{
                    marginRight: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: "#e2e8f0",
                  }}
                >
                  <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: "700" }}>
                    Settings
                  </Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen
            name="Topics"
            component={TopicsScreen}
            options={({ route }) => ({ title: route.params.subject.name })}
          />
          <Stack.Screen
            name="Lessons"
            component={LessonsScreen}
            options={({ route }) => ({ title: route.params.topic.name })}
          />
          <Stack.Screen
            name="LessonDetail"
            component={LessonDetailScreen}
            options={({ route }) => ({ title: route.params.lessonTitle })}
          />
          <Stack.Screen
            name="Quiz"
            component={QuizScreen}
            options={({ route }) => ({
              title: `${route.params.topic.name} Quiz`,
            })}
          />
          <Stack.Screen
            name="Papers"
            component={PapersScreen}
            options={({ route }) => ({
              title: `${route.params.subject.name} — Past Papers`,
            })}
          />
          <Stack.Screen
            name="PaperDrill"
            component={PaperDrillScreen}
            options={({ route }) => ({
              title: route.params.paper.year
                ? `${route.params.paper.year}${route.params.paper.paper_number ? ` Paper ${route.params.paper.paper_number}` : ""}`
                : "Past Paper",
              headerBackTitle: "Papers",
            })}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
