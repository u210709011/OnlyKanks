import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme.context';
import { CommentService } from '../services/comment.service';

// Static cache to store ratings
const ratingsCache: { [userId: string]: number | null } = {};

interface UserRatingProps {
  userId: string;
  rating?: number | null; // Optional rating prop - if provided, skip fetch
}

export default function UserRating({ userId, rating: providedRating }: UserRatingProps) {
  const { theme } = useTheme();
  const [rating, setRating] = useState<number | null>(providedRating !== undefined ? providedRating : null);
  const [loading, setLoading] = useState(providedRating !== undefined ? false : !ratingsCache[userId]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If rating was provided as prop, use it and skip fetch
    if (providedRating !== undefined) {
      setRating(providedRating);
      return;
    }

    // If rating exists in cache, use it
    if (ratingsCache[userId] !== undefined) {
      setRating(ratingsCache[userId]);
      setLoading(false);
      return;
    }

    const fetchUserRating = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const userRating = await CommentService.getUserRating(userId);
        
        // Store in cache
        ratingsCache[userId] = userRating;
        
        setRating(userRating);
      } catch (error) {
        console.error('Error fetching user rating:', error);
        setError('Failed to load rating');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRating();
  }, [userId, providedRating]);

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