// Venue model
const mongoose = require('mongoose');

const LandmarkSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['entrance', 'exit', 'restroom', 'food', 'merchandise', 'medical', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    default: ''
  }
});

const SectionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['seating', 'standing', 'stage', 'vip', 'other'],
    default: 'seating'
  }
});

const MapDataSchema = new mongoose.Schema({
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  sections: [SectionSchema],
  landmarks: [LandmarkSchema],
  scale: {
    type: Number,
    default: 1.0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const VenueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true
  },
  mapData: {
    type: MapDataSchema,
    default: () => ({
      width: 1000,
      height: 800,
      sections: [],
      landmarks: []
    })
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Venue', VenueSchema);