import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { SignInForm } from '../../components/auth/SignInForm';

export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <SignInForm />
      <Link href="/(auth)/sign-up">Don't have an account? Sign up</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
});
