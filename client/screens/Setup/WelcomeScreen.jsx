import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const WelcomeScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Check if user has a profile
      const userProfile = await AsyncStorage.getItem('userProfile');
      
      // Check if user is in a group
      const currentGroup = await AsyncStorage.getItem('currentGroup');
      
      if (userProfile && currentGroup) {
        // User has both profile and group, navigate to group screen
        navigation.replace('GroupDetails', { group: JSON.parse(currentGroup) });
      } else if (userProfile) {
        // User has profile but no group, navigate to venue download
        navigation.replace('VenueDownload');
      } else {
        // New user, show welcome screen
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setIsLoading(false);
    }
  };

  const startSetup = () => {
    navigation.navigate('ProfileSetup');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.loadingLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.content}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Welcome to ConnectX</Text>
        
        <Text style={styles.subtitle}>
          Stay connected with your friends at concerts and events, even without cellular service
        </Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Icon name="people" size={28} color="#5C6BC0" />
            <Text style={styles.featureText}>Create or join groups with friends</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Icon name="map" size={28} color="#5C6BC0" />
            <Text style={styles.featureText}>See friends' locations on venue maps</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Icon name="chat" size={28} color="#5C6BC0" />
            <Text style={styles.featureText}>Send messages without cellular service</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Icon name="bluetooth" size={28} color="#5C6BC0" />
            <Text style={styles.featureText}>Uses Bluetooth & WiFi Direct mesh networking</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={startSetup}>
          <Text style={styles.buttonText}>Get Started</Text>
          <Icon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
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
    backgroundColor: '#fff',
  },
  loadingLogo: {
    width: 150,
    height: 150,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
  },
  button: {
    backgroundColor: '#5C6BC0',
    flexDirection: 'row',
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default WelcomeScreen;