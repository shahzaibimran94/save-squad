import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { passwordValidator } from '@/core/utils';
import Background from '@/components/Background';
import Logo from '@/components/Logo';
import Header from '@/components/Header';
import TextInput from '@/components/TextInput';
import { theme } from '@/core/theme';
import Button from '@/components/Button';
import { router, Link, useLocalSearchParams } from 'expo-router';
import { Text as PaperText } from 'react-native-paper';

const ForgotPasswordScreen = () => {
  const { token } = useLocalSearchParams();
  const [form, setForm] = useState({ password: '', passwordRepeat: '' });
  const [errors, setErrors] = useState({ password: '', passwordRepeat: '' });

  const _onSendPressed = () => {
    router.navigate('/');
  };

  return (
    <Background>
        <Logo />

        <Header>Reset Password</Header>

        { !token && <PaperText variant="bodyLarge">
          Reset link expired. Please request a new password reset. <Link href='/forgot-password'>Click here</Link> 
        </PaperText> }

        { token && <>
          <TextInput
              label="New Password"
              returnKeyType="done"
              value={form.password}
              onChangeText={text => setForm({ ...form, password: text })}
              error={!!errors.password}
              errorText={errors.password}
              secureTextEntry
          />

          <TextInput
              label="Repeat Password"
              returnKeyType="done"
              value={form.password}
              onChangeText={text => setForm({ ...form, passwordRepeat: text })}
              error={!!errors.password}
              errorText={errors.password}
              secureTextEntry
          />

          <Button mode="contained" onPress={_onSendPressed} style={styles.button}>
              Reset Password
          </Button>
        </> }
      
    </Background>
  );
};

const styles = StyleSheet.create({
  back: {
    width: '100%',
    marginTop: 12,
  },
  button: {
    marginTop: 12,
  },
  label: {
    color: theme.colors.secondary,
    width: '100%',
  },
});

export default ForgotPasswordScreen;