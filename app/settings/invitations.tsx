import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { Event, AttendeeStatus, ParticipantType } from '../../services/events.service';
import { format } from 'date-fns';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

interface InvitationEvent {
  id: string;
  title: string;
  imageUrl?: string;
  creatorName: string;
  date: Date;
}

export default function InvitationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [invitations, setInvitations] = useState<InvitationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      const userId = auth.currentUser.uid;
      
      // Find events where the user is in participants with INVITED status
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      
      const invitedEvents: InvitationEvent[] = [];
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data() as Event;
        const participants = eventData.participants || [];
        
        // Check if user is invited to this event
        const isInvited = participants.some(
          p => p.id === userId && p.type === ParticipantType.USER && p.status === AttendeeStatus.INVITED
        );
        
        if (isInvited) {
          // Get creator info
          let creatorName = 'Event Creator';
          try {
            const creatorDoc = await getDoc(doc(db, 'users', eventData.createdBy));
            if (creatorDoc.exists()) {
              creatorName = creatorDoc.data().displayName || 'Event Creator';
            }
          } catch (err) {
            console.error('Error fetching creator:', err);
          }
          
          invitedEvents.push({
            id: eventDoc.id,
            title: eventData.title,
            imageUrl: eventData.imageUrl,
            creatorName,
            date: eventData.date.toDate()
          });
        }
      }
      
      setInvitations(invitedEvents);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (eventId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const userId = auth.currentUser.uid;
      
      // Get the event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data() as Event;
      const participants = eventData.participants || [];
      
      // Find the user's participant entry and update its status
      const updatedParticipants = participants.map(p => {
        if (p.id === userId && p.status === AttendeeStatus.INVITED) {
          return {
            ...p,
            status: AttendeeStatus.ACCEPTED,
            // Update name and photo from current user if available
            name: auth.currentUser?.displayName || p.name,
            photoURL: auth.currentUser?.photoURL || p.photoURL
          };
        }
        return p;
      });
      
      // Update the event
      await updateDoc(doc(db, 'events', eventId), {
        participants: updatedParticipants
      });
      
      // Remove this invitation from the local state
      setInvitations(invitations.filter(inv => inv.id !== eventId));
      Alert.alert('Success', 'Invitation accepted');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDecline = async (eventId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const userId = auth.currentUser.uid;
      
      // Get the event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data() as Event;
      const participants = eventData.participants || [];
      
      // Remove the user from participants or change status to REJECTED
      const updatedParticipants = participants.filter(
        p => !(p.id === userId && p.status === AttendeeStatus.INVITED)
      );
      
      // Update the event
      await updateDoc(doc(db, 'events', eventId), {
        participants: updatedParticipants
      });
      
      // Remove this invitation from the local state
      setInvitations(invitations.filter(inv => inv.id !== eventId));
      Alert.alert('Success', 'Invitation declined');
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  const renderInvitation = ({ item }: { item: InvitationEvent }) => (
    <View style={[styles.invitationCard, { backgroundColor: theme.card }]}>
      <View style={styles.eventInfo}>
        <TouchableOpacity 
          style={styles.eventHeader}
          onPress={() => router.push(`/event/${item.id}`)}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
          ) : (
            <View style={[styles.eventImagePlaceholder, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </View>
          )}
          <View style={styles.eventDetails}>
            <Text style={[styles.eventTitle, { color: theme.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.inviterName, { color: theme.text + '80' }]}>
              From: {item.creatorName}
            </Text>
            <Text style={[styles.invitationDate, { color: theme.text + '60' }]}>
              {format(item.date, 'MMM d, yyyy')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.declineButton, { borderColor: theme.error }]} 
          onPress={() => handleDecline(item.id)}
        >
          <Text style={[styles.buttonText, { color: theme.error }]}>Decline</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton, { backgroundColor: theme.primary }]} 
          onPress={() => handleAccept(item.id)}
        >
          <Text style={[styles.buttonText, { color: 'white' }]}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Event Invitations',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      />
      
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.primary} />
      ) : invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={48} color={theme.text + '40'} />
          <Text style={[styles.emptyText, { color: theme.text }]}>No invitations</Text>
          <Text style={[styles.emptySubtext, { color: theme.text + '80' }]}>
            You don't have any pending event invitations
          </Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id}
          renderItem={renderInvitation}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  list: {
    padding: 16,
  },
  invitationCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventInfo: {
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  eventImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inviterName: {
    fontSize: 14,
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontWeight: '500',
  },
}); 