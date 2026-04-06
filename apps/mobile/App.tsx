import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Subject, Topic, Lesson, ExamPaper } from "./src/lib/api";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import SubjectsScreen from "./src/screens/SubjectsScreen";
import TopicsScreen from "./src/screens/TopicsScreen";
import LessonsScreen from "./src/screens/LessonsScreen";
import LessonDetailScreen from "./src/screens/LessonDetailScreen";
import QuizScreen from "./src/screens/QuizScreen";
import PapersScreen from "./src/screens/PapersScreen";
import PaperDrillScreen from "./src/screens/PaperDrillScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ExamPathScreen from "./src/screens/ExamPathScreen";

export type RootStackParamList = {
  Login: undefined;
  ExamPath: undefined;
  Subjects: undefined;
  Topics: { subject: Subject };
  Lessons: { topic: Topic };
  LessonDetail: { lesson: Lesson };
  Quiz: { topic: Topic };
  Papers: { subject: Subject };
  PaperDrill: { paper: ExamPaper; subject: Subject };
  Profile: undefined;
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
    <Stack.Navigator>
      {state.status === "unauthenticated" ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : state.examPath === null || state.examPath === "" ? (
        <Stack.Screen
          name="ExamPath"
          component={ExamPathScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Subjects"
            component={SubjectsScreen}
            options={({ navigation }) => ({
              title: "PreMayeso",
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Profile")}
                  style={{ marginRight: 4, padding: 4 }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: "#111",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                      {state.status === "authenticated"
                        ? state.user.phone.replace(/\D/g, "").slice(-2)
                        : "?"}
                    </Text>
                  </View>
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
            options={({ route }) => ({ title: route.params.lesson.title })}
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
            name="Profile"
            component={ProfileScreen}
            options={{ title: "My Profile" }}
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
