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
  Modal,
  Linking,
  Share,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PhotoService, EventPhoto } from '../services/photo.service';
import { auth } from '../config/firebase';

interface EventPhotosProps {
  eventId: string;
  isParticipant?: boolean; // New prop to determine if user is a participant
}

export default function EventPhotos({ eventId, isParticipant = false }: EventPhotosProps) {
  const { theme } = useTheme();
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const columnWidth = (screenWidth - 48) / 2; // 2 photos per column (width for column container)
  const photoWidth = columnWidth - 16; // Account for padding
  
  // State for photo viewing modal
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [sharing, setSharing] = useState(false);

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
      const captionText = caption.trim();
      const photo = await PhotoService.uploadEventPhoto(
        eventId,
        auth.currentUser.uid,
        uri,
        captionText.length > 0 ? captionText : undefined
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
  
  const sharePhoto = async (photo: EventPhoto) => {
    try {
      setSharing(true);
      
      // Try to share via the Share API
      await Share.share({
        url: photo.photoURL,
        message: photo.caption || 'Check out this event photo!',
      });
    } catch (error) {
      console.error('Error sharing photo:', error);
      
      // If sharing fails, try to open in browser as fallback
      try {
        await Linking.openURL(photo.photoURL);
      } catch (linkError) {
        Alert.alert('Error', 'Could not share or open the photo');
      }
    } finally {
      setSharing(false);
    }
  };

  const renderPhotoItem = (photo: EventPhoto, index: number) => (
    <View key={`photo-${index}`} style={[styles.photoContainer, { width: photoWidth }]}>
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => {
          setSelectedPhoto(photo);
          setShowPhotoModal(true);
        }}
      >
        <Image source={{ uri: photo.photoURL }} style={styles.photo} />
      </TouchableOpacity>
      
      <View style={styles.captionContainer}>
        {photo.caption && (
          <Text style={[styles.caption, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
            {photo.caption}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Create columns of photos for the layout
  const createPhotoColumns = () => {
    const columns = [];
    
    // Process photos in pairs to create columns
    for (let i = 0; i < photos.length; i += 2) {
      const column = [];
      
      // Add the first photo (top of column)
      column.push(renderPhotoItem(photos[i], i));
      
      // Add the second photo (bottom of column) if exists
      if (i + 1 < photos.length) {
        column.push(renderPhotoItem(photos[i+1], i+1));
      }
      
      // Add column to the layout
      columns.push(
        <View key={`column-${i}`} style={styles.photoColumn}>
          {column}
        </View>
      );
    }
    
    return columns;
  };

  return (
    <View style={styles.container}>
      {/* Only show upload controls if user is a participant */}
      {isParticipant && (
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
      )}

      {photos.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosContainer}
        >
          {createPhotoColumns()}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={48} color={theme.text + '40'} />
          <Text style={[styles.emptyText, { color: theme.text + '80' }]}>
            No photos yet. {isParticipant ? 'Be the first to share!' : ''}
          </Text>
        </View>
      )}
      
      {/* Minimal Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
        <View style={styles.modalContainer}>
          {selectedPhoto && (
            <Image 
              source={{ uri: selectedPhoto.photoURL }} 
              style={styles.fullSizePhoto}
              resizeMode="contain"
            />
          )}
          
          <View style={styles.modalButtonsContainer}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                if (selectedPhoto) {
                  sharePhoto(selectedPhoto);
                }
              }}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="share-outline" size={24} color="white" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPhotoModal(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    height: 200,
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
    paddingRight: 16,
    flexDirection: 'row',
  },
  photoColumn: {
    flexDirection: 'column',
    marginLeft: 8,
    gap: 8,
    marginBottom: 8,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  captionContainer: {
    height: 36, // Fixed height for caption area
    padding: 8,
    justifyContent: 'center',
  },
  caption: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    height: 200,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizePhoto: {
    width: '100%',
    height: '100%',
  },
  modalButtonsContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
}); 