import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAuth() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                let _token;
                if (Platform.OS !== 'web') {
                    _token = await SecureStore.getItemAsync('token');
                } else {
                    _token = await AsyncStorage.getItem('token');
                }
                setToken(_token);
            } catch (_) {}
        })();
    }, []);

    return token;
}