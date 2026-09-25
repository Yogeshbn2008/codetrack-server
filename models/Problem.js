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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true })

const Problem = mongoose.model('Problem', problemSchema)
const problemRoutes = require('./routes/problems');
app.use('/api/problems', authMiddleware, problemRoutes);

// Compound index for querying user problems ordered by creation date
problemSchema.index({ userId: 1, createdAt: -1 });

// Compound index for revision queries and status filters
problemSchema.index({ userId: 1, status: 1 });
problemSchema.index({ userId: 1, lastRevisedAt: 1 });

// Index for distinct topic & pattern queries
problemSchema.index({ userId: 1, topic: 1 });
problemSchema.index({ userId: 1, pattern: 1 });

module.exports = Problem