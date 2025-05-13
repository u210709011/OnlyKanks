import { Ionicons } from '@expo/vector-icons';

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  subCategories: SubCategory[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'sports-fitness',
    name: 'Sports & Fitness',
    icon: 'fitness',
    subCategories: [
      { id: 'football', name: 'Football' },
      { id: 'basketball', name: 'Basketball' },
      { id: 'volleyball', name: 'Volleyball' },
      { id: 'running', name: 'Running' },
      { id: 'hiking', name: 'Hiking' },
      { id: 'cycling', name: 'Cycling' },
      { id: 'gym-workout', name: 'Gym Workout' },
      { id: 'tennis', name: 'Tennis' },
      { id: 'martial-arts', name: 'Martial Arts' },
    ]
  },
  {
    id: 'games-activities',
    name: 'Games & Activities',
    icon: 'game-controller',
    subCategories: [
      { id: 'board-games', name: 'Board Games' },
      { id: 'card-games', name: 'Card Games' },
      { id: 'video-games', name: 'Video Games' },
      { id: 'escape-room', name: 'Escape Room' },
      { id: 'quiz-night', name: 'Quiz Night' },
      { id: 'karaoke', name: 'Karaoke' },
    ]
  },
  {
    id: 'social-meetups',
    name: 'Social Meetups',
    icon: 'people',
    subCategories: [
      { id: 'casual-chat', name: 'Casual Chat' },
      { id: 'meal-together', name: 'Meal Together' },
      { id: 'park-hangout', name: 'Park Hangout' },
      { id: 'book-club', name: 'Book Club' },
      { id: 'deep-conversation', name: 'Deep Conversation' },
    ]
  },
  {
    id: 'arts-culture',
    name: 'Arts & Culture',
    icon: 'color-palette',
    subCategories: [
      { id: 'concert', name: 'Concert' },
      { id: 'cinema', name: 'Cinema' },
      { id: 'theatre', name: 'Theatre' },
      { id: 'art-exhibition', name: 'Art Exhibition' },
      { id: 'photography-walk', name: 'Photography Walk' },
      { id: 'creative-workshop', name: 'Creative Workshop' },
    ]
  },
  {
    id: 'nightlife',
    name: 'Nightlife',
    icon: 'moon',
    subCategories: [
      { id: 'bar-night', name: 'Bar Night' },
      { id: 'clubbing', name: 'Clubbing' },
      { id: 'live-music', name: 'Live Music' },
      { id: 'meyhane-night', name: 'Meyhane Night' },
      { id: 'raki-fish', name: 'Rakı and Fish' },
    ]
  },
  {
    id: 'food-events',
    name: 'Food Events',
    icon: 'restaurant',
    subCategories: [
      { id: 'street-food-tour', name: 'Street Food Tour' },
      { id: 'new-restaurant-tryout', name: 'New Restaurant Tryout' },
      { id: 'cooking-together', name: 'Cooking Together' },
      { id: 'bbq', name: 'BBQ' },
      { id: 'traditional-breakfast', name: 'Traditional Breakfast' },
    ]
  },
  {
    id: 'learning-growth',
    name: 'Learning & Growth',
    icon: 'school',
    subCategories: [
      { id: 'language-exchange', name: 'Language Exchange' },
      { id: 'study-group', name: 'Study Group' },
      { id: 'book-discussion', name: 'Book Discussion' },
      { id: 'guest-talk', name: 'Guest Talk' },
      { id: 'skill-sharing', name: 'Skill-sharing' },
    ]
  },
  {
    id: 'outdoors-nature',
    name: 'Outdoors & Nature',
    icon: 'leaf',
    subCategories: [
      { id: 'camping', name: 'Camping' },
      { id: 'picnic', name: 'Picnic' },
      { id: 'beach-day', name: 'Beach Day' },
      { id: 'nature-walk', name: 'Nature Walk' },
      { id: 'fishing', name: 'Fishing' },
      { id: 'horseback-riding', name: 'Horseback Riding' },
    ]
  },
  {
    id: 'wellness',
    name: 'Wellness',
    icon: 'medkit',
    subCategories: [
      { id: 'yoga', name: 'Yoga' },
      { id: 'meditation', name: 'Meditation' },
      { id: 'mental-health-support', name: 'Mental Health Support' },
      { id: 'wellness-walk', name: 'Wellness Walk' },
      { id: 'spa-day', name: 'Spa Day' },
    ]
  },
  {
    id: 'family-kids',
    name: 'Family & Kids',
    icon: 'happy',
    subCategories: [
      { id: 'playdate', name: 'Playdate' },
      { id: 'kid-event', name: 'Kid Event' },
      { id: 'storytime', name: 'Storytime' },
      { id: 'parent-meetup', name: 'Parent Meetup' },
      { id: 'family-picnic', name: 'Family Picnic' },
    ]
  },
  {
    id: 'hobbies-interests',
    name: 'Hobbies & Interests',
    icon: 'heart',
    subCategories: [
      { id: 'pet-meetup', name: 'Pet Meetup' },
      { id: 'photography', name: 'Photography' },
      { id: 'car-enthusiasts', name: 'Car Enthusiasts' },
      { id: 'cosplay', name: 'Cosplay' },
      { id: 'dance', name: 'Dance' },
      { id: 'crafts', name: 'Crafts' },
    ]
  },
  {
    id: 'professional-networking',
    name: 'Professional & Networking',
    icon: 'briefcase',
    subCategories: [
      { id: 'startup-meetup', name: 'Startup Meetup' },
      { id: 'industry-networking', name: 'Industry Networking' },
      { id: 'coworking', name: 'Coworking' },
      { id: 'freelancer-meetup', name: 'Freelancer Meetup' },
      { id: 'tech-talk', name: 'Tech Talk' },
    ]
  },
];

export class CategoriesService {
  static getCategories(): Category[] {
    return CATEGORIES;
  }

  static getCategoryById(categoryId: string): Category | undefined {
    return CATEGORIES.find(category => category.id === categoryId);
  }

  static getSubCategoryById(categoryId: string, subCategoryId: string): SubCategory | undefined {
    const category = this.getCategoryById(categoryId);
    return category?.subCategories.find(subCategory => subCategory.id === subCategoryId);
  }

  static getCategoryNameById(categoryId: string): string {
    const category = this.getCategoryById(categoryId);
    return category ? category.name : 'Uncategorized';
  }

  static getSubCategoryNameById(categoryId: string, subCategoryId: string): string {
    const subCategory = this.getSubCategoryById(categoryId, subCategoryId);
    return subCategory ? subCategory.name : 'Uncategorized';
  }

  static getCategoryIconById(categoryId: string): keyof typeof Ionicons.glyphMap {
    const category = this.getCategoryById(categoryId);
    return category ? category.icon : 'help-circle';
  }
} 