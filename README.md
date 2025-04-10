# OnlyKanks

A feature-rich mobile application for creating, discovering, and managing events. Connect with friends, join local activities, and organize your own events with ease.

## 📱 Features

### Event Management
- **Create Events** with detailed information:
  - Title, date, time, and location with interactive map integration
  - Customizable duration (days, hours, minutes)
  - Capacity settings with participant management
  - Detailed address information
  - Description and image uploads
  - Smart visual indication for expired events

- **Event Discovery**:
  - Browse events in list or map view
  - Filter events by location, date, and other criteria
  - Search functionality to find specific events
  - See upcoming and past events

- **Event Participation**:
  - Join events with a single tap
  - Request to join capacity-limited events
  - Manage participant requests as an event creator
  - View event details including attendees, location, and timing

### User Experience
- **Profile Management**:
  - Customizable user profiles with bio and profile picture
  - View created and joined events
  - Toggle between grid and list views
  - Follow other users

- **Social Features**:
  - Friend system with friend requests
  - Direct messaging between users
  - Event invitations
  - Activity feed of friends' events

### Smart Functionality
- **Intelligent Event Display**:
  - Expired events are visually marked with darker tones
  - Events reaching capacity show appropriate indicators
  - Duration displayed in user-friendly format (days, hours, minutes)

- **Participant Management**:
  - Add guests or invite app users
  - Edit participant information
  - Accept or decline join requests
  - Validation to prevent exceeding event capacity

## 🛠️ Technologies

- **Frontend**:
  - React Native with Expo framework
  - TypeScript for type safety
  - Expo Router for navigation
  - Context API for state management

- **Backend & Storage**:
  - Firebase Authentication for user management
  - Firestore for database
  - Firebase Storage for media
  - Cloudinary for image processing and optimization

- **Maps & Location**:
  - React Native Maps
  - Geolocation services
  - Location-based event discovery

## 📋 Requirements

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Firebase account
- Cloudinary account (for image uploads)

## 🚀 Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/OnlyKanks.git
   cd OnlyKanks
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with your Firebase and Cloudinary credentials:
   ```
   FIREBASE_API_KEY=your-api-key
   FIREBASE_AUTH_DOMAIN=your-auth-domain
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-storage-bucket
   FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   FIREBASE_APP_ID=your-app-id
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. Start the development server:
   ```bash
   npx expo start
   ```
   In case you have a problem with starting the development server:
   ```
   npx expo start --tunnel
   ```

5. Use the Expo Go app on your mobile device or an emulator to run the application

## 📱 Main App Screens

- **Home**: Discover events in your area
- **Friends**: Manage your friends and see their activities
- **Create Event**: Create and customize new events
- **Messages**: Chat with friends and event participants
- **Profile**: View and edit your profile information
- **Settings**: Configure app preferences and account settings

## 🔒 Security Features

- Secure Firebase authentication for user management
- Data validation and security rules for Firestore
- Proper permission management for event participation
- Secure storage for user data and images

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Firebase for backend services
- Expo team for the React Native framework
- Open source community for various libraries used in this project