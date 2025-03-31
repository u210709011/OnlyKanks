import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, ViewStyle, StyleProp, Pressable } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/auth.context';
import { Event } from '../../services/events.service';
import { UserService } from '../../services/user.service';
import { BlurView } from 'expo-blur';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const fetchCreator = async () => {
      if (event.createdBy) {
        const creatorData = await UserService.getUser(event.createdBy);
        setCreator(creatorData);
      }
    };
    fetchCreator();
  }, [event.createdBy]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/event/${event.id}`);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const eventDate = event.date.toDate();
  const formattedDate = format(eventDate, 'EEE, MMM d');
  const formattedTime = format(eventDate, 'h:mm a');

  return (
    <Pressable
      style={[
        styles.cardContainer,
        { 
          backgroundColor: theme.card,
          transform: [{ scale: isPressed ? 0.98 : 1 }]
        }
      ]}
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <View style={styles.imageContainer}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: isDark ? theme.background : theme.primary + '15' }]}>
            <Ionicons name="calendar-outline" size={48} color={theme.primary} />
          </View>
        )}
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        
        <View style={styles.imageBadges}>
          <View style={[styles.dateBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.dateDay}>
              {format(eventDate, 'd')}
            </Text>
            <Text style={styles.dateMonth}>
              {format(eventDate, 'MMM')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={theme.text + 'BB'} />
            <Text style={[styles.metaText, { color: theme.text + 'BB' }]}>
              {formattedTime}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={16} color={theme.text + 'BB'} />
            <Text style={[styles.metaText, { color: theme.text + 'BB' }]} numberOfLines={1}>
              {typeof event.location === 'string' 
                ? event.location 
                : (event.location?.address || 'Location TBD')}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.description, { color: theme.text + '99' }]} numberOfLines={2}>
          {event.description}
        </Text>
        
        <View style={styles.footer}>
          <Pressable 
            style={styles.creatorContainer}
            onPress={(e: any) => {
              e.stopPropagation();
              if (creator?.id) {
                router.push(`/profile/${creator.id}`);
              }
            }}
          >
            {creator?.photoURL ? (
              <Image
                source={{ uri: creator.photoURL }}
                style={styles.creatorImage}
              />
            ) : (
              <View style={[styles.creatorInitials, { backgroundColor: theme.primary }]}>
                <Text style={styles.initialsText}>
                  {getInitials(creator?.displayName || 'U')}
                </Text>
              </View>
            )}
            <Text style={[styles.creatorName, { color: theme.text + 'CC' }]}>
              By {creator?.displayName || 'Unknown User'}
            </Text>
          </Pressable>
          
          <View style={[styles.attendeeChip, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="people-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.attendeeText, { color: theme.primary }]}>
              {Math.floor(Math.random() * 20) + 1} attending
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  imageBadges: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
  },
  dateBadge: {
    width: 54,
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  dateDay: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  dateMonth: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Roboto',
    textTransform: 'uppercase',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Roboto',
  },
  metaInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 6,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  description: {
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
    fontFamily: 'Roboto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  creatorInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  initialsText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attendeeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
}); 