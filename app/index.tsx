import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { getUserFromLocal } from '../src/services/userService';
import Animated, { 
  FadeIn, 
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

export default function WelcomeScreen() {
  const [checking, setChecking] = useState(true);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade in animation
    opacity.value = withSequence(
      withTiming(1, { duration: 800 }),
      withDelay(1500, withTiming(0, { duration: 500 }))
    );

    const checkUser = async () => {
      try {
        const user = await getUserFromLocal();
        // Wait for animation before navigation
        setTimeout(() => {
          if (user) {
            router.replace('/(tabs)/chat');
          } else {
            router.replace('/register');
          }
        }, 2800);
      } catch (error) {
        setTimeout(() => {
          router.replace('/register');
        }, 2800);
      } finally {
        setChecking(false);
      }
    };

    checkUser();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, animatedStyle]}>
        {/* Logo: BG */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoB}>B</Text>
          <Text style={styles.logoG}>G</Text>
        </View>
        
        <Text style={styles.welcomeText}>Welcome to BitGo</Text>
        
        {checking && (
          <ActivityIndicator 
            size="small" 
            color="#4CAF50" 
            style={styles.loader} 
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  logoB: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#4CAF50', // Green
  },
  logoG: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#2196F3', // Blue
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F5E6A7',
  },
  loader: {
    marginTop: 32,
  },
});
