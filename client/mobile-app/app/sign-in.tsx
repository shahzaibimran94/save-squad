import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, ImageBackground, KeyboardAvoidingView, Image } from 'react-native';
import { theme } from '../core/theme';
import { emailValidator, passwordValidator } from '../core/utils';
import { TextInput, Button as PaperButton } from 'react-native-paper';

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
    <ImageBackground
        source={require('../assets/background_dot.png')}
        resizeMode="repeat"
        style={styles.background}
    >
        <KeyboardAvoidingView style={styles.container} behavior="padding">

        <Image source={require('../assets/logo.png')} style={styles.image} />

        <Text style={styles.header}>Welcome back.</Text>

        <View style={styles.container}>
            <TextInput
                style={styles.input}
                label="Email"
                selectionColor={theme.colors.primary}
                underlineColor="transparent"
                mode="outlined"
                returnKeyType="next"
                value={email.value}
                onChangeText={text => setEmail({ value: text, error: '' })}
                error={!!email.error}
                autoCapitalize="none"
                textContentType="emailAddress"
                keyboardType="email-address"
            />
            {email.error ? <Text style={styles.error}>{email.error}</Text> : null}
        </View>

        <View style={styles.container}>
            <TextInput
                style={styles.input}
                label="Password"
                selectionColor={theme.colors.primary}
                underlineColor="transparent"
                mode="outlined"
                returnKeyType="next"
                value={password.value}
                onChangeText={text => setPassword({ value: text, error: '' })}
                error={!!password.error}
                autoCapitalize="none"
                textContentType="password"
                secureTextEntry
            />
            {password.error ? <Text style={styles.error}>{password.error}</Text> : null}
        </View>

        <View style={styles.forgotPassword}>
            <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPasswordScreen')}
            >
            <Text style={styles.label}>Forgot your password?</Text>
            </TouchableOpacity>
        </View>

        <PaperButton
            style={[styles.button]}
            labelStyle={styles.text}
            mode="contained"
            onPress={_onLoginPressed}
        >Login</PaperButton>

        <View style={styles.row}>
            <Text style={styles.label}>Don’t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
            <Text style={styles.link}>Sign up</Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
  </ImageBackground>);
};

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
    },
    container: {
        flex: 1,
        padding: 20,
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
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
    image: {
        width: 128,
        height: 128,
        marginBottom: 12,
    },
    header: {
        fontSize: 26,
        color: theme.colors.primary,
        fontWeight: 'bold',
        paddingVertical: 14,
    },
    input: {
        backgroundColor: theme.colors.surface,
    },
    error: {
        fontSize: 14,
        color: theme.colors.error,
        paddingHorizontal: 4,
        paddingTop: 4,
    },
    button: {
        width: '100%',
        marginVertical: 10,
    },
    text: {
        fontWeight: 'bold',
        fontSize: 15,
        lineHeight: 26,
    },
});

export default LoginScreen;