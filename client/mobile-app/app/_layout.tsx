import React from 'react';
import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import store from '../redux-store/store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="dashboard" />
      </Stack>
    </Provider>
  );
}
