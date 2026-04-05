import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Subject, Topic, Lesson } from "./src/lib/api";
import SubjectsScreen from "./src/screens/SubjectsScreen";
import TopicsScreen from "./src/screens/TopicsScreen";
import LessonsScreen from "./src/screens/LessonsScreen";
import LessonDetailScreen from "./src/screens/LessonDetailScreen";
import QuizScreen from "./src/screens/QuizScreen";

export type RootStackParamList = {
  Subjects: undefined;
  Topics: { subject: Subject };
  Lessons: { topic: Topic };
  LessonDetail: { lesson: Lesson };
  Quiz: { topic: Topic };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
