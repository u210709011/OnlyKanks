import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { EventCard } from '../../components/events/EventCard';

const dummyEvents = [
  {
    id: '1',
    title: 'Beach Party',
    date: '2024-03-20',
    location: 'Miami Beach'
  },
  {
    id: '2',
    title: 'Tech Meetup',
    date: '2024-03-22',
    location: 'Silicon Valley'
  },
  {
    id: '3',
    title: 'Food Festival',
    date: '2024-03-25',
    location: 'New York'
  }
];

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <FlashList
        data={dummyEvents}
        renderItem={({ item }) => <EventCard event={item} />}
        estimatedItemSize={300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  }
});
