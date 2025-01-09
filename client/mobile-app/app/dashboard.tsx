import React from 'react';
import Background from '../components/Background';
import Logo from '../components/Logo';
import Header from '../components/Header';
import Paragraph from '../components/Paragraph';
import Button from '../components/Button';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { logout } from '../redux-store/features/auth/slice';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const dispatch = useDispatch();

  return (
    <Background>
      <Logo />
      <Header>Let’s start</Header>
      <Paragraph>
        Your amazing app starts here. Open you favourite code editor and start
        editing this project.
      </Paragraph>
      <Button mode="outlined" onPress={async () => {
        if (Platform.OS !== 'web') {
          await SecureStore.deleteItemAsync('token');
        } else {
            await AsyncStorage.removeItem('token');
        }
        dispatch(logout());
        router.navigate('/')
      }}>
        Logout
      </Button>
    </Background>
  );
}

export default Dashboard;