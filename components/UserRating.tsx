import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme.context';
import { CommentService } from '../services/comment.service';

interface UserRatingProps {
  userId: string;
}

export default function UserRating({ userId }: UserRatingProps) {
  const { theme } = useTheme();
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRating = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const userRating = await CommentService.getUserRating(userId);
        setRating(userRating);
      } catch (error) {
        console.error('Error fetching user rating:', error);
        setError('Failed to load rating');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRating();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={[styles.errorText, { color: theme.text + '80' }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (rating === null) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noRatingText, { color: theme.text + '80' }]}>
          No ratings yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.ratingContainer}>
        <Text style={[styles.ratingLabel, { color: theme.text }]}>
          Host Rating:
        </Text>
        <View style={styles.ratingValue}>
          <Text style={[styles.ratingNumber, { color: theme.text }]}>
            {rating.toFixed(1)}
          </Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={rating >= star ? 'star' : rating >= star - 0.5 ? 'star-half' : 'star-outline'}
                size={16}
                color={theme.primary}
                style={{ marginHorizontal: 1 }}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    fontFamily: 'Roboto',
  },
  ratingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
    fontFamily: 'Roboto',
  },
  stars: {
    flexDirection: 'row',
  },
  errorText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Roboto',
  },
  noRatingText: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Roboto',
  },
}); 