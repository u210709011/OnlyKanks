import React from "react";
import { View, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { SignUpForm } from "../../components/auth/SignUpForm";

export default function SignUpScreen() {
  return (
    <View style={styles.container}>
      <SignUpForm />
      <Link href="/(auth)/sign-in">Already have an account? Sign in</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
});
