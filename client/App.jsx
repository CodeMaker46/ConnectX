import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Setup Screens
import WelcomeScreen from './screens/Setup/WelcomeScreen';
import ProfileSetupScreen from './screens/Setup/ProfileSetupScreen';
import VenueDownloadScreen from './screens/Setup/VenueDownloadScreen';

// Group Screens
import CreateGroupScreen from './screens/Group/CreateGroupScreen';
import JoinGroupScreen from './screens/Group/JoinGroupScreen';

// Concert Screens
import MapScreen from './screens/Concert/MapScreen';
import RadarScreen from './screens/Concert/RadarScreen';
import StatusUpdateScreen from './screens/Concert/StatusUpdateScreen';

// Messaging Screens
import ChatScreen from './screens/Messaging/ChatScreen';

// Settings Screen
import SettingsScreen from './screens/SettingsScreen';

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator for the app when user is in a group
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Map') {
            iconName = 'map';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#5C6BC0',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const App = () => {
  useEffect(() => {
    // Request necessary permissions on app start
    if (Platform.OS === 'android') {
      requestAndroidPermissions();
    }
  }, []);

  const requestAndroidPermissions = async () => {
    try {
      // These permissions will be handled by the bluetooth and location services
      // Implementation is in the respective service files
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
          {/* Setup Flow */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <Stack.Screen name="VenueDownload" component={VenueDownloadScreen} />
          
          {/* Group Creation/Joining */}
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="JoinGroup" component={JoinGroupScreen} />
          
          {/* Main App Flow */}
          <Stack.Screen name="GroupDetails" component={MainTabNavigator} />
          
          {/* Additional Screens */}
          <Stack.Screen name="RadarScreen" component={RadarScreen} />
          <Stack.Screen name="StatusUpdateScreen" component={StatusUpdateScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;