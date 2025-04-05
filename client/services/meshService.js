// Mesh networking service for ConnectX app
import { Platform } from 'react-native';
import bluetoothService from './bluetoothService';
import wifiDirectService from './wifiDirectService';

class MeshService {
  constructor() {
    this.nodes = new Map(); // Connected peers/nodes
    this.messages = new Map(); // Message cache for deduplication
    this.listeners = new Map(); // Event listeners
    this.userId = null; // Current user ID
    this.groupId = null; // Current group ID
    this.username = null; // Current username
    this.location = null; // Current location
    this.messageTimeout = 60000; // Message TTL (1 minute)
    this.locationUpdateInterval = 10000; // Location update interval (10 seconds)
    this.locationUpdateTimer = null;
    
    // Initialize services
    this.initializeServices();
  }

  // Initialize Bluetooth and WiFi Direct services
  async initializeServices() {
    // Set up Bluetooth listeners
    this.bluetoothListeners = {
      deviceConnected: bluetoothService.addListener('deviceConnected', (data) => {
        this.handleNodeConnected('bluetooth', data.device.id, data.device);
      }),
      deviceDisconnected: bluetoothService.addListener('deviceDisconnected', (data) => {
        this.handleNodeDisconnected('bluetooth', data.deviceId);
      }),
      messageReceived: bluetoothService.addListener('messageReceived', (data) => {
        this.handleMessageReceived('bluetooth', data.deviceId, data.message);
      })
    };
    
    // Set up WiFi Direct listeners
    this.wifiDirectListeners = {
      peerConnected: wifiDirectService.addListener('peerConnected', (data) => {
        this.handleNodeConnected('wifiDirect', data.deviceAddress, data.info);
      }),
      peerDisconnected: wifiDirectService.addListener('peerDisconnected', (data) => {
        this.handleNodeDisconnected('wifiDirect', data.deviceAddress);
      }),
      messageReceived: wifiDirectService.addListener('messageReceived', (data) => {
        this.handleMessageReceived('wifiDirect', data.deviceAddress, data.message);
      })
    };
  }

  // Initialize mesh network with user info
  async initialize(userId, username, groupId) {
    this.userId = userId;
    this.username = username;
    this.groupId = groupId;
    
    // Clear existing data
    this.nodes.clear();
    this.messages.clear();
    
    // Start location updates
    this.startLocationUpdates();
    
    // Notify listeners
    this.notifyListeners('initialized', { userId, username, groupId });
    
    return true;
  }

  // Start discovering and connecting to peers
  async startNetworking() {
    try {
      // Start Bluetooth scanning
      await bluetoothService.startScan();
      
      // Start WiFi Direct discovery if available
      const wifiDirectAvailable = await wifiDirectService.isAvailable();
      if (wifiDirectAvailable) {
        await wifiDirectService.startDiscovery();
      }
      
      this.notifyListeners('networkingStarted', { bluetooth: true, wifiDirect: wifiDirectAvailable });
      return true;
    } catch (error) {
      console.error('Error starting networking:', error);
      this.notifyListeners('networkingError', { error });
      return false;
    }
  }

  // Stop networking
  async stopNetworking() {
    bluetoothService.stopScan();
    await wifiDirectService.stopDiscovery();
    
    // Disconnect from all nodes
    this.nodes.forEach((node, nodeId) => {
      if (node.type === 'bluetooth') {
        bluetoothService.disconnectDevice(nodeId);
      } else if (node.type === 'wifiDirect') {
        wifiDirectService.disconnectFromPeer(nodeId);
      }
    });
    
    // Clear nodes
    this.nodes.clear();
    
    // Stop location updates
    this.stopLocationUpdates();
    
    this.notifyListeners('networkingStopped', {});
  }

  // Update current location
  updateLocation(location) {
    this.location = location;
    
    // Broadcast location to all connected nodes
    this.broadcastMessage({
      type: 'location',
      userId: this.userId,
      username: this.username,
      groupId: this.groupId,
      location,
      timestamp: Date.now()
    });
    
    this.notifyListeners('locationUpdated', { userId: this.userId, location });
  }

  // Start periodic location updates
  startLocationUpdates() {
    // Clear any existing timer
    this.stopLocationUpdates();
    
    // Set up new timer
    this.locationUpdateTimer = setInterval(() => {
      if (this.location) {
        this.updateLocation(this.location);
      }
    }, this.locationUpdateInterval);
  }

  // Stop periodic location updates
  stopLocationUpdates() {
    if (this.locationUpdateTimer) {
      clearInterval(this.locationUpdateTimer);
      this.locationUpdateTimer = null;
    }
  }

