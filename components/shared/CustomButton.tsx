import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../context/theme.context';

export interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  loading = false,
  secondary = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: secondary ? theme.card : theme.primary },
        disabled && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={[
          styles.text,
          { color: secondary ? theme.text : 'white', fontFamily: 'Roboto' },
          textStyle,
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
}); 