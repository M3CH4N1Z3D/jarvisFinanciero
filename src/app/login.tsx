import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../services/supabaseClient';
import { router } from 'expo-router';

export default function LoginScreen() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        
        if (error) {
          console.error('Error signing in with Supabase:', error);
        } else {
          router.replace('/(tabs)');
        }
      } else {
        throw new Error('no ID token present!');
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-gray-900 p-4">
      <Text className="text-3xl font-bold mb-8 text-blue-600 dark:text-blue-400">FINTUAL</Text>
      <Text className="text-lg mb-8 text-gray-600 dark:text-gray-300 text-center">
        Inicia sesión para gestionar tus finanzas con la ayuda de IA.
      </Text>
      <TouchableOpacity 
        className="bg-blue-500 dark:bg-blue-600 py-3 px-6 rounded-full w-full max-w-sm flex-row justify-center items-center"
        onPress={signInWithGoogle}
      >
        <Text className="text-white font-bold text-lg">Iniciar sesión con Google</Text>
      </TouchableOpacity>
    </View>
  );
}
