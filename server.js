require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const Problem = require('./models/Problem')

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

app.get('/', (req, res) => {
  res.send('CodeTrack API is running')
})

// GET all problems
app.get('/api/problems', async (req, res) => {
  const problems = await Problem.find()
  res.json(problems)
})

// POST a new problem
app.post('/api/problems', async (req, res) => {
  const newProblem = new Problem(req.body)
  const saved = await newProblem.save()
  res.status(201).json(saved)
})

// GET one problem by id
app.get('/api/problems/:id', async (req, res) => {
  const problem = await Problem.findById(req.params.id)
  if (!problem) return res.status(404).json({ message: "Problem not found" })
  res.json(problem)
})

// PUT (update) a problem
app.put('/api/problems/:id', async (req, res) => {
  const updated = await Problem.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
  if (!updated) return res.status(404).json({ message: "Problem not found" })
  res.json(updated)
})

// DELETE a problem
app.delete('/api/problems/:id', async (req, res) => {
  await Problem.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})