const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

// Temporary in-memory storage (replaced by MongoDB later)
let problems = [
  { id: 1, title: "Two Sum", platform: "LeetCode", topic: "Array", difficulty: "Easy", status: "solved", notes: "Used a hashmap." },
  { id: 2, title: "House Robber", platform: "LeetCode", topic: "DP", difficulty: "Medium", status: "solved", notes: "" }
]

app.get('/', (req, res) => {
  res.send('CodeTrack API is running')
})

// GET all problems
app.get('/api/problems', (req, res) => {
  res.json(problems)
})

// POST a new problem
app.post('/api/problems', (req, res) => {
  const newProblem = { id: Date.now(), ...req.body }
  problems.push(newProblem)
  res.status(201).json(newProblem)
})

// GET one problem by id
app.get('/api/problems/:id', (req, res) => {
  const problem = problems.find(p => p.id === Number(req.params.id))
  if (!problem) return res.status(404).json({ message: "Problem not found" })
  res.json(problem)
})

// PUT (update) a problem
app.put('/api/problems/:id', (req, res) => {
  const index = problems.findIndex(p => p.id === Number(req.params.id))
  if (index === -1) return res.status(404).json({ message: "Problem not found" })
  problems[index] = { ...problems[index], ...req.body }
  res.json(problems[index])
})

// DELETE a problem
app.delete('/api/problems/:id', (req, res) => {
  problems = problems.filter(p => p.id !== Number(req.params.id))
  res.status(204).send()
})

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000')
})