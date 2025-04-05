// ConnectX Server - Main Entry Point
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Import routes
const groupRoutes = require('./routes/groups');
const venueRoutes = require('./routes/venues');
const userRoutes = require('./routes/users');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/connectx';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/groups', groupRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/users', userRoutes);

// Active groups with connected users
const activeGroups = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join a group
  socket.on('joinGroup', ({ groupId, userId, username, location }) => {
    socket.join(groupId);
    
    // Initialize group if it doesn't exist
    if (!activeGroups.has(groupId)) {
      activeGroups.set(groupId, new Map());
    }
    
    // Add user to group with their location
    activeGroups.get(groupId).set(userId, { 
      socketId: socket.id,
      username,
      location,
      lastUpdate: Date.now()
    });
    
    // Notify group members about new user
    io.to(groupId).emit('userJoined', { 
      userId, 
      username,
      location 
    });
    
    // Send current group members to the new user
    const groupMembers = {};
    activeGroups.get(groupId).forEach((user, id) => {
      if (id !== userId) {
        groupMembers[id] = {
          username: user.username,
          location: user.location
        };
      }
    });
    
    socket.emit('groupMembers', groupMembers);
  });
  
  // Update user location
  socket.on('updateLocation', ({ groupId, userId, location }) => {
    if (activeGroups.has(groupId) && activeGroups.get(groupId).has(userId)) {
      const user = activeGroups.get(groupId).get(userId);
      user.location = location;
      user.lastUpdate = Date.now();
      
      // Broadcast location update to group members
      socket.to(groupId).emit('locationUpdate', { userId, location });
    }
  });
  
  // Send message to group
  socket.on('sendMessage', ({ groupId, userId, username, message }) => {
    const timestamp = Date.now();
    const messageId = uuidv4();
    
    io.to(groupId).emit('newMessage', {
      id: messageId,
      userId,
      username,
      message,
      timestamp
    });
  });
  
  // Leave group
  socket.on('leaveGroup', ({ groupId, userId }) => {
    if (activeGroups.has(groupId)) {
      activeGroups.get(groupId).delete(userId);
      
      // Remove group if empty
      if (activeGroups.get(groupId).size === 0) {
        activeGroups.delete(groupId);
      } else {
        // Notify remaining members
        socket.to(groupId).emit('userLeft', { userId });
      }
    }
    
    socket.leave(groupId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find and remove user from all groups
    activeGroups.forEach((users, groupId) => {
      users.forEach((user, userId) => {
        if (user.socketId === socket.id) {
          users.delete(userId);
          socket.to(groupId).emit('userLeft', { userId });
          
          // Remove group if empty
          if (users.size === 0) {
            activeGroups.delete(groupId);
          }
        }
      });
    });
  });
});

// Default route
app.get('/', (req, res) => {
  res.send('ConnectX Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});