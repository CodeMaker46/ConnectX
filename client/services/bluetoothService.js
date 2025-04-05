// Bluetooth service for peer-to-peer communication
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform, PermissionsAndroid } from 'react-native';

class BluetoothService {
  constructor() {
    this.bleManager = new BleManager();
    this.devices = new Map();
    this.isScanning = false;
    this.listeners = new Map();
    this.connectedDevices = new Map();
    this.serviceUUID = '4FAFC201-1FB5-459E-8FCC-C5C9C331914B';
    this.characteristicUUID = 'BEB5483E-36E1-4688-B7F5-EA07361B26A8';
    
    // Initialize event listeners
    this.initListeners();
  }

  // Initialize BLE event listeners
  initListeners() {
    this.stateSubscription = this.bleManager.onStateChange((state) => {
      console.log('Bluetooth state changed to:', state);
      if (state === 'PoweredOn') {
        this.notifyListeners('stateChange', { state });
      }
    }, true);
  }

  // Request necessary permissions for BLE
  async requestPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      
      return (
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    
    return true; // iOS handles permissions differently
  }

  // Start scanning for nearby devices
  async startScan() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Bluetooth permissions not granted');
      }
      
      if (this.isScanning) {
        return;
      }
      
      this.isScanning = true;
      this.notifyListeners('scanStatus', { scanning: true });
      
      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          this.isScanning = false;
          this.notifyListeners('scanStatus', { scanning: false, error });
          return;
        }
        
        if (device && device.name) {
          // Only track devices with names (likely to be user devices)
          this.devices.set(device.id, device);
          this.notifyListeners('deviceFound', { device });
        }
      });
      
      // Stop scan after 10 seconds to save battery
      setTimeout(() => {
        this.stopScan();
      }, 10000);
    } catch (error) {
      console.error('Error starting scan:', error);
      this.isScanning = false;
      this.notifyListeners('scanStatus', { scanning: false, error });
    }
  }

  // Stop scanning for devices
  stopScan() {
    if (this.isScanning) {
      this.bleManager.stopDeviceScan();
      this.isScanning = false;
      this.notifyListeners('scanStatus', { scanning: false });
    }
  }

  // Connect to a specific device
  async connectToDevice(deviceId) {
    try {
      const device = await this.bleManager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      
      this.connectedDevices.set(deviceId, device);
      this.notifyListeners('deviceConnected', { device });
      
      // Set up notification listener for incoming messages
      device.monitorCharacteristicForService(
        this.serviceUUID,
        this.characteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error('Notification error:', error);
            return;
          }
          
          if (characteristic?.value) {
            const data = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            try {
              const message = JSON.parse(data);
              this.notifyListeners('messageReceived', { deviceId, message });
            } catch (e) {
              console.error('Error parsing message:', e);
            }
          }
        }
      );
      
      return device;
    } catch (error) {
      console.error('Connection error:', error);
      this.notifyListeners('connectionError', { deviceId, error });
      throw error;
    }
  }

  // Disconnect from a device
  async disconnectDevice(deviceId) {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (device) {
        await device.cancelConnection();
        this.connectedDevices.delete(deviceId);
        this.notifyListeners('deviceDisconnected', { deviceId });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  // Send a message to a connected device
  async sendMessage(deviceId, message) {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device) {
        throw new Error('Device not connected');
      }
      
      const data = JSON.stringify(message);
      const encodedData = Buffer.from(data).toString('base64');
      
      await device.writeCharacteristicWithResponseForService(
        this.serviceUUID,
        this.characteristicUUID,
        encodedData
      );
      
      this.notifyListeners('messageSent', { deviceId, message });
      return true;
    } catch (error) {
      console.error('Send message error:', error);
      this.notifyListeners('messageError', { deviceId, error });
      throw error;
    }
  }

  // Broadcast a message to all connected devices
  async broadcastMessage(message) {
    const promises = [];
    this.connectedDevices.forEach((device, deviceId) => {
      promises.push(this.sendMessage(deviceId, message));
    });
    
    return Promise.allSettled(promises);
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
    this.stopScan();
    
    // Disconnect all devices
    this.connectedDevices.forEach((device, deviceId) => {
      this.disconnectDevice(deviceId);
    });
    
    // Remove state subscription
    if (this.stateSubscription) {
      this.stateSubscription.remove();
    }
    
    // Clear all listeners
    this.listeners.clear();
  }
}

// Create singleton instance
const bluetoothService = new BluetoothService();
export default bluetoothService;