  // Send a message to the mesh network
  sendMessage(message) {
    if (!this.userId || !this.groupId) {
      throw new Error('Mesh network not initialized');
    }
    
    const messageData = {
      id: `${this.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'message',
      userId: this.userId,
      username: this.username,
      groupId: this.groupId,
      content: message,
      timestamp: Date.now(),
      ttl: this.messageTimeout
    };
    
    // Add to message cache
    this.messages.set(messageData.id, {
      ...messageData,
      expires: Date.now() + this.messageTimeout
    });
    
    // Broadcast to all nodes
    this.broadcastMessage(messageData);
    
    // Notify listeners
    this.notifyListeners('messageSent', messageData);
    
    return messageData.id;
  }

  // Broadcast a message to all connected nodes
  async broadcastMessage(message) {
    // Don't broadcast if not initialized
    if (!this.userId || !this.groupId) return;
    
    // Add message to cache if it has an ID
    if (message.id && !this.messages.has(message.id)) {
      this.messages.set(message.id, {
        ...message,
        expires: Date.now() + this.messageTimeout
      });
    }
    
    // Send via Bluetooth
    const bluetoothPromises = [];
    this.nodes.forEach((node, nodeId) => {
      if (node.type === 'bluetooth') {
        bluetoothPromises.push(bluetoothService.sendMessage(nodeId, message));
      }
    });
    
    // Send via WiFi Direct
    const wifiDirectPromises = [];
    this.nodes.forEach((node, nodeId) => {
      if (node.type === 'wifiDirect') {
        wifiDirectPromises.push(wifiDirectService.sendMessage(nodeId, message));
      }
    });
    
    // Wait for all messages to be sent
    await Promise.allSettled([...bluetoothPromises, ...wifiDirectPromises]);
  }

  // Handle node connected event
  handleNodeConnected(type, nodeId, info) {
    // Add to nodes map
    this.nodes.set(nodeId, { type, info, connectedAt: Date.now() });
    
    // Notify listeners
    this.notifyListeners('nodeConnected', { type, nodeId, info });
    
    // Send current user info
    if (this.userId && this.groupId) {
      const userInfo = {
        type: 'user',
        userId: this.userId,
        username: this.username,
        groupId: this.groupId,
        timestamp: Date.now()
      };
      
      if (type === 'bluetooth') {
        bluetoothService.sendMessage(nodeId, userInfo);
      } else if (type === 'wifiDirect') {
        wifiDirectService.sendMessage(nodeId, userInfo);
      }
      
      // Send current location if available
      if (this.location) {
        const locationInfo = {
          type: 'location',
          userId: this.userId,
          username: this.username,
          groupId: this.groupId,
          location: this.location,
          timestamp: Date.now()
        };
        
        if (type === 'bluetooth') {
          bluetoothService.sendMessage(nodeId, locationInfo);
        } else if (type === 'wifiDirect') {
          wifiDirectService.sendMessage(nodeId, locationInfo);
        }
      }
    }
  }

  // Handle node disconnected event
  handleNodeDisconnected(type, nodeId) {
    // Remove from nodes map
    if (this.nodes.has(nodeId)) {
      this.nodes.delete(nodeId);
      
      // Notify listeners
      this.notifyListeners('nodeDisconnected', { type, nodeId });
    }
  }

  // Handle received message
  handleMessageReceived(type, nodeId, message) {
    // Ignore if not initialized
    if (!this.userId || !this.groupId) return;
    
    // Ignore messages from different groups
    if (message.groupId && message.groupId !== this.groupId) return;
    
    // Check for duplicate message
    if (message.id && this.messages.has(message.id)) return;
    
    // Add to message cache if it has an ID
    if (message.id) {
      this.messages.set(message.id, {
        ...message,
        expires: Date.now() + this.messageTimeout
      });
    }
    
    // Process message based on type
    switch (message.type) {
      case 'message':
        this.notifyListeners('messageReceived', { nodeId, message });
        break;
      case 'location':
        this.notifyListeners('locationReceived', { nodeId, userId: message.userId, location: message.location });
        break;
      case 'user':
        this.notifyListeners('userInfo', { nodeId, userId: message.userId, username: message.username });
        break;
    }
    
    // Relay message to other nodes (mesh networking)
    // Don't relay if TTL expired or no TTL
    if (message.ttl && message.timestamp && (Date.now() - message.timestamp < message.ttl)) {
      this.broadcastMessage(message);
    }
  }

  // Clean up expired messages
  cleanupMessages() {
    const now = Date.now();
    this.messages.forEach((message, id) => {
      if (message.expires && message.expires < now) {
        this.messages.delete(id);
      }
    });
  }

  // Notify event listeners
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Add event listener
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event).add(callback);
    
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // Remove event listener
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // Clean up resources
  cleanup() {
    // Stop networking
    this.stopNetworking();
    
    // Remove Bluetooth listeners
    Object.values(this.bluetoothListeners).forEach(removeListener => removeListener());
    
    // Remove WiFi Direct listeners
    Object.values(this.wifiDirectListeners).forEach(removeListener => removeListener());
    
    // Clear data
    this.nodes.clear();
    this.messages.clear();
    this.listeners.clear();
  }
}

export default new MeshService();