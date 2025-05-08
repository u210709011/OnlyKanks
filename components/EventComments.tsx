import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme.context';
import { useAuth } from '../context/auth.context';
import { CommentService, EventComment } from '../services/comment.service';
import { db } from '../config/firebase';
import { collections } from '../services/firebase.service';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';

interface EventCommentsProps {
  eventId: string;
  isParticipant: boolean;
}

export default function EventComments({ eventId, isParticipant }: EventCommentsProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [comments, setComments] = useState<EventComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (!eventId) return;
    
    // Set up listener for real-time updates
    const commentsQuery = query(
      collection(db, collections.EVENT_COMMENTS),
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData: EventComment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        commentsData.push({
          id: doc.id,
          eventId: data.eventId,
          userId: data.userId,
          userName: data.userName,
          userPhotoURL: data.userPhotoURL,
          text: data.text,
          rating: data.rating,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        });
      });
      setComments(commentsData);
      setLoading(false);
    }, (error) => {
      console.error("Error getting comments: ", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [eventId]);
  
  const handleSubmitComment = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }
    
    if (!isParticipant) {
      Alert.alert('Error', 'Only participants can comment on this event');
      return;
    }
    
    if (newComment.trim() === '') {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }
    
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Add the comment to Firestore
      await addDoc(collection(db, collections.EVENT_COMMENTS), {
        eventId,
        userId: user.id,
        userName: user.displayName || 'Anonymous',
        userPhotoURL: user.photoURL,
        text: newComment.trim(),
        rating,
        createdAt: serverTimestamp(),
      });
      
      // Reset the form
      setNewComment('');
      setRating(0);
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderStarRating = (commentRating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={commentRating >= star ? 'star' : 'star-outline'}
            size={16}
            color={theme.primary}
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };
  
  const renderStarSelector = () => {
    return (
      <View style={styles.starSelectorContainer}>
        <Text style={[styles.ratingLabel, { color: theme.text }]}>Rating:</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={rating >= star ? 'star' : 'star-outline'}
                size={24}
                color={theme.primary}
                style={styles.starSelectIcon}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  const renderComment = ({ item }: { item: EventComment }) => {
    const isCurrentUser = user && item.userId === user.id;
    
    return (
      <View style={[styles.commentItem, { backgroundColor: theme.card }]}>
        <View style={styles.commentHeader}>
          <View style={styles.userInfoContainer}>
            {item.userPhotoURL ? (
              <Image source={{ uri: item.userPhotoURL }} style={styles.userPhoto} />
            ) : (
              <View style={[styles.userPhotoPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <Text style={{ color: theme.primary }}>
                  {item.userName.substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={[styles.userName, { color: theme.text }]}>
                {item.userName}
              </Text>
              <Text style={[styles.commentDate, { color: theme.text + '80' }]}>
                {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          {renderStarRating(item.rating)}
        </View>
        
        <Text style={[styles.commentText, { color: theme.text }]}>
          {item.text}
        </Text>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Comments ({comments.length})
        </Text>
      </View>
      
      {isParticipant && (
        <View style={[styles.commentInputContainer, { backgroundColor: theme.card }]}>
          {renderStarSelector()}
          <TextInput
            style={[styles.commentInput, { 
              backgroundColor: theme.input, 
              color: theme.text,
              borderColor: theme.border,
            }]}
            placeholder="Write a comment..."
            placeholderTextColor={theme.text + '60'}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmitComment}
            disabled={submitting || newComment.trim() === '' || rating === 0}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {comments.length > 0 ? (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={48} color={theme.text + '40'} />
          <Text style={[styles.emptyText, { color: theme.text + '80' }]}>
            No comments yet. {isParticipant ? 'Be the first to comment!' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInputContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  starSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    fontFamily: 'Roboto',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  starSelectIcon: {
    marginRight: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'Roboto',
  },
  submitButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  commentItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  userPhotoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userName: {
    fontWeight: '500',
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  commentDate: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Roboto',
  },
  emptyContainer: {
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