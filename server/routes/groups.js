// Group management routes
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Import models (to be created later)
const Group = require('../models/Group');

// In-memory storage for active groups (for development)
let groups = [];

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, creatorId, creatorName, venueId } = req.body;
    
    if (!name || !creatorId) {
      return res.status(400).json({ message: 'Name and creator ID are required' });
    }
    
    // Generate a unique 6-character code for the group
    const generateUniqueCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    let groupCode;
    let isUnique = false;
    
    // Ensure code is unique
    while (!isUnique) {
      groupCode = generateUniqueCode();
      const existingGroup = groups.find(g => g.code === groupCode);
      if (!existingGroup) {
        isUnique = true;
      }
    }
    
    // Create new group
    const newGroup = {
      id: uuidv4(),
      name,
      code: groupCode,
      creatorId,
      creatorName,
      venueId,
      members: [{ id: creatorId, name: creatorName }],
      createdAt: new Date().toISOString()
    };
    
    // Add to in-memory storage (would be saved to database in production)
    groups.push(newGroup);
    
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/groups/:code
 * @desc    Get group by code
 * @access  Public
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const group = groups.find(g => g.code === code);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('Error finding group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/groups/join
 * @desc    Join a group using code
 * @access  Public
 */
router.post('/join', async (req, res) => {
  try {
    const { code, userId, userName } = req.body;
    
    if (!code || !userId || !userName) {
      return res.status(400).json({ message: 'Group code, user ID, and name are required' });
    }
    
    const groupIndex = groups.findIndex(g => g.code === code);
    
    if (groupIndex === -1) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is already a member
    const isMember = groups[groupIndex].members.some(member => member.id === userId);
    
    if (!isMember) {
      // Add user to group members
      groups[groupIndex].members.push({ id: userId, name: userName });
    }
    
    res.json(groups[groupIndex]);
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/groups/members/:groupId
 * @desc    Get all members of a group
 * @access  Public
 */
router.get('/members/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    res.json(group.members);
  } catch (error) {
    console.error('Error getting group members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/groups/:id
 * @desc    Delete a group
 * @access  Private (should be restricted to creator)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // Should come from auth middleware in production
    
    const groupIndex = groups.findIndex(g => g.id === id);
    
    if (groupIndex === -1) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is the creator
    if (groups[groupIndex].creatorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this group' });
    }
    
    // Remove group
    groups = groups.filter(g => g.id !== id);
    
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;