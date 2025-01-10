import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { emailValidator } from '@/core/utils';
import Background from '@/components/Background';
import Logo from '@/components/Logo';
import Header from '@/components/Header';
import TextInput from '@/components/TextInput';
import { theme } from '@/core/theme';
import Button from '@/components/Button';
import { router } from 'expo-router';
import { Text as PaperText } from 'react-native-paper';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState({ value: '', error: '' });
  const [showMessage, setShowMessage] = useState(false);

  const _onSendPressed = () => {
    const emailError = emailValidator(email.value);

    if (emailError) {
      setEmail({ ...email, error: emailError });
      return;
    }

    setShowMessage(true);

  };

  return (
    <Background>
      <Logo />

      <Header>Restore Password</Header>

      { showMessage ? <View>
        <PaperText variant="bodyLarge">
          Password reset request submitted successfully. 
        </PaperText>

        <PaperText variant="bodyMedium">
          Please check your email for further instructions.
        </PaperText>
      </View> : <View>
        <TextInput
          label="E-mail address"
          returnKeyType="done"
          value={email.value}
          onChangeText={text => setEmail({ value: text, error: '' })}
          error={!!email.error}
          errorText={email.error}
          autoCapitalize="none"
          textContentType="emailAddress"
          keyboardType="email-address"
        />

        <Button mode="contained" onPress={_onSendPressed} style={styles.button}>
          Send Reset Instructions
        </Button>
      </View> }

      <TouchableOpacity
        style={styles.back}
        onPress={() => router.navigate('/')}
      >
        <Text style={styles.label}>← Back to login</Text>
      </TouchableOpacity>
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