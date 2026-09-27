const mongoose = require('mongoose')

const goalSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  date: { 
    type: String, 
    required: true 
  }, // Format: 'YYYY-MM-DD'
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  type: { 
    type: String, 
    enum: ['custom', 'problem', 'revision', 'topic'], 
    default: 'custom' 
  },
  problemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem', 
    default: null 
  },
  problemUrl: { 
    type: String, 
    default: '' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  isCompleted: { 
    type: Boolean, 
    default: false 
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  rolledOver: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true })

// Compound Index: Sub-millisecond lookup for a user's date-specific goals
goalSchema.index({ userId: 1, date: 1 })

const Goal = mongoose.model('Goal', goalSchema)

module.exports = Goal