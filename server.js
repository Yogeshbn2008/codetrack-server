require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const Problem = require('./models/Problem')
const authRoutes = require('./routes/auth')
const authMiddleware = require('./middleware/auth')

const app = express()

app.use(cors({
  origin: ['http://localhost:5173', 'https://codetrack-henna.vercel.app']
}))
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

app.use('/api/auth', authRoutes)

app.get('/', (req, res) => {
  res.send('CodeTrack API is running')
})

// All routes below this line require a valid token
app.use('/api/problems', authMiddleware)

app.get('/api/problems', async (req, res) => {
  const { search, topic, difficulty, status } = req.query

  const query = { userId: req.userId }

  if (search) {
    query.title = { $regex: search, $options: 'i' }
  }
  if (topic) {
    query.topic = topic
  }
  if (difficulty) {
    query.difficulty = difficulty
  }
  if (status) {
    query.status = status
  }

  const problems = await Problem.find(query)
  res.json(problems)
})

app.post('/api/problems', async (req, res) => {
  const newProblem = new Problem({ ...req.body, userId: req.userId })
  const saved = await newProblem.save()
  res.status(201).json(saved)
})
 app.get('/api/problems/stats/summary', async (req, res) => {
  const problems = await Problem.find({ userId: req.userId })

  const total = problems.length
  const solved = problems.filter(p => p.status === "solved").length
  const attempted = problems.filter(p => p.status === "attempted").length

  const byDifficulty = {
    Easy: problems.filter(p => p.difficulty === "Easy").length,
    Medium: problems.filter(p => p.difficulty === "Medium").length,
    Hard: problems.filter(p => p.difficulty === "Hard").length
  }

  const byTopic = {}
  problems.forEach(p => {
    const topic = p.topic || "Uncategorized"
    byTopic[topic] = (byTopic[topic] || 0) + 1
  })

  const recent = problems
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  res.json({ total, solved, attempted, byDifficulty, byTopic, recent })
})

app.get('/api/problems/:id', async (req, res) => {
  const problem = await Problem.findOne({ _id: req.params.id, userId: req.userId })
  if (!problem) return res.status(404).json({ message: "Problem not found" })
  res.json(problem)
})

app.put('/api/problems/:id', async (req, res) => {
  const updated = await Problem.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { returnDocument: 'after' }
  )
  if (!updated) return res.status(404).json({ message: "Problem not found" })
  res.json(updated)
})

app.delete('/api/problems/:id', async (req, res) => {
  const deleted = await Problem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!deleted) return res.status(404).json({ message: "Problem not found" })
  res.status(204).send()
})

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})