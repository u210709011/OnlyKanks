import React from 'react';
import { ThemeProvider } from '../context/theme.context';
import { AuthProvider } from '../context/auth.context';
import { Stack } from 'expo-router';
import { useTheme } from '../context/theme.context';
import { Platform, StatusBar } from 'react-native';

function StackLayout() {
  const { theme, isDark } = useTheme();

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
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        <Stack.Screen 
          name="settings/notifications" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="settings/privacy" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="settings/about" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="settings/help" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="profile/edit" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="friends" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
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
