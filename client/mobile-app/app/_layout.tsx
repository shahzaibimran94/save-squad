import React, { useState, useEffect } from 'react';
import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import store from '../redux-store/store';

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform} from 'react-native';

export default function RootLayout() {
  const [isAuthenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    (async () => {
        let token;
        try {
            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('token');
            } else {
                token = await AsyncStorage.getItem('token');
            }
            setAuthenticated(!!token);
        } catch (_) {}
    })();
  }, []);

  return (
    <Provider store={store}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}>
        { !isAuthenticated && <Stack.Screen name="index" /> }
        { !isAuthenticated && <Stack.Screen name="sign-up" /> }
        { !isAuthenticated && <Stack.Screen name="forgot-password" /> }
        { isAuthenticated && <Stack.Screen name="dashboard" /> }
      </Stack>
    </Provider>
  );
}
