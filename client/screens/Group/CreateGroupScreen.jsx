import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { v4 as uuidv4 } from 'uuid';
import api from '../../services/api';
import meshService from '../../services/meshService';

const CreateGroupScreen = ({ navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);

  useEffect(() => {
    loadUserProfile();
    loadDownloadedVenues();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      } else {
        // If no profile exists, redirect to profile setup
        navigation.replace('ProfileSetup');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadDownloadedVenues = async () => {
    try {
      const venuesData = await AsyncStorage.getItem('downloadedVenues');
      if (venuesData) {
        const parsedVenues = JSON.parse(venuesData);
        setVenues(parsedVenues);
        if (parsedVenues.length > 0) {
          setSelectedVenue(parsedVenues[0]);
        }
      }
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const generateGroupCode = () => {
    // Generate a 6-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGroupCode(code);
    return code;
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (!selectedVenue) {
      Alert.alert('Error', 'Please select a venue');
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate a unique code if not already generated
      const code = groupCode || generateGroupCode();
      
      // Create group object
      const groupData = {
        id: uuidv4(),
        name: groupName,
        code: code,
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        creatorId: userProfile.userId,
        creatorName: userProfile.name,
        createdAt: new Date().toISOString(),
        members: [{
          userId: userProfile.userId,
          name: userProfile.name,
          photo: userProfile.photo,
          isCreator: true
        }]
      };
      
      // Save group to AsyncStorage
      await AsyncStorage.setItem('currentGroup', JSON.stringify(groupData));
      
      // Try to save to server if online
      try {
        await api.createGroup(groupData);
      } catch (error) {
        console.log('Could not save group to server, continuing in offline mode');
      }
      
      // Initialize mesh network with user info and group ID
      await meshService.initialize(
        userProfile.userId,
        userProfile.name,
        groupData.id
      );
      
      // Start mesh networking
      await meshService.startNetworking();
      
      // Navigate to the group screen
      navigation.navigate('GroupDetails', { group: groupData });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const shareGroupCode = async () => {
    if (!groupCode) {
      generateGroupCode();
      return;
    }
    
    try {
      const result = await Share.share({
        message: `Join my group "${groupName}" at the event! Use code: ${groupCode} in the ConnectX app.`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share group code');
    }
  };

  const selectVenue = (venue) => {
    setSelectedVenue(venue);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create a Group</Text>
      <Text style={styles.subtitle}>Start a group for your friends to join</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g., Taylor Swift Squad"
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.venueSection}>
        <Text style={styles.label}>Select Venue</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueList}>
          {venues.map(venue => (
            <TouchableOpacity
              key={venue.id}
              style={[
                styles.venueItem,
                selectedVenue?.id === venue.id && styles.selectedVenueItem
              ]}
              onPress={() => selectVenue(venue)}
            >
              <Text style={[
                styles.venueName,
                selectedVenue?.id === venue.id && styles.selectedVenueName
              ]}>
                {venue.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.codeContainer}>
        <Text style={styles.label}>Group Code</Text>
        <View style={styles.codeWrapper}>
          <Text style={styles.codeText}>{groupCode || 'Click to generate'}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={generateGroupCode}>
            <Icon name="refresh" size={20} color="#5C6BC0" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.shareButton} 
          onPress={shareGroupCode}
          disabled={!groupCode}
        >
          <Icon name="share" size={18} color="#fff" />
          <Text style={styles.shareButtonText}>Share Code</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={createGroup}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Creating...' : 'Create Group'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.joinButton}
        onPress={() => navigation.navigate('JoinGroup')}
      >
        <Text style={styles.joinButtonText}>Join an Existing Group</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  venueSection: {
    marginBottom: 25,
  },
  venueList: {
    flexDirection: 'row',
    marginTop: 10,
  },
  venueItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedVenueItem: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  venueName: {
    fontSize: 14,
    color: '#333',
  },
  selectedVenueName: {
    color: '#fff',
  },
  codeContainer: {
    marginBottom: 25,
  },
  codeWrapper: {
    flexDirection: 'row',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 1,
  },
  refreshButton: {
    padding: 5,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5C6BC0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  shareButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#5C6BC0',
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  joinButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 30,
    padding: 10,
  },
  joinButtonText: {
    color: '#5C6BC0',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CreateGroupScreen;