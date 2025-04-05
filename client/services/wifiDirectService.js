// WiFi Direct service for peer-to-peer communication
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

class WiFiDirectService {
  constructor() {
    this.isInitialized = false;
    this.peers = new Map();
    this.connectedPeers = new Map();
    this.listeners = new Map();
    this.isDiscovering = false;
    
    // This would use a native module that would need to be implemented
    // for both Android and iOS platforms
    this.wifiDirectModule = NativeModules.WiFiDirectModule;
    
    if (this.wifiDirectModule) {
      this.eventEmitter = new NativeEventEmitter(this.wifiDirectModule);
      this.isInitialized = true;
      this.setupEventListeners();
    } else {
      console.warn('WiFi Direct native module not available');
    }
  }

  // Set up native event listeners
  setupEventListeners() {
    if (!this.isInitialized) return;
    
    // Listen for peer discovery events
    this.peerDiscoverySubscription = this.eventEmitter.addListener(
      'onPeersDiscovered',
      (event) => {
        const { peers } = event;
        peers.forEach(peer => {
          this.peers.set(peer.deviceAddress, peer);
        });
        this.notifyListeners('peersDiscovered', { peers });
      }
    );
    
    // Listen for connection events
    this.connectionSubscription = this.eventEmitter.addListener(
      'onConnectionChanged',
      (event) => {
        const { deviceAddress, connected, info } = event;
        if (connected) {
          this.connectedPeers.set(deviceAddress, info);
          this.notifyListeners('peerConnected', { deviceAddress, info });
        } else {
          this.connectedPeers.delete(deviceAddress);
          this.notifyListeners('peerDisconnected', { deviceAddress });
        }
      }
    );
    
    // Listen for received messages
    this.messageSubscription = this.eventEmitter.addListener(
      'onMessageReceived',
      (event) => {
        const { deviceAddress, data } = event;
        try {
          const message = JSON.parse(data);
          this.notifyListeners('messageReceived', { deviceAddress, message });
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }
    );
  }

  // Check if WiFi Direct is supported and available
  async isAvailable() {
    if (!this.isInitialized) return false;
    
    try {
      return await this.wifiDirectModule.isAvailable();
    } catch (error) {
      console.error('Error checking WiFi Direct availability:', error);
      return false;
    }
  }

  // Request necessary permissions
  async requestPermissions() {
    if (!this.isInitialized) return false;
    
    try {
      return await this.wifiDirectModule.requestPermissions();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // Start discovering peers
  async startDiscovery() {
    if (!this.isInitialized) {
      throw new Error('WiFi Direct not initialized');
    }
    
    try {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('WiFi Direct not available');
      }
      
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('WiFi Direct permissions not granted');
      }
      
      await this.wifiDirectModule.startDiscovery();
      this.isDiscovering = true;
      this.notifyListeners('discoveryStatus', { discovering: true });
      
      // Auto-stop discovery after 30 seconds to save battery
      setTimeout(() => {
        this.stopDiscovery();
      }, 30000);
      
      return true;
    } catch (error) {
      console.error('Error starting discovery:', error);
      this.isDiscovering = false;
      this.notifyListeners('discoveryStatus', { discovering: false, error });
      throw error;
    }
  }

  // Stop discovering peers
  async stopDiscovery() {
    if (!this.isInitialized || !this.isDiscovering) return;
    
    try {
      await this.wifiDirectModule.stopDiscovery();
      this.isDiscovering = false;
      this.notifyListeners('discoveryStatus', { discovering: false });
    } catch (error) {
      console.error('Error stopping discovery:', error);
    }
  }

  // Connect to a peer
  async connectToPeer(deviceAddress) {
    if (!this.isInitialized) {
      throw new Error('WiFi Direct not initialized');
    }
    
    try {
      await this.wifiDirectModule.connect(deviceAddress);
      return true;
    } catch (error) {
      console.error('Error connecting to peer:', error);
      this.notifyListeners('connectionError', { deviceAddress, error });
      throw error;
    }
  }

  // Disconnect from a peer
  async disconnectFromPeer(deviceAddress) {
    if (!this.isInitialized) return;
    
    try {
      if (this.connectedPeers.has(deviceAddress)) {
        await this.wifiDirectModule.disconnect(deviceAddress);
        this.connectedPeers.delete(deviceAddress);
      }
    } catch (error) {
      console.error('Error disconnecting from peer:', error);
    }
  }

  // Send a message to a connected peer
  async sendMessage(deviceAddress, message) {
    if (!this.isInitialized) {
      throw new Error('WiFi Direct not initialized');
    }
    
    if (!this.connectedPeers.has(deviceAddress)) {
      throw new Error('Peer not connected');
    }
    
    try {
      const data = JSON.stringify(message);
      await this.wifiDirectModule.sendMessage(deviceAddress, data);
      this.notifyListeners('messageSent', { deviceAddress, message });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      this.notifyListeners('messageError', { deviceAddress, error });
      throw error;
    }
  }

  // Broadcast a message to all connected peers
  async broadcastMessage(message) {
    const promises = [];
    this.connectedPeers.forEach((info, deviceAddress) => {
      promises.push(this.sendMessage(deviceAddress, message));
    });
    
    return Promise.allSettled(promises);
  }

  // Get list of discovered peers
  getPeers() {
    return Array.from(this.peers.values());
  }

  // Get list of connected peers
  getConnectedPeers() {
    return Array.from(this.connectedPeers.entries()).map(([address, info]) => ({
      deviceAddress: address,
      ...info
    }));
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

  // Notify all listeners of an event
  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Clean up resources
  destroy() {
    if (!this.isInitialized) return;
    
    this.stopDiscovery();
    
    // Disconnect all peers
    this.connectedPeers.forEach((info, deviceAddress) => {
      this.disconnectFromPeer(deviceAddress);
    });
    
    // Remove event subscriptions
    if (this.peerDiscoverySubscription) {
      this.peerDiscoverySubscription.remove();
    }
    if (this.connectionSubscription) {
      this.connectionSubscription.remove();
    }
    if (this.messageSubscription) {
      this.messageSubscription.remove();
    }
    
    // Clear all listeners
    this.listeners.clear();
  }
}

// Create singleton instance
const wifiDirectService = new WiFiDirectService();
export default wifiDirectService;