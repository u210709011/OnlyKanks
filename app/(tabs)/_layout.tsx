import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';

export default function TabLayout() {
  const { theme, isDark } = useTheme();

  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        backgroundColor: theme.card,
        borderTopColor: theme.border,
      },
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.text,
      headerStyle: {
        backgroundColor: theme.card,
      },
      headerTintColor: theme.text,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Ionicons name="compass" size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create-event"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
