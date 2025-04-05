import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import meshService from '../../services/meshService';

const { width } = Dimensions.get('window');
const RADAR_RADIUS = width * 0.4;

const RadarScreen = ({ navigation }) => {
  const [groupMembers, setGroupMembers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [radarRange, setRadarRange] = useState(50); // Default range in meters

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
        const profile = JSON.parse(profileData);
        setUserProfile(profile);
        
        // Set user's location if available
        if (profile.location) {
          setUserLocation(profile.location);
        }
      }
      
      // Load current group
      const groupData = await AsyncStorage.getItem('currentGroup');
      if (groupData) {
        const group = JSON.parse(groupData);
        setCurrentGroup(group);
        
        // Load group members
        setGroupMembers(group.members || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load radar data');
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

  // Calculate distance between two points
  const calculateDistance = (loc1, loc2) => {
    if (!loc1 || !loc2) return null;
    
    // In a real app, this would use actual GPS coordinates
    // For this demo, we'll use the x,y coordinates as a proxy
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate angle between two points (in radians)
  const calculateAngle = (loc1, loc2) => {
    if (!loc1 || !loc2) return null;
    
    const dx = loc2.x - loc1.x;
    const dy = loc2.y - loc1.y;
    return Math.atan2(dy, dx);
  };

  // Get member marker color based on last update time
  const getMemberMarkerColor = (member) => {
    if (!member.lastUpdate) return '#999'; // Gray for unknown
    
    const now = Date.now();
    const timeDiff = now - member.lastUpdate;
    
    if (timeDiff < 60000) return '#4CAF50'; // Green for recent (< 1 min)
    if (timeDiff < 300000) return '#FFC107'; // Yellow for medium (< 5 min)
    return '#F44336'; // Red for old (> 5 min)
  };

  // Increase radar range
  const increaseRange = () => {
    setRadarRange(prev => Math.min(prev + 25, 200));
  };

  // Decrease radar range
  const decreaseRange = () => {
    setRadarRange(prev => Math.max(prev - 25, 25));
  };

  // Navigate to map view
  const goToMapView = () => {
    navigation.navigate('MapScreen');
  };

  // Get current user's location from the members array
  const getCurrentUserLocation = () => {
    if (!userProfile) return null;
    
    const currentUser = groupMembers.find(member => member.userId === userProfile.userId);
    return currentUser?.location;
  };

  // Render radar blips for each member
  const renderMemberBlips = () => {
    if (!userProfile) return null;
    
    const currentUserLocation = getCurrentUserLocation();
    if (!currentUserLocation) return null;
    
    return groupMembers.map(member => {
      // Skip current user and members without location
      if (member.userId === userProfile.userId || !member.location) return null;
      
      const distance = calculateDistance(currentUserLocation, member.location);
      const angle = calculateAngle(currentUserLocation, member.location);
      
      if (distance === null || angle === null) return null;
      
      // Scale distance to fit within radar
      const scaledDistance = (distance / radarRange) * RADAR_RADIUS;
      if (scaledDistance > RADAR_RADIUS) return null; // Out of range
      
      // Calculate position on radar
      const x = RADAR_RADIUS + scaledDistance * Math.cos(angle);
      const y = RADAR_RADIUS + scaledDistance * Math.sin(angle);
      
      return (
        <View key={member.userId} style={[styles.blip, { left: x, top: y }]}>
          <View 
            style={[
              styles.blipDot, 
              { backgroundColor: getMemberMarkerColor(member) }
            ]} 
          />
          <Text style={styles.blipName}>{member.name}</Text>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Radar View</Text>
        <TouchableOpacity style={styles.mapButton} onPress={goToMapView}>
          <Icon name="map" size={24} color="#5C6BC0" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.radarContainer}>
        <View style={styles.rangeControls}>
          <TouchableOpacity style={styles.rangeButton} onPress={decreaseRange}>
            <Icon name="remove" size={24} color="#5C6BC0" />
          </TouchableOpacity>
          <Text style={styles.rangeText}>{radarRange}m</Text>
          <TouchableOpacity style={styles.rangeButton} onPress={increaseRange}>
            <Icon name="add" size={24} color="#5C6BC0" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.radar}>
          <Svg height={RADAR_RADIUS * 2} width={RADAR_RADIUS * 2}>
            {/* Radar circles */}
            <Circle
              cx={RADAR_RADIUS}
              cy={RADAR_RADIUS}
              r={RADAR_RADIUS}
              stroke="#E0E0E0"
              strokeWidth="1"
              fill="transparent"
            />
            <Circle
              cx={RADAR_RADIUS}
              cy={RADAR_RADIUS}
              r={RADAR_RADIUS * 0.66}
              stroke="#E0E0E0"
              strokeWidth="1"
              fill="transparent"
            />
            <Circle
              cx={RADAR_RADIUS}
              cy={RADAR_RADIUS}
              r={RADAR_RADIUS * 0.33}
              stroke="#E0E0E0"
              strokeWidth="1"
              fill="transparent"
            />
            
            {/* Radar lines */}
            <Line
              x1={RADAR_RADIUS}
              y1="0"
              x2={RADAR_RADIUS}
              y2={RADAR_RADIUS * 2}
              stroke="#E0E0E0"
              strokeWidth="1"
            />
            <Line
              x1="0"
              y1={RADAR_RADIUS}
              x2={RADAR_RADIUS * 2}
              y2={RADAR_RADIUS}
              stroke="#E0E0E0"
              strokeWidth="1"
            />
            
            {/* Range labels */}
            <SvgText
              x={RADAR_RADIUS}
              y={RADAR_RADIUS * 0.33 - 5}
              fontSize="10"
              fill="#9E9E9E"
              textAnchor="middle"
            >
              {Math.round(radarRange * 0.33)}m
            </SvgText>
            <SvgText
              x={RADAR_RADIUS}
              y={RADAR_RADIUS * 0.66 - 5}
              fontSize="10"
              fill="#9E9E9E"
              textAnchor="middle"
            >
              {Math.round(radarRange * 0.66)}m
            </SvgText>
            <SvgText
              x={RADAR_RADIUS}
              y={RADAR_RADIUS - 5}
              fontSize="10"
              fill="#9E9E9E"
              textAnchor="middle"
            >
              {radarRange}m
            </SvgText>
            
            {/* Direction labels */}
            <SvgText
              x={RADAR_RADIUS}
              y="15"
              fontSize="12"
              fontWeight="bold"
              fill="#5C6BC0"
              textAnchor="middle"
            >
              N
            </SvgText>
            <SvgText
              x={RADAR_RADIUS * 2 - 15}
              y={RADAR_RADIUS}
              fontSize="12"
              fontWeight="bold"
              fill="#5C6BC0"
              textAnchor="middle"
            >
              E
            </SvgText>
            <SvgText
              x={RADAR_RADIUS}
              y={RADAR_RADIUS * 2 - 10}
              fontSize="12"
              fontWeight="bold"
              fill="#5C6BC0"
              textAnchor="middle"
            >
              S
            </SvgText>
            <SvgText
              x="15"
              y={RADAR_RADIUS}
              fontSize="12"
              fontWeight="bold"
              fill="#5C6BC0"
              textAnchor="middle"
            >
              W
            </SvgText>
          </Svg>
          
          {/* Center dot (current user) */}
          <View style={styles.centerDot}>
            <View style={styles.userDot} />
            <Text style={styles.userLabel}>You</Text>
          </View>
          
          {/* Member blips */}
          {renderMemberBlips()}
        </View>
      </View>
      
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Location Freshness</Text>
        
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>< 1 min</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>< 5 min</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>> 5 min</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.statusButton}
        onPress={() => navigation.navigate('StatusUpdateScreen')}
      >
        <Icon name="message" size={20} color="#fff" />
        <Text style={styles.statusButtonText}>Send Status Update</Text>
      </TouchableOpacity>
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
  mapButton: {
    padding: 8,
  },
  radarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rangeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rangeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    color: '#333',
  },
  radar: {
    width: RADAR_RADIUS * 2,
    height: RADAR_RADIUS * 2,
    borderRadius: RADAR_RADIUS,
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  centerDot: {
    position: 'absolute',
    left: RADAR_RADIUS - 10,
    top: RADAR_RADIUS - 10,
    alignItems: 'center',
  },
  userDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5C6BC0',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5C6BC0',
    marginTop: 2,
  },
  blip: {
    position: 'absolute',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    alignItems: 'center',
  },
  blipDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  blipName: {
    fontSize: 10,
    color: '#333',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 2,
    overflow: 'hidden',
  },
  legend: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  statusButton: {
    flexDirection: 'row',
    backgroundColor: '#5C6BC0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    margin: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default RadarScreen;