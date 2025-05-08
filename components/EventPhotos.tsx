import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PhotoService, EventPhoto } from '../services/photo.service';
import { auth } from '../config/firebase';

interface EventPhotosProps {
  eventId: string;
}

export default function EventPhotos({ eventId }: EventPhotosProps) {
  const { theme } = useTheme();
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 32) / 2 - 8; // 2 columns with 16px padding on each side and 8px between items

  useEffect(() => {
    loadPhotos();
  }, [eventId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const eventPhotos = await PhotoService.getEventPhotos(eventId);
      setPhotos(eventPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to upload photos');
      return;
    }

    try {
      setUploading(true);
      const photo = await PhotoService.uploadEventPhoto(
        eventId,
        auth.currentUser.uid,
        uri,
        caption.trim() || undefined
      );
      setPhotos(prev => [photo, ...prev]);
      setCaption('');
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photo: EventPhoto) => {
    if (!auth.currentUser || photo.userId !== auth.currentUser.uid) {
      Alert.alert('Error', 'You can only delete your own photos');
      return;
    }

    try {
      await PhotoService.deleteEventPhoto(photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (error) {
      console.error('Error deleting photo:', error);
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Create rows of photos for grid display
  const createPhotoRows = () => {
    const rows = [];
    for (let i = 0; i < photos.length; i += 2) {
      const rowItems = [];
      // First item in row
      rowItems.push(
        <View key={photos[i].id} style={[styles.photoContainer, { width: itemWidth }]}>
          <Image source={{ uri: photos[i].photoURL }} style={styles.photo} />
          {photos[i].caption && (
            <Text style={[styles.caption, { color: theme.text }]} numberOfLines={2}>
              {photos[i].caption}
            </Text>
          )}
          {auth.currentUser?.uid === photos[i].userId && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: theme.error }]}
              onPress={() => deletePhoto(photos[i])}
            >
              <Ionicons name="trash" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      );
      
      // Second item in row (if exists)
      if (i + 1 < photos.length) {
        rowItems.push(
          <View key={photos[i + 1].id} style={[styles.photoContainer, { width: itemWidth }]}>
            <Image source={{ uri: photos[i + 1].photoURL }} style={styles.photo} />
            {photos[i + 1].caption && (
              <Text style={[styles.caption, { color: theme.text }]} numberOfLines={2}>
                {photos[i + 1].caption}
              </Text>
            )}
            {auth.currentUser?.uid === photos[i + 1].userId && (
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: theme.error }]}
                onPress={() => deletePhoto(photos[i + 1])}
              >
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        );
      }
      
      rows.push(
        <View key={`row-${i}`} style={styles.photoRow}>
          {rowItems}
        </View>
      );
    }
    return rows;
  };

  return (
    <View style={styles.container}>
      <View style={styles.uploadContainer}>
        <TextInput
          style={[styles.captionInput, { 
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          }]}
          placeholder="Add a caption (optional)"
          placeholderTextColor={theme.text + '80'}
          value={caption}
          onChangeText={setCaption}
          maxLength={100}
        />
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: theme.primary }]}
          onPress={pickImage}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="camera" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.photosContainer}>
        {photos.length > 0 ? (
          createPhotoRows()
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={theme.text + '40'} />
            <Text style={[styles.emptyText, { color: theme.text + '80' }]}>
              No photos yet. Be the first to share!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  captionInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontFamily: 'Roboto',
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photosContainer: {
    padding: 8,
    paddingBottom: 20,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
  },
  caption: {
    padding: 8,
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
}); 