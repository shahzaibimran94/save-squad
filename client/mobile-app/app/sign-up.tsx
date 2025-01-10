import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Background from '@/components/Background';
import Logo from '@/components/Logo';
import Header from '@/components/Header';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import { theme } from '@/core/theme';
import {
  emailValidator,
  passwordValidator,
  nameValidator,
  phoneValidator
} from '@/core/utils';
import { router } from 'expo-router';

const RegisterScreen = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    password: ''
  });

  const handleFieldChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  }

  const _onSignUpPressed = () => { 
    const _errors = {
      firstName: nameValidator(form.firstName, 'First name'),
      lastName: nameValidator(form.lastName, 'Last name'),
      email: emailValidator(form.email),
      password: passwordValidator(form.password),
      mobile: phoneValidator(form.mobile)
    }

    let hasError = false;
    for (const field of Object.keys(_errors)) {
      // @ts-ignore
      if (_errors[field] !== '') {
        hasError = true;
        break;
      }
    }

    if (hasError) {
      setErrors(_errors);
      return;
    }

    // router.navigate('/dashboard');
  };

  return (
    <Background>

      <Logo />

      <Header>Create Account</Header>

      <TextInput
        label="First name"
        returnKeyType="next"
        value={form.firstName}
        onChangeText={text => handleFieldChange('firstName', text)}
        error={!!errors.firstName}
        errorText={errors.firstName}
      />

      <TextInput
        label="Last name"
        returnKeyType="next"
        value={form.lastName}
        onChangeText={text => handleFieldChange('lastName', text)}
        error={!!errors.lastName}
        errorText={errors.lastName}
      />

      <TextInput
          label="Phone"
          placeholder="7000000000"
          returnKeyType="next"
          value={form.mobile}
          onChangeText={text => handleFieldChange('mobile', text)}
          error={!!errors.mobile}
          errorText={errors.mobile}
          autoCapitalize="none"
          textContentType="telephoneNumber"
          keyboardType="number-pad"
          maxLength={10}
      />

      <TextInput
        label="Email"
        returnKeyType="next"
        value={form.email}
        onChangeText={text => handleFieldChange('email', text)}
        error={!!errors.email}
        errorText={errors.email}
        autoCapitalize="none"
        textContentType="emailAddress"
        keyboardType="email-address"
      />

      <TextInput
        label="Password"
        returnKeyType="done"
        value={form.password}
        onChangeText={text => handleFieldChange('password', text)}
        error={!!errors.password}
        errorText={errors.password}
        secureTextEntry
      />

      <Button mode="contained" onPress={_onSignUpPressed} style={styles.button}>
        Sign Up
      </Button>

      <View style={styles.row}>
        <Text style={styles.label}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.navigate('/')}>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  label: {
    color: theme.colors.secondary,
  },
  button: {
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  link: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});

export default RegisterScreen;