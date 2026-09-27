const mongoose = require('mongoose')

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  platform: { type: String },
  topic: { type: String },
  pattern: { type: String },
  difficulty: { type: String, default: "Easy" },
  status: { type: String, default: "attempted" },
  notes: { type: String },
  link: { type: String },
  imageUrl: { type: String },
  lastRevisedAt: { type: Date, default: Date.now },
  revisionIntervalDays: { type: Number, default: 7 },
  revisionCount: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true })

// Compound indexes (MUST be placed before mongoose.model)
problemSchema.index({ userId: 1, createdAt: -1 })
problemSchema.index({ userId: 1, status: 1 })
problemSchema.index({ userId: 1, lastRevisedAt: 1 })
problemSchema.index({ userId: 1, topic: 1 })
problemSchema.index({ userId: 1, pattern: 1 })

const Problem = mongoose.model('Problem', problemSchema)

module.exports = Problem