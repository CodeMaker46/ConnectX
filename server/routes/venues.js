// Venue management routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import models (to be created later)
const Venue = require('../models/Venue');

// In-memory storage for venues (for development)
let venues = [
  {
    id: '1',
    name: 'Madison Square Garden',
    location: 'New York, NY',
    capacity: 20000,
    mapData: {
      width: 1000,
      height: 800,
      sections: [
        { id: 'A1', name: 'Section A1', x: 100, y: 100, width: 200, height: 150 },
        { id: 'A2', name: 'Section A2', x: 300, y: 100, width: 200, height: 150 },
        { id: 'B1', name: 'Section B1', x: 100, y: 250, width: 200, height: 150 },
        { id: 'B2', name: 'Section B2', x: 300, y: 250, width: 200, height: 150 },
        { id: 'C1', name: 'Section C1', x: 500, y: 100, width: 200, height: 300 },
        { id: 'STAGE', name: 'Stage', x: 300, y: 500, width: 400, height: 200 }
      ],
      landmarks: [
        { id: 'entrance1', name: 'Main Entrance', x: 500, y: 50, type: 'entrance' },
        { id: 'exit1', name: 'Emergency Exit 1', x: 50, y: 400, type: 'exit' },
        { id: 'exit2', name: 'Emergency Exit 2', x: 950, y: 400, type: 'exit' },
        { id: 'restroom1', name: 'Restrooms', x: 800, y: 200, type: 'restroom' },
        { id: 'food1', name: 'Food Court', x: 800, y: 600, type: 'food' }
      ]
    }
  },
  {
    id: '2',
    name: 'The O2 Arena',
    location: 'London, UK',
    capacity: 20000,
    mapData: {
      width: 1000,
      height: 800,
      sections: [
        { id: 'A1', name: 'Section A1', x: 100, y: 100, width: 200, height: 150 },
        { id: 'A2', name: 'Section A2', x: 300, y: 100, width: 200, height: 150 },
        { id: 'B1', name: 'Section B1', x: 100, y: 250, width: 200, height: 150 },
        { id: 'B2', name: 'Section B2', x: 300, y: 250, width: 200, height: 150 },
        { id: 'C1', name: 'Section C1', x: 500, y: 100, width: 200, height: 300 },
        { id: 'STAGE', name: 'Stage', x: 300, y: 500, width: 400, height: 200 }
      ],
      landmarks: [
        { id: 'entrance1', name: 'Main Entrance', x: 500, y: 50, type: 'entrance' },
        { id: 'exit1', name: 'Emergency Exit 1', x: 50, y: 400, type: 'exit' },
        { id: 'exit2', name: 'Emergency Exit 2', x: 950, y: 400, type: 'exit' },
        { id: 'restroom1', name: 'Restrooms', x: 800, y: 200, type: 'restroom' },
        { id: 'food1', name: 'Food Court', x: 800, y: 600, type: 'food' }
      ]
    }
  }
];

/**
 * @route   GET /api/venues
 * @desc    Get all venues
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Return basic venue info without the detailed map data
    const venuesList = venues.map(({ id, name, location, capacity }) => ({
      id, name, location, capacity
    }));
    
    res.json(venuesList);
  } catch (error) {
    console.error('Error getting venues:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/venues/:id
 * @desc    Get venue by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const venue = venues.find(v => v.id === id);
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    
    res.json(venue);
  } catch (error) {
    console.error('Error finding venue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/venues/:id/map
 * @desc    Get venue map data
 * @access  Public
 */
router.get('/:id/map', async (req, res) => {
  try {
    const { id } = req.params;
    const venue = venues.find(v => v.id === id);
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    
    res.json(venue.mapData);
  } catch (error) {
    console.error('Error getting venue map:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/venues
 * @desc    Create a new venue
 * @access  Private (Admin only in production)
 */
router.post('/', async (req, res) => {
  try {
    const { name, location, capacity, mapData } = req.body;
    
    if (!name || !location || !capacity) {
      return res.status(400).json({ message: 'Name, location, and capacity are required' });
    }
    
    const newVenue = {
      id: uuidv4(),
      name,
      location,
      capacity,
      mapData: mapData || {
        width: 1000,
        height: 800,
        sections: [],
        landmarks: []
      },
      createdAt: new Date().toISOString()
    };
    
    venues.push(newVenue);
    
    res.status(201).json(newVenue);
  } catch (error) {
    console.error('Error creating venue:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/venues/:id/map
 * @desc    Update venue map data
 * @access  Private (Admin only in production)
 */
router.put('/:id/map', async (req, res) => {
  try {
    const { id } = req.params;
    const { mapData } = req.body;
    
    if (!mapData) {
      return res.status(400).json({ message: 'Map data is required' });
    }
    
    const venueIndex = venues.findIndex(v => v.id === id);
    
    if (venueIndex === -1) {
      return res.status(404).json({ message: 'Venue not found' });
    }
    
    venues[venueIndex].mapData = mapData;
    
    res.json(venues[venueIndex]);
  } catch (error) {
    console.error('Error updating venue map:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;