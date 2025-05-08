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
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [userHasCommented, setUserHasCommented] = useState(false);
  const [userComment, setUserComment] = useState<EventComment | null>(null);
  
  useEffect(() => {
    if (!eventId) return;
    
    const fetchCommentsAndRating = async () => {
      try {
        setLoading(true);
        
        // Fetch comments
        const commentsData = await CommentService.getEventComments(eventId);
        setComments(commentsData);
        
        // Fetch average rating
        const avgRating = await CommentService.getAverageRating(eventId);
        setAverageRating(avgRating);
        
        // Check if current user has already commented
        if (user) {
          const existingComment = await CommentService.getUserCommentForEvent(eventId, user.id);
          setUserHasCommented(!!existingComment);
          setUserComment(existingComment);
        }
      } catch (error) {
        console.error("Error fetching comments data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommentsAndRating();
    
    // Set up listener for real-time updates
    const unsubscribe = CommentService.subscribeToEventComments(eventId, async (commentsData: EventComment[]) => {
      setComments(commentsData);
      
      // Re-fetch average rating when comments change
      try {
        const avgRating = await CommentService.getAverageRating(eventId);
        setAverageRating(avgRating);
        
        // Check if current user has commented
        if (user) {
          const existingComment = commentsData.find((c: EventComment) => c.userId === user.id);
          setUserHasCommented(!!existingComment);
          setUserComment(existingComment || null);
        }
      } catch (error) {
        console.error("Error updating rating:", error);
      }
    });
    
    return () => unsubscribe();
  }, [eventId, user]);
  
  const handleSubmitComment = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }
    
    if (!isParticipant) {
      Alert.alert('Error', 'Only participants can comment on this event');
      return;
    }
    
    if (userHasCommented) {
      Alert.alert('Already Commented', 'You have already commented on this event. You can only comment once per event.');
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
      
      await CommentService.addComment(
        eventId,
        newComment.trim(),
        rating,
        user.displayName || 'Anonymous',
        user.photoURL
      );
      
      // Reset the form
      setNewComment('');
      setRating(0);
      
      // The comment list will be updated via the listener
    } catch (error) {
      console.error('Error submitting comment:', error);
      
      // Show more specific error message if available
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to submit comment');
      }
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
            size={14}
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
        <View style={styles.starSelectContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              activeOpacity={0.7}
              disabled={userHasCommented}
            >
              <Ionicons
                name={rating >= star ? 'star' : 'star-outline'}
                size={24}
                color={userHasCommented ? theme.text + '40' : theme.primary}
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
      <View style={[
        styles.commentItem, 
        { backgroundColor: theme.card },
        isCurrentUser && styles.currentUserComment
      ]}>
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
                {item.userName} {isCurrentUser ? '(You)' : ''}
              </Text>
              <Text style={[styles.commentDate, { color: theme.text + '80' }]}>
                {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.commentText, { color: theme.text }]}>
          {item.text}
        </Text>
        
        <View style={styles.commentFooter}>
          {renderStarRating(item.rating)}
        </View>
      </View>
    );
  };
  
  const renderAverageRating = () => {
    if (averageRating === null) return null;
    
    return (
      <View style={styles.averageRatingContainer}>
        <Text style={[styles.averageRatingValue, { color: theme.text }]}>
          {averageRating.toFixed(1)}
        </Text>
        <View style={styles.averageStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={averageRating >= star ? 'star' : averageRating >= star - 0.5 ? 'star-half' : 'star-outline'}
              size={20}
              color={theme.primary}
              style={{ marginHorizontal: 1 }}
            />
          ))}
        </View>
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
      
      {/* Average Rating */}
      {averageRating !== null && (
        <View style={[styles.ratingHeaderContainer, { backgroundColor: theme.card + '30' }]}>
          <Text style={[styles.ratingHeaderLabel, { color: theme.text }]}>
            Event Rating
          </Text>
          {renderAverageRating()}
        </View>
      )}
      
      {isParticipant && (
        <View style={[styles.commentInputContainer, { backgroundColor: theme.card }]}>
          {userHasCommented ? (
            <View style={styles.alreadyCommentedContainer}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              <Text style={[styles.alreadyCommentedText, { color: theme.text }]}>
                You've already rated this event ({userComment?.rating}/5)
              </Text>
            </View>
          ) : (
            <>
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
                editable={!userHasCommented}
              />
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { backgroundColor: theme.primary },
                  (submitting || newComment.trim() === '' || rating === 0 || userHasCommented) && 
                    { opacity: 0.5 }
                ]}
                onPress={handleSubmitComment}
                disabled={submitting || newComment.trim() === '' || rating === 0 || userHasCommented}
              >
                {submitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      
      {comments.length > 0 ? (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={48} color={theme.text + '40'} />
          <Text style={[styles.emptyText, { color: theme.text + '80' }]}>
            No comments yet. {isParticipant && !userHasCommented ? 'Be the first to comment!' : ''}
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
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    fontFamily: 'Roboto',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
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
  currentUserComment: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  averageRatingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRatingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  averageStars: {
    flexDirection: 'row',
  },
  ratingHeaderContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  ratingHeaderLabel: {
    fontSize: 14,
    marginBottom: 6,
    fontFamily: 'Roboto',
    fontWeight: '500',
  },
  alreadyCommentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alreadyCommentedText: {
    fontSize: 16,
    marginLeft: 8,
    fontFamily: 'Roboto',
  },
  commentFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
}); 