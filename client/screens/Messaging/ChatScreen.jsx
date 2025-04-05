import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import meshService from '../../services/meshService';

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    loadData();
    setupMeshListeners();
    
    return () => {
      // Clean up mesh listeners
      if (meshListeners) {
        Object.values(meshListeners).forEach(removeListener => removeListener());
      }
    };
  }, []);

  // Mesh service event listeners
  let meshListeners = null;
  
  const setupMeshListeners = () => {
    meshListeners = {
      messageReceived: meshService.addListener('messageReceived', (data) => {
        if (data.message.type === 'message' || data.message.type === 'status') {
          addMessage(data.message);
        }
      }),
      messageSent: meshService.addListener('messageSent', (message) => {
        if (message.type === 'message' || message.type === 'status') {
          addMessage(message);
        }
      }),
    };
  };

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
        const group = JSON.parse(groupData);
        setCurrentGroup(group);
        setGroupMembers(group.members || []);
      }
      
      // Load saved messages
      const savedMessages = await AsyncStorage.getItem('groupMessages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addMessage = (message) => {
    setMessages(prevMessages => {
      // Check if message already exists (by ID)
      if (message.id && prevMessages.some(m => m.id === message.id)) {
        return prevMessages;
      }
      
      const updatedMessages = [...prevMessages, message];
      
      // Sort by timestamp
      updatedMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Save to AsyncStorage
      AsyncStorage.setItem('groupMessages', JSON.stringify(updatedMessages));
      
      return updatedMessages;
    });
    
    // Scroll to bottom
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !userProfile || !currentGroup) {
      return;
    }

    setIsSending(true);

    try {
      // Send via mesh network
      await meshService.sendMessage(inputText.trim());
      
      // Clear input
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.userId === userProfile?.userId;
    const sender = groupMembers.find(member => member.userId === item.userId);
    const senderName = sender?.name || item.username || 'Unknown';
    
    // Format timestamp
    const messageDate = new Date(item.timestamp);
    const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Check if it's a status update or regular message
    const isStatusUpdate = item.type === 'status';
    
    if (isStatusUpdate) {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.statusContent}>
            <Text style={styles.statusSender}>{senderName}</Text>
            <Text style={styles.statusText}>{item.text}</Text>
            <Text style={styles.messageTime}>{timeString}</Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={[styles.messageContainer, isCurrentUser ? styles.userMessageContainer : {}]}>
        {!isCurrentUser && (
          <View style={styles.avatarContainer}>
            {sender?.photo ? (
              <Image source={{ uri: sender.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{senderName.charAt(0)}</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[styles.messageBubble, isCurrentUser ? styles.userMessageBubble : {}]}>
          {!isCurrentUser && (
            <Text style={styles.messageSender}>{senderName}</Text>
          )}
          <Text style={[styles.messageText, isCurrentUser ? styles.userMessageText : {}]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isCurrentUser ? styles.userMessageTime : {}]}>
            {timeString}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentGroup ? currentGroup.name : 'Group Chat'}
        </Text>
        <TouchableOpacity 
          style={styles.statusButton}
          onPress={() => navigation.navigate('StatusUpdateScreen')}
        >
          <Icon name="announcement" size={24} color="#5C6BC0" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item.id || `msg-${index}`}
        contentContainerStyle={styles.messageList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
          onPress={sendMessage}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
    flex: 1,
    textAlign: 'center',
  },
  statusButton: {
    padding: 5,
  },
  messageList: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userMessageBubble: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  messageSender: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#5C6BC0',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  userMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  statusContent: {
    backgroundColor: 'rgba(92, 107, 192, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '80%',
  },
  statusSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5C6BC0',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginVertical: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
});

export default ChatScreen;