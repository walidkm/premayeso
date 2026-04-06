import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Subject, Topic, Lesson } from "./src/lib/api";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import SubjectsScreen from "./src/screens/SubjectsScreen";
import TopicsScreen from "./src/screens/TopicsScreen";
import LessonsScreen from "./src/screens/LessonsScreen";
import LessonDetailScreen from "./src/screens/LessonDetailScreen";
import QuizScreen from "./src/screens/QuizScreen";
import LoginScreen from "./src/screens/LoginScreen";

export type RootStackParamList = {
  Login: undefined;
  Subjects: undefined;
  Topics: { subject: Subject };
  Lessons: { topic: Topic };
  LessonDetail: { lesson: Lesson };
  Quiz: { topic: Topic };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Inner navigator — reads auth state ───────────────────────

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
        // Auth stack
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        // App stack
        <>
          <Stack.Screen
            name="Subjects"
            component={SubjectsScreen}
            options={{ title: "PreMayeso" }}
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
            options={({ route }) => ({ title: `${route.params.topic.name} Quiz` })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

// ── Root ─────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
