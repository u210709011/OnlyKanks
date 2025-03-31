import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightIcon?: {
    name: string;
    onPress: () => void;
  };
  onBackPress?: () => void;
  transparent?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBackButton = true,
  rightIcon,
  onBackPress,
  transparent = false,
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <>
      <View 
        style={[
          styles.container, 
          { 
            paddingTop: insets.top + 10,
            backgroundColor: transparent ? 'transparent' : theme.background,
            borderBottomColor: transparent ? 'transparent' : theme.border,
            borderBottomWidth: transparent ? 0 : StyleSheet.hairlineWidth,
          }
        ]}
      >
        <View style={styles.leftContainer}>
          {showBackButton && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
              hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
            >
              <Ionicons name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        
        <View style={styles.rightContainer}>
          {rightIcon && (
            <TouchableOpacity 
              style={styles.rightButton} 
              onPress={rightIcon.onPress}
              hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
            >
              <Ionicons name={rightIcon.name as any} size={24} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 16,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    paddingVertical: 8,
  },
  rightButton: {
    paddingVertical: 8,
  },
}); 