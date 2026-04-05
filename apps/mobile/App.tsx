import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Subject } from "./src/lib/api";
import SubjectsScreen from "./src/screens/SubjectsScreen";
import TopicsScreen from "./src/screens/TopicsScreen";

export type RootStackParamList = {
  Subjects: undefined;
  Topics: { subject: Subject };
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
