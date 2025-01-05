import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      initialRouteName="sign-in"
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="details" />
    </Stack>
  );
}
