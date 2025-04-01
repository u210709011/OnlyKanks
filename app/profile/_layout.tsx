import { Stack } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { Slot } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function ProfileLayout() {
  return <Slot />;
} 