import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import meshService from '../../services/meshService';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation, route }) => {
  const [venue, setVenue] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  
  // Gesture handler values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  // Refs for gesture handlers
  const pinchRef = useRef();
  const panRef = useRef();

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
      locationReceived: meshService.addListener('locationReceived', (data) => {
        updateMemberLocation(data.userId, data.location);
      }),
      nodeConnected: meshService.addListener('nodeConnected', () => {
        // Refresh group members when a new node connects
        loadGroupMembers();
      }),
      nodeDisconnected: meshService.addListener('nodeDisconnected', () => {
        // Refresh group members when a node disconnects
        loadGroupMembers();
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
        
        // Load venue data based on group's venue
        const venuesData = await AsyncStorage.getItem('downloadedVenues');
        if (venuesData) {
          const venues = JSON.parse(venuesData);
          const groupVenue = venues.find(v => v.id === group.venueId);
          if (groupVenue) {
            setVenue(groupVenue);
          }
        }
        
        // Load group members
        setGroupMembers(group.members || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load map data');
    }
  };

  const loadGroupMembers = async () => {
    try {
      const groupData = await AsyncStorage.getItem('currentGroup');
      if (groupData) {
        const group = JSON.parse(groupData);
        setGroupMembers(group.members || []);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const updateMemberLocation = (userId, location) => {
    setGroupMembers(prevMembers => {
      return prevMembers.map(member => {
        if (member.userId === userId) {
          return { ...member, location, lastUpdate: Date.now() };
        }
        return member;
      });
    });
  };

  // Update current user's location
  const updateMyLocation = (x, y) => {
    if (!userProfile) return;
    
    const location = { x, y };
    
    // Update in local state
    updateMemberLocation(userProfile.userId, location);
    
    // Broadcast to mesh network
    meshService.updateLocation(location);
  };

  // Handle map tap to update user location
  const handleMapTap = (event) => {
    if (!venue) return;
    
    // Calculate position relative to the map
    const mapX = (event.nativeEvent.locationX - translateX.value) / scale.value;
    const mapY = (event.nativeEvent.locationY - translateY.value) / scale.value;
    
    // Update location
    updateMyLocation(mapX, mapY);
  };

  // Pinch gesture handler for zooming
  const pinchHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.scale = scale.value;
    },
    onActive: (event, ctx) => {
      scale.value = Math.max(0.5, Math.min(ctx.scale * event.scale, 3));
    },
  });

  // Pan gesture handler for moving the map
  const panHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.translateX = translateX.value;
      ctx.translateY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.translateX + event.translationX;
      translateY.value = ctx.translateY + event.translationY;
    },
  });

  // Animated styles for the map
  const mapAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Get member marker color based on last update time
  const getMemberMarkerColor = (member) => {
    if (!member.lastUpdate) return '#999'; // Gray for unknown
    
    const now = Date.now();
    const timeDiff = now - member.lastUpdate;
    
    if (timeDiff < 60000) return '#4CAF50'; // Green for recent (< 1 min)
    if (timeDiff < 300000) return '#FFC107'; // Yellow for medium (< 5 min)
    return '#F44336'; // Red for old (> 5 min)
  };

  // Reset map position and zoom
  const resetMapView = () => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  // Navigate to radar view
  const goToRadarView = () => {
    navigation.navigate('RadarScreen');
  };

  if (!venue) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading venue map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{venue.name}</Text>
        <TouchableOpacity style={styles.radarButton} onPress={goToRadarView}>
          <Icon name="radar" size={24} color="#5C6BC0" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.mapContainer}>
        <PinchGestureHandler
          ref={pinchRef}
          simultaneousHandlers={panRef}
          onGestureEvent={pinchHandler}
        >
          <Animated.View>
            <PanGestureHandler
              ref={panRef}
              simultaneousHandlers={pinchRef}
              onGestureEvent={panHandler}
            >
              <Animated.View style={[styles.mapWrapper, mapAnimatedStyle]}>
                {/* Map Image */}
                <TouchableOpacity activeOpacity={1} onPress={handleMapTap}>
                  <Image 
                    source={{ uri: venue.mapUrl || 'https://via.placeholder.com/600x400?text=Venue+Map' }} 
                    style={styles.mapImage} 
                    resizeMode="contain"
                  />
                  
                  {/* Important Locations */}
                  {venue.importantLocations && venue.importantLocations.map(location => (
                    <View 
                      key={location.id}
                      style={[styles.locationMarker, { left: location.x, top: location.y }]}
                    >
                      <Icon 
                        name={getLocationIcon(location.type)} 
                        size={24} 
                        color={getLocationColor(location.type)} 
                      />
                      <Text style={styles.locationLabel}>{location.name}</Text>
                    </View>
                  ))}
                  
                  {/* Rally Points */}
                  {venue.rallyPoints && venue.rallyPoints.map(point => (
                    <View 
                      key={point.id}
                      style={[styles.rallyPoint, { left: point.x, top: point.y }]}
                    >
                      <Icon name="flag" size={24} color="#FF5722" />
                      <Text style={styles.rallyLabel}>{point.name}</Text>
                    </View>
                  ))}
                  
                  {/* Group Members */}
                  {groupMembers.map(member => {
                    if (!member.location) return null;
                    
                    return (
                      <View 
                        key={member.userId}
                        style={[
                          styles.memberMarker, 
                          { 
                            left: member.location.x, 
                            top: member.location.y,
                            borderColor: getMemberMarkerColor(member)
                          }
                        ]}
                      >
                        {member.photo ? (
                          <Image source={{ uri: member.photo }} style={styles.memberPhoto} />
                        ) : (
                          <Text style={styles.memberInitial}>
                            {member.name.charAt(0)}
                          </Text>
                        )}
                        <Text style={styles.memberName}>{member.name}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={resetMapView}>
          <Icon name="center-focus-weak" size={24} color="#5C6BC0" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => setShowLegend(!showLegend)}
        >
          <Icon name="info" size={24} color="#5C6BC0" />
        </TouchableOpacity>
      </View>
      
      {showLegend && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Map Legend</Text>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Recent location (< 1 min)</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>Older location (< 5 min)</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendMarker, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Outdated location (> 5 min)</Text>
          </View>
          
          <View style={styles.legendItem}>
            <Icon name="flag" size={18} color="#FF5722" />
            <Text style={styles.legendText}>Rally point</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Helper functions for location icons and colors
const getLocationIcon = (type) => {
  switch (type) {
    case 'stage': return 'music-note';
    case 'restroom': return 'wc';
    case 'exit': return 'exit-to-app';
    case 'food': return 'restaurant';
    case 'medical': return 'local-hospital';
    default: return 'place';
  }
};

const getLocationColor = (type) => {
  switch (type) {
    case 'stage': return '#673AB7';
    case 'restroom': return '#2196F3';
    case 'exit': return '#4CAF50';
    case 'food': return '#FF9800';
    case 'medical': return '#F44336';
    default: return '#607D8B';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  radarButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  mapWrapper: {
    width: '100%',
    height: '100%',
  },
  mapImage: {
    width: width,
    height: height - 150,
  },
  locationMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  rallyPoint: {
    position: 'absolute',
    alignItems: 'center',
  },
  rallyLabel: {
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    color: '#FF5722',
    fontWeight: 'bold',
  },
  memberMarker: {
    position: 'absolute',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    borderWidth: 3,
    marginLeft: -20,
    marginTop: -20,
  },
  memberPhoto: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C6BC0',
  },
  memberName: {
    position: 'absolute',
    top: 42,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  controls: {
    position: 'absolute',
    right: 15,
    bottom: 100,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  controlButton: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  legend: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
});

export default MapScreen;