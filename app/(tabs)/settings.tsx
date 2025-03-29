import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Image, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { CustomButton } from '../../components/shared/CustomButton';
import { auth } from '../../config/firebase';
import { User, UserService } from '../../services/user.service';
import * as ImagePicker from 'expo-image-picker';
import { CloudinaryService } from '../../services/cloudinary.service';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../../services/auth.service';

const SettingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userData = await UserService.getUser(auth.currentUser.uid);
      if (userData) {
        setUserProfile(userData);
        setDisplayName(userData.displayName);
        setBio(userData.bio || '');
        setImageUrl(userData.photoURL || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
      router.replace('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        const url = await CloudinaryService.uploadImage(result.assets[0].uri);
        setImageUrl(url);
      } catch (error) {
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      await UserService.updateUser(auth.currentUser.uid, {
        displayName,
        bio,
        photoURL: imageUrl,
      });
      setIsEditing(false);
      await fetchUserProfile();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.profileSection}>
        <Pressable 
          onPress={() => {
            if (auth.currentUser) {
              router.push(`/profile/${auth.currentUser.uid}`);
            }
          }}
          style={styles.viewProfileButton}
        >
          <Text style={[styles.viewProfileText, { color: theme.text }]}>
            View Public Profile
          </Text>
          <Ionicons name="arrow-forward" size={20} color={theme.text} />
        </Pressable>

        <Pressable onPress={pickImage} disabled={!isEditing}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.border }]}>
              <Ionicons name="person" size={40} color={theme.text} />
            </View>
          )}
        </Pressable>

        {isEditing ? (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display Name"
              placeholderTextColor={theme.text}
            />
            <TextInput
              style={[styles.input, styles.bioInput, { backgroundColor: theme.card, color: theme.text }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor={theme.text}
              multiline
              numberOfLines={4}
            />
          </>
        ) : (
          <>
            <Text style={[styles.displayName, { color: theme.text }]}>{userProfile?.displayName}</Text>
            <Text style={[styles.bio, { color: theme.text }]}>{userProfile?.bio || 'No bio yet'}</Text>
          </>
        )}

        <CustomButton
          title={isEditing ? 'Save Profile' : 'Edit Profile'}
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
          loading={loading}
        />
      </View>

      <View style={styles.settingsSection}>
        <CustomButton
          title="Sign Out"
          onPress={handleSignOut}
          secondary
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Advanced</Text>
        <CustomButton
          title="Restart App & Clear Cache"
          onPress={() => {
            Alert.alert(
              'Restart App',
              'This will restart the app and clear the cache. Use this if you\'re experiencing technical issues.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Restart', 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await signOut();
                      router.replace('/sign-in');
                    } catch (err) {
                      console.error('Error signing out:', err);
                    }
                  }
                }
              ]
            );
          }}
          secondary
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  input: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  settingsSection: {
    marginTop: 16,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
  },
  viewProfileText: {
    fontSize: 16,
    marginRight: 8,
    textDecorationLine: 'underline',
  },
  section: {
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

export default SettingsScreen;


