require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const axios = require('axios')
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

// Fetch platform + title from a pasted problem link
app.post('/api/problems/fetch-meta', async (req, res) => {
  const { link } = req.body
  if (!link) return res.status(400).json({ message: "No link provided" })

  try {
    const url = new URL(link)
    const hostname = url.hostname.replace('www.', '')

    // Special handling: LeetCode blocks simple scraping, so use their public GraphQL API instead
    if (hostname === 'leetcode.com') {
      const slugMatch = url.pathname.match(/\/problems\/([^/]+)/)
      if (!slugMatch) {
        return res.status(400).json({ message: "Couldn't parse the LeetCode problem slug from this URL" })
      }
      const titleSlug = slugMatch[1]

      const graphqlRes = await axios.post(
        'https://leetcode.com/graphql',
        {
          query: `query getQuestion($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              title
              difficulty
            }
          }`,
          variables: { titleSlug }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      )

      const question = graphqlRes.data?.data?.question
      if (!question) {
        return res.status(404).json({ message: "Couldn't find that problem on LeetCode" })
      }

      return res.json({ title: question.title, platform: 'LeetCode', difficulty: question.difficulty })
    }

    // Generic fallback for other platforms: scrape the page title
    const platformMap = {
      'codeforces.com': 'Codeforces',
      'geeksforgeeks.org': 'GeeksforGeeks',
      'hackerrank.com': 'HackerRank',
      'interviewbit.com': 'InterviewBit',
      'codechef.com': 'CodeChef',
      'atcoder.jp': 'AtCoder'
    }
    const platform = platformMap[hostname] || hostname

    const response = await axios.get(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 8000
    })

    const match = response.data.match(/<title[^>]*>([^<]*)<\/title>/i)
    let title = match ? match[1].trim() : ""

    title = title
      .replace(/\s*-\s*GeeksforGeeks\s*$/i, '')
      .replace(/\s*\|\s*GeeksforGeeks\s*$/i, '')
      .replace(/\s*-\s*Codeforces\s*$/i, '')
      .replace(/\s*-\s*HackerRank\s*$/i, '')
      .replace(/^\d+\.\s*/, '')

    res.json({ title, platform })
  } catch (err) {
    console.error("Fetch-meta error:", err.message)
    res.status(500).json({ message: "Could not fetch details automatically. Please enter them manually." })
  }
})

function getDateKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function computeStreaks(activityDateSet) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Current streak: count backwards from today (or yesterday, if nothing logged today yet)
  let current = 0
  let cursor = new Date(today)
  if (!activityDateSet.has(getDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (activityDateSet.has(getDateKey(cursor))) {
    current++
    cursor.setDate(cursor.getDate() - 1)
  }

  // Longest streak: scan all logged dates for the best consecutive run
  const sortedDates = Array.from(activityDateSet).sort()
  let longest = 0
  let run = 0
  let prevDate = null
  for (const dateStr of sortedDates) {
    const thisDate = new Date(dateStr)
    if (prevDate) {
      const diffDays = Math.round((thisDate - prevDate) / (1000 * 60 * 60 * 24))
      run = diffDays === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
    prevDate = thisDate
  }

  // Last 7 days, oldest to newest, for a Mon-Sun style tick row
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    last7Days.push({
      date: getDateKey(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      active: activityDateSet.has(getDateKey(d))
    })
  }

  return { current, longest, last7Days }
}

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
  // Weak-topic insight: lowest solve rate among topics with at least 2 attempts
const topicStats = {}
problems.forEach(p => {
  const topic = p.topic || "Uncategorized"
  if (!topicStats[topic]) {
    topicStats[topic] = { total: 0, solved: 0 }
  }
  topicStats[topic].total++
  if (p.status === "solved") {
    topicStats[topic].solved++
  }
})

let weakTopic = null
Object.entries(topicStats).forEach(([topic, data]) => {
  if (data.total >= 2) {
    const solveRate = data.solved / data.total
    if (!weakTopic || solveRate < weakTopic.solveRate) {
      weakTopic = { topic, solveRate, total: data.total, solved: data.solved }
    }
  }
})

  const byPattern = {}
  problems.forEach(p => {
    if (p.pattern) {
      byPattern[p.pattern] = (byPattern[p.pattern] || 0) + 1
    }
  })

  const activityDateSet = new Set(problems.map(p => getDateKey(p.createdAt)))
  const streak = computeStreaks(activityDateSet)

  const recent = problems
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  res.json({ total, solved, attempted, byDifficulty, byTopic, byPattern, streak,weakTopic, recent })
})
app.get('/api/problems', async (req, res) => {
  const { search, topic, pattern, difficulty, status } = req.query

  const query = { userId: req.userId }

  if (search) {
    query.title = { $regex: search, $options: 'i' }
  }
  if (topic) {
    query.topic = topic
  }
  if (pattern) {
    query.pattern = { $regex: `^${pattern}$`, $options: 'i' }
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