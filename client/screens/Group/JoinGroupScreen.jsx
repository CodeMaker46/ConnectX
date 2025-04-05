import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../services/api';
import meshService from '../../services/meshService';

const JoinGroupScreen = ({ navigation }) => {
  const [groupCode, setGroupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadUserProfile();
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

  const joinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert('Error', 'Please enter a group code');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      // Try to find group on server first
      let group;
      try {
        const response = await api.findGroupByCode(groupCode.trim().toUpperCase());
        group = response.data;
      } catch (error) {
        console.log('Could not find group on server, will try mesh network');
      }

      if (!group) {
        // If not found on server, try to find via mesh network
        // For now, we'll simulate this with a timeout
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For demo purposes, we'll create a mock group
        // In a real app, this would come from the mesh network
        group = {
          id: 'local-' + Date.now(),
          name: 'Local Group',
          code: groupCode.trim().toUpperCase(),
          venueId: 'venue-1',
          venueName: 'Concert Arena',
          creatorId: 'unknown',
          creatorName: 'Unknown',
          createdAt: new Date().toISOString(),
          members: []
        };
      }

      // Add current user to group members
      if (!group.members.some(member => member.userId === userProfile.userId)) {
        group.members.push({
          userId: userProfile.userId,
          name: userProfile.name,
          photo: userProfile.photo,
          isCreator: false
        });
      }

      // Save group to AsyncStorage
      await AsyncStorage.setItem('currentGroup', JSON.stringify(group));

      // Initialize mesh network with user info and group ID
      await meshService.initialize(
        userProfile.userId,
        userProfile.name,
        group.id
      );

      // Start mesh networking
      await meshService.startNetworking();

      // Navigate to the group screen
      navigation.navigate('GroupDetails', { group });
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Group</Text>
      <Text style={styles.subtitle}>Enter the code shared by your friend</Text>

      <View style={styles.codeInputContainer}>
        <TextInput
          style={styles.codeInput}
          value={groupCode}
          onChangeText={text => setGroupCode(text.toUpperCase())}
          placeholder="Enter group code"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          maxLength={6}
          textAlign="center"
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={joinGroup}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Join Group</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Icon name="info-outline" size={20} color="#78909C" />
        <Text style={styles.infoText}>
          Ask your friend to share their group code with you. The code is a 6-character code shown on their screen.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateGroup')}
      >
        <Text style={styles.createButtonText}>Create a New Group</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 60,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  codeInput: {
    height: 70,
    borderWidth: 2,
    borderColor: '#5C6BC0',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f9f9f9',
    letterSpacing: 5,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#5C6BC0',
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
    padding: 15,
    marginTop: 30,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#546E7A',
    marginLeft: 10,
    lineHeight: 20,
  },
  createButton: {
    marginTop: 40,
    padding: 10,
  },
  createButtonText: {
    color: '#5C6BC0',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default JoinGroupScreen;