import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/theme.context';

interface CustomButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}

export function CustomButton({ onPress, title, loading, secondary, disabled }: CustomButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: secondary ? 'transparent' : theme.primary },
        secondary && { borderColor: theme.primary, borderWidth: 1 },
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? theme.primary : 'white'} />
      ) : (
        <Text style={[
          styles.text,
          secondary && { color: theme.primary },
        ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 