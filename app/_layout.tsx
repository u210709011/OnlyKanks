import React, { useEffect } from 'react';
import { ThemeProvider } from '../context/theme.context';
import { AuthProvider } from '../context/auth.context';
import { Stack } from 'expo-router';
import { useTheme } from '../context/theme.context';
import { Platform, StatusBar, NativeModules } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

function StackLayout() {
  const { theme, isDark } = useTheme();

  // Set up system UI colors based on theme
  useEffect(() => {
    const setupSystemUI = async () => {
      if (Platform.OS === 'android') {
        try {
          // Set status bar color and style
          StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
          StatusBar.setBackgroundColor('transparent');
          
          // Set navigation bar color - use expo-navigation-bar which has better support
          await NavigationBar.setBackgroundColorAsync(isDark ? '#121212' : '#FFFFFF');
          await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');

          // Also use SystemUI for general background
          await SystemUI.setBackgroundColorAsync(isDark ? '#121212' : '#FFFFFF');
        } catch (error) {
          console.warn('Error setting navigation bar color:', error);
        }
      }
    };

    setupSystemUI();
  }, [isDark, theme]);

  return (
    <>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTitleStyle: {
            fontFamily: 'Roboto',
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          ...(Platform.OS === 'ios' && { headerBackTitleVisible: false }),
          animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
          contentStyle: {
            backgroundColor: theme.background,
          },
          presentation: 'card',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="settings/about" options={{ headerShown: false }} />
        <Stack.Screen name="settings/help" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StackLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
