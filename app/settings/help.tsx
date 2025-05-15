import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../components/shared/AppHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FAQItem = {
  question: string;
  answer: string;
};

export default function HelpScreen() {
  const { theme } = useTheme();
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const toggleFaq = (index: number) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
    }
  };

  const faqs: FAQItem[] = [
    {
      question: 'How do I create an event?',
      answer: 'To create an event, go to the Create tab and fill out the event details including title, description, date, time, and location. You can also add an image for your event. Once you\'ve filled out all the required information, tap the "Create Event" button.'
    },
    {
      question: 'How do I send a friend request?',
      answer: 'You can send a friend request by visiting someone\'s profile and tapping the "Add Friend" button. They\'ll receive a notification about your request, and once they accept, you\'ll be friends.'
    },
    {
      question: 'Can I change my username or email?',
      answer: 'You can change your display name in the Profile Settings. However, changing your email requires contacting support for security reasons.'
    },
    {
      question: 'How do I reset my password?',
      answer: 'To reset your password, log out and tap on "Forgot password" on the login screen. Follow the instructions sent to your email to create a new password.'
    },
    {
      question: 'How do I delete my account?',
      answer: 'To delete your account, go to Settings > Privacy and scroll to the bottom. Tap on "Delete Account" and follow the confirmation steps. Please note that this action is irreversible.'
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="Help & Support" />
      
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Contact Support</Text>
          
          <TouchableOpacity 
            style={[styles.supportOption, { borderBottomColor: theme.border }]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Email Support</Text>
              <Text style={[styles.optionDescription, { color: theme.text + '80' }]}>
                Get help via email within 24 hours
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + '80'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportOption}>
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubbles-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Live Chat</Text>
              <Text style={[styles.optionDescription, { color: theme.text + '80' }]}>
                Chat with our support team
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + '80'} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Frequently Asked Questions</Text>
          
          {faqs.map((faq, index) => (
            <TouchableOpacity 
              key={index}
              style={[
                styles.faqItem, 
                index < faqs.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 0.5 }
              ]}
              onPress={() => toggleFaq(index)}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.question, { color: theme.text }]}>{faq.question}</Text>
                <Ionicons 
                  name={expandedFaq === index ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.text} 
                />
              </View>
              
              {expandedFaq === index && (
                <Text style={[styles.answer, { color: theme.text + '80' }]}>
                  {faq.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Helpful Resources</Text>
          
          <TouchableOpacity 
            style={[styles.resourceItem, { borderBottomColor: theme.border }]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="book-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>User Guide</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + '80'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.resourceItem, { borderBottomColor: theme.border }]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="play-circle-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Video Tutorials</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + '80'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Tips & Tricks</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + '80'} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
    fontFamily: 'Roboto',
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  faqItem: {
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
    fontFamily: 'Roboto',
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: 'Roboto',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
}); 