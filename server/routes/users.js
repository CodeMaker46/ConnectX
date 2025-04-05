// User management routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Import models (to be created later)
const User = require('../models/User');

// Secret key for JWT (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'connectx-secret-key';

// In-memory storage for users (for development)
let users = [];

/**
 * @route   POST /api/users
 * @desc    Register a new user
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { username, displayName, avatar } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    // Check if username already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    
    // Create new user
    const userId = uuidv4();
    const newUser = {
      id: userId,
      username,
      displayName: displayName || username,
      avatar,
      createdAt: new Date().toISOString(),
      preferences: {}
    };
    
    // Add to in-memory storage
    users.push(newUser);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userId, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = users.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't send sensitive information
    const { password, ...userInfo } = user;
    
    res.json(userInfo);
  } catch (error) {
    console.error('Error finding user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, avatar, preferences } = req.body;
    
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user fields
    if (displayName) users[userIndex].displayName = displayName;
    if (avatar) users[userIndex].avatar = avatar;
    if (preferences) users[userIndex].preferences = {
      ...users[userIndex].preferences,
      ...preferences
    };
    
    const { password, ...updatedUser } = users[userIndex];
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/users/login
 * @desc    Login a user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    
    // Find user by username
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const { password, ...userInfo } = user;
    
    res.json({
      user: userInfo,
      token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;