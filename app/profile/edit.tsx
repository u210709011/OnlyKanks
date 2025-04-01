import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { User, UserService } from '../../services/user.service';
import { auth } from '../../config/firebase';
import { useTheme } from '../../context/theme.context';
import { CustomButton } from '../../components/shared/CustomButton';

export default function EditProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!auth.currentUser) {
          router.replace('/login');
          return;
        }
        
        const userData = await UserService.getUser(auth.currentUser.uid);
        if (userData) {
          setUser(userData);
          setDisplayName(userData.displayName || '');
          setBio(userData.bio || '');
          setCity(userData.location?.city || '');
          setProvince(userData.location?.province || '');
          setInterests(userData.interests || []);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleAddInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    
    try {
      setSaving(true);
      
      await UserService.updateUser(auth.currentUser.uid, {
        displayName,
        bio,
        location: {
          city: city.trim(),
          province: province.trim(),
        },
        interests: interests.length > 0 ? interests : [],
      });
      
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.customHeader, { 
        paddingTop: 50, 
        paddingBottom: 10,
        backgroundColor: theme.background,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
      }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: theme.text,
          marginLeft: 16
        }}>
          Edit Profile
        </Text>
      </View>
      
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={theme.text + '80'}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
          <TextInput
            style={[
              styles.textArea,
              { 
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself"
            placeholderTextColor={theme.text + '80'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.sectionTitle}>
          <Ionicons name="location-outline" size={20} color={theme.text} />
          <Text style={[styles.sectionTitleText, { color: theme.text }]}>Location</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>City</Text>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            value={city}
            onChangeText={setCity}
            placeholder="Your city"
            placeholderTextColor={theme.text + '80'}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Province/State</Text>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            value={province}
            onChangeText={setProvince}
            placeholder="Your province or state"
            placeholderTextColor={theme.text + '80'}
          />
        </View>
        
        <View style={styles.sectionTitle}>
          <Ionicons name="heart-outline" size={20} color={theme.text} />
          <Text style={[styles.sectionTitleText, { color: theme.text }]}>Interests</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <View style={styles.interestInputRow}>
            <TextInput
              style={[
                styles.interestInput,
                { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                }
              ]}
              value={newInterest}
              onChangeText={setNewInterest}
              placeholder="Add an interest"
              placeholderTextColor={theme.text + '80'}
              onSubmitEditing={handleAddInterest}
            />
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={handleAddInterest}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.interestTags}>
            {interests.map((interest, index) => (
              <View 
                key={index} 
                style={[styles.interestTag, { backgroundColor: theme.primary + '20' }]}
              >
                <Text style={[styles.interestText, { color: theme.primary }]}>
                  {interest}
                </Text>
                <TouchableOpacity
                  style={styles.removeInterest}
                  onPress={() => handleRemoveInterest(index)}
                >
                  <Ionicons name="close-circle" size={16} color={theme.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
        
        <CustomButton
          title="Save Profile"
          onPress={handleSaveProfile}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 120,
    fontFamily: 'Roboto',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    fontFamily: 'Roboto',
  },
  interestInputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  interestInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
    fontFamily: 'Roboto',
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  removeInterest: {
    marginLeft: 4,
  },
  saveButton: {
    marginTop: 32,
  },
  customHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
}); 