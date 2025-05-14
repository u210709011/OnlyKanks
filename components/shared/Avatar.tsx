import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  border?: boolean;
  borderColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  uri, 
  size = 40, 
  border = false,
  borderColor
}) => {
  const { theme } = useTheme();
  
  const borderWidth = border ? 2 : 0;
  const actualBorderColor = borderColor || theme.primary;
  
  if (!uri) {
    return (
      <View 
        style={[
          styles.container,
          { 
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.text + '20',
            borderWidth,
            borderColor: actualBorderColor,
          }
        ]}
      >
        <Ionicons 
          name="person" 
          size={size * 0.6} 
          color={theme.text + '70'} 
        />
      </View>
    );
  }
  
  return (
    <Image 
      source={{ uri }} 
      style={[
        styles.image,
        { 
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: actualBorderColor,
        }
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#E1E1E1',
  }
}); 