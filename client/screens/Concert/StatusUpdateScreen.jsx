import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import meshService from '../../services/meshService';

const StatusUpdateScreen = ({ navigation }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [customStatus, setCustomStatus] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recentStatuses, setRecentStatuses] = useState([]);

  // Predefined status updates
  const predefinedStatuses = [
    { id: 1, text: 'At main stage', icon: 'music-note' },
    { id: 2, text: 'Getting food', icon: 'restaurant' },
    { id: 3, text: 'At restroom', icon: 'wc' },
    { id: 4, text: 'Taking a break', icon: 'pause' },
    { id: 5, text: 'Heading to exit', icon: 'exit-to-app' },
    { id: 6, text: 'Need help!', icon: 'sos' },
    { id: 7, text: 'On my way', icon: 'directions-walk' },
    { id: 8, text: 'Meet me here', icon: 'place' },
  ];

  useEffect(() => {
    loadData();
    loadRecentStatuses();
  }, []);

  const loadData = async () => {
    try {
      // Load user profile
      const profileData = await AsyncStorage.getItem('userProfile');
      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      }
      
      // Load current group
      const groupData = await AsyncStorage.getItem('currentGroup');
      if (groupData) {
        setCurrentGroup(JSON.parse(groupData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadRecentStatuses = async () => {
    try {
      const statusData = await AsyncStorage.getItem('recentStatuses');
      if (statusData) {
        setRecentStatuses(JSON.parse(statusData));
      }
    } catch (error) {
      console.error('Error loading recent statuses:', error);
    }
  };

  const saveRecentStatus = async (status) => {
    try {
      // Add to recent statuses (keep only last 5)
      const updatedStatuses = [status, ...recentStatuses.slice(0, 4)];
      setRecentStatuses(updatedStatuses);
      await AsyncStorage.setItem('recentStatuses', JSON.stringify(updatedStatuses));
    } catch (error) {
      console.error('Error saving recent status:', error);
    }
  };

  const sendStatusUpdate = async (statusText) => {
    if (!statusText.trim() || !userProfile || !currentGroup) {
      return;
    }

    setIsSending(true);

    try {
      // Create status message
      const statusMessage = {
        type: 'status',
        text: statusText,
        timestamp: Date.now(),
      };

      // Send via mesh network
      await meshService.sendMessage(statusMessage);
      
      // Save to recent statuses
      await saveRecentStatus(statusText);

      // Show success message
      Alert.alert('Success', 'Status update sent to your group');
      
      // Clear custom status if that was used
      setCustomStatus('');
      
      // Go back to previous screen
      navigation.goBack();
    } catch (error) {
      console.error('Error sending status update:', error);
      Alert.alert('Error', 'Failed to send status update');
    } finally {
      setIsSending(false);
    }
  };

  const handleCustomStatusSend = () => {
    if (!customStatus.trim()) {
      Alert.alert('Error', 'Please enter a status message');
      return;
    }
    
    sendStatusUpdate(customStatus);
  };

  const renderPredefinedStatus = ({ item }) => (
    <TouchableOpacity 
      style={styles.statusItem} 
      onPress={() => sendStatusUpdate(item.text)}
      disabled={isSending}
    >
      <Icon name={item.icon} size={24} color="#5C6BC0" style={styles.statusIcon} />
      <Text style={styles.statusText}>{item.text}</Text>
    </TouchableOpacity>
  );

  const renderRecentStatus = ({ item }) => (
    <TouchableOpacity 
      style={styles.recentItem} 
      onPress={() => sendStatusUpdate(item)}
      disabled={isSending}
    >
      <Icon name="history" size={18} color="#78909C" style={styles.recentIcon} />
      <Text style={styles.recentText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Status Update</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Quick Status</Text>
        <FlatList
          data={predefinedStatuses}
          renderItem={renderPredefinedStatus}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.statusGrid}
        />

        {recentStatuses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Updates</Text>
            <FlatList
              data={recentStatuses}
              renderItem={renderRecentStatus}
              keyExtractor={(item, index) => `recent-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Custom Status</Text>
        <View style={styles.customInputContainer}>
          <TextInput
            style={styles.customInput}
            value={customStatus}
            onChangeText={setCustomStatus}
            placeholder="Type your status..."
            placeholderTextColor="#999"
            multiline
            maxLength={100}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !customStatus.trim() && styles.sendButtonDisabled]} 
            onPress={handleCustomStatusSend}
            disabled={!customStatus.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34, // Same width as back button for centering title
  },
  content: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  statusGrid: {
    paddingBottom: 10,
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    margin: 5,
    minHeight: 60,
  },
  statusIcon: {
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  recentList: {
    paddingBottom: 10,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  recentIcon: {
    marginRight: 5,
  },
  recentText: {
    fontSize: 14,
    color: '#333',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
    minHeight: 50,
  },
  sendButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
});

export default StatusUpdateScreen;