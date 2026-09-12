const mongoose = require('mongoose')

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  platform: { type: String },
  topic: { type: String },
  difficulty: { type: String, default: "Easy" },
  status: { type: String, default: "attempted" },
  notes: { type: String }
}, { timestamps: true })

const Problem = mongoose.model('Problem', problemSchema)

module.exports = Problem