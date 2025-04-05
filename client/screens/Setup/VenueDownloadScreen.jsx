import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../../services/api';

const VenueDownloadScreen = ({ navigation }) => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [downloadedVenues, setDownloadedVenues] = useState([]);

  useEffect(() => {
    fetchVenues();
    loadDownloadedVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const response = await api.getVenues();
      setVenues(response.data);
    } catch (error) {
      console.error('Error fetching venues:', error);
      Alert.alert('Error', 'Failed to load venues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDownloadedVenues = async () => {
    try {
      const storedVenues = await AsyncStorage.getItem('downloadedVenues');
      if (storedVenues) {
        setDownloadedVenues(JSON.parse(storedVenues));
      }
    } catch (error) {
      console.error('Error loading downloaded venues:', error);
    }
  };

  const downloadVenue = async (venue) => {
    try {
      setDownloading(venue.id);
      
      // Simulate download delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add venue to downloaded list with default rally points
      const venueWithPoints = {
        ...venue,
        rallyPoints: [
          { id: 1, name: 'Main Entrance', x: 100, y: 50 },
          { id: 2, name: 'Food Court', x: 300, y: 200 },
        ],
        importantLocations: [
          { id: 1, name: 'Main Stage', type: 'stage', x: 250, y: 150 },
          { id: 2, name: 'Restrooms', type: 'restroom', x: 150, y: 250 },
          { id: 3, name: 'Emergency Exit', type: 'exit', x: 350, y: 50 },
          { id: 4, name: 'First Aid', type: 'medical', x: 200, y: 300 },
        ]
      };
      
      const updatedDownloads = [...downloadedVenues, venueWithPoints];
      setDownloadedVenues(updatedDownloads);
      await AsyncStorage.setItem('downloadedVenues', JSON.stringify(updatedDownloads));
      
      Alert.alert('Success', `${venue.name} map downloaded successfully`);
    } catch (error) {
      console.error('Error downloading venue:', error);
      Alert.alert('Error', 'Failed to download venue map');
    } finally {
      setDownloading(null);
    }
  };

  const isVenueDownloaded = (venueId) => {
    return downloadedVenues.some(venue => venue.id === venueId);
  };

  const goToVenueDetails = (venue) => {
    navigation.navigate('VenueDetails', { venue });
  };

  const renderVenueItem = ({ item }) => {
    const downloaded = isVenueDownloaded(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.venueItem}
        onPress={() => downloaded ? goToVenueDetails(item) : downloadVenue(item)}
        disabled={downloading === item.id}
      >
        <Image 
          source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} 
          style={styles.venueImage} 
        />
        <View style={styles.venueInfo}>
          <Text style={styles.venueName}>{item.name}</Text>
          <Text style={styles.venueLocation}>{item.location}</Text>
          
          {downloading === item.id ? (
            <View style={styles.downloadingContainer}>
              <ActivityIndicator size="small" color="#5C6BC0" />
              <Text style={styles.downloadingText}>Downloading...</Text>
            </View>
          ) : downloaded ? (
            <View style={styles.downloadedContainer}>
              <Icon name="check-circle" size={18} color="#4CAF50" />
              <Text style={styles.downloadedText}>Downloaded</Text>
            </View>
          ) : (
            <View style={styles.downloadContainer}>
              <Icon name="file-download" size={18} color="#5C6BC0" />
              <Text style={styles.downloadText}>Download Map</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const continueToNextScreen = () => {
    if (downloadedVenues.length === 0) {
      Alert.alert(
        'No Venues Downloaded',
        'You need to download at least one venue map to continue.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('CreateGroup');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Download Venue Maps</Text>
      <Text style={styles.subtitle}>Download maps for offline use at the event</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#5C6BC0" style={styles.loader} />
      ) : venues.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="event-busy" size={60} color="#B0BEC5" />
          <Text style={styles.emptyText}>No venues available</Text>
        </View>
      ) : (
        <FlatList
          data={venues}
          renderItem={renderVenueItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}
      
      <TouchableOpacity 
        style={[styles.button, downloadedVenues.length === 0 && styles.buttonDisabled]}
        onPress={continueToNextScreen}
        disabled={downloadedVenues.length === 0}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
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
    marginBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  venueItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  venueImage: {
    width: 100,
    height: 100,
  },
  venueInfo: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  downloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 14,
    color: '#5C6BC0',
    marginLeft: 5,
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadingText: {
    fontSize: 14,
    color: '#5C6BC0',
    marginLeft: 5,
  },
  downloadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadedText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#B0BEC5',
    marginTop: 10,
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
});

export default VenueDownloadScreen;