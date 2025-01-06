import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { theme } from '../core/theme';
import { emailValidator, passwordValidator } from '../core/utils';
import Background from '../app-example/components/Background';
import BackButton from '../app-example/components/BackButton';
import Logo from '../app-example/components/Logo';
import Header from '../app-example/components/Header';
import TextInput from '../app-example/components/TextInput';
import Button from '../app-example/components/Button';

type Props = {
  navigation: {
    navigate: (scene: string) => void;
  };
};

const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState({ value: '', error: '' });
  const [password, setPassword] = useState({ value: '', error: '' });

  const _onLoginPressed = () => {
    const emailError = emailValidator(email.value);
    const passwordError = passwordValidator(password.value);

    if (emailError || passwordError) {
      setEmail({ ...email, error: emailError });
      setPassword({ ...password, error: passwordError });
      return;
    }

    navigation.navigate('Dashboard');
  };

  return (
    <Background>
        <BackButton goBack={() => navigation.navigate('HomeScreen')} />

        <Logo />

        <Header>Welcome back.</Header>

        <TextInput
            label="Email"
            returnKeyType="next"
            value={email.value}
            onChangeText={text => setEmail({ value: text, error: '' })}
            error={!!email.error}
            errorText={email.error}
            autoCapitalize="none"
            textContentType="emailAddress"
            keyboardType="email-address"
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
            onPress={() => navigation.navigate('ForgotPasswordScreen')}
            >
            <Text style={styles.label}>Forgot your password?</Text>
            </TouchableOpacity>
        </View>

        <Button mode="contained" onPress={_onLoginPressed}>
            Login
        </Button>

        <View style={styles.row}>
            <Text style={styles.label}>Don’t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
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