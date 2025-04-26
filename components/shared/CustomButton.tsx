import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle, View } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';

export interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: string;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  loading = false,
  secondary = false,
  disabled = false,
  style,
  textStyle,
  icon,
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
        <View style={styles.buttonContent}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={18} 
              color={secondary ? theme.text : 'white'} 
              style={styles.icon} 
            />
          )}
          <Text style={[
            styles.text,
            { color: secondary ? theme.text : 'white', fontFamily: 'Roboto' },
            textStyle,
          ]}>
            {title}
          </Text>
        </View>
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
}); 