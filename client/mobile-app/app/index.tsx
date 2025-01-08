import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { theme } from '@/core/theme';
import { passwordValidator } from '@/core/utils';
import Background from '@/components/Background';
import Logo from '@/components/Logo';
import Header from '@/components/Header';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import { router } from 'expo-router';
import { useLoginMutation } from '../redux-store/features/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setAsLoggedIn } from '../redux-store/features/auth/slice';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = () => {
    const dispatch = useDispatch();
    const [login, { isLoading, isError, error }] = useLoginMutation();
    const [phone, setPhone] = useState({ value: '', error: '' });
    const [password, setPassword] = useState({ value: '', error: '' });
    const [_error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) {
            (async () => {
                let token;
                try {
                    if (Platform.OS !== 'web') {
                        token = await SecureStore.getItemAsync('token');
                    } else {
                        token = await AsyncStorage.getItem('token');
                    }
                    if (token) {
                        dispatch(setAsLoggedIn());
                        router.navigate('/dashboard');
                    }
                    console.log('ssss');
                    setLoading(false);
                } catch (_) {
                    setLoading(false);
                }
            })();
        }
    }, []);

    if (loading) {
        return <ActivityIndicator />;
    }

    const _onLoginPressed = async () => {
        setError(null);
        const passwordError = passwordValidator(password.value);

        if (passwordError) {
            setPassword({ ...password, error: passwordError });
            return;
        }

        try {
            const userData = await login({ mobile: `+44${phone.value}`, password: password.value }).unwrap();
            console.log('Logged in:', userData);
            if (Platform.OS !== 'web') {
                await SecureStore.setItemAsync('token', userData.token);
            } else {
                await AsyncStorage.setItem('token', userData.token);
            }
            dispatch(setAsLoggedIn());
            router.navigate('/dashboard');
        } catch (err) {
            console.error('Failed to login:', err);
            setError('Invalid Credentials');
        }

    };

    return (
        <Background>
            <Logo />

            <Header>Welcome back.</Header>

            <TextInput
                label="Phone"
                placeholder="7123456789"
                returnKeyType="next"
                value={phone.value}
                onChangeText={text => setPhone({ value: text, error: '' })}
                error={!!phone.error}
                errorText={phone.error}
                autoCapitalize="none"
                textContentType="telephoneNumber"
                keyboardType="number-pad"
                maxLength={10}
            />

            <TextInput
                label="Password"
                returnKeyType="done"
                value={password.value}
                onChangeText={text => setPassword({ value: text, error: '' })}
                error={!!password.error}
                errorText={password.error}
                secureTextEntry
            />

            <View style={styles.forgotPassword}>
                <TouchableOpacity
                onPress={() => router.navigate('/forgot-password')}
                >
                <Text style={styles.label}>Forgot your password?</Text>
                </TouchableOpacity>
            </View>

            <Text>{_error}</Text>

            <Button mode="contained" disabled={isLoading} onPress={_onLoginPressed}>
                Login
            </Button>

            <View style={styles.row}>
                <Text style={styles.label}>Don’t have an account? </Text>
                <TouchableOpacity onPress={() => router.navigate('/sign-up')}>
                <Text style={styles.link}>Sign up</Text>
                </TouchableOpacity>
            </View>
        </Background>
    );
};

const styles = StyleSheet.create({
    forgotPassword: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        marginTop: 4,
    },
    label: {
        color: theme.colors.secondary,
    },
    link: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
});

export default LoginScreen;