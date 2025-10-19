const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  token: {
    type: String,
    required: true,
    unique: true
  },
  
  deviceId: String,
  
  deviceInfo: {
    deviceName: String,
    os: String,
    appVersion: String
  },
  
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  isRevoked: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);