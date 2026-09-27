const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const axios = require('axios')
const Problem = require('../models/Problem')
const User = require('../models/User')

// --- Whitelist for SSRF Protection ---
const ALLOWED_PLATFORMS = new Set([
  'leetcode.com',
  'codeforces.com',
  'geeksforgeeks.org',
  'hackerrank.com',
  'interviewbit.com',
  'codechef.com',
  'atcoder.jp'
])

// Helper: Format Date Key (YYYY-MM-DD)
function getDateKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

// Helper: Compute User Streaks
function computeStreaks(activityDateSet) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let current = 0
  let cursor = new Date(today)
  if (!activityDateSet.has(getDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (activityDateSet.has(getDateKey(cursor))) {
    current++
    cursor.setDate(cursor.getDate() - 1)
  }

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

// Helper: Compute 0-100 DSA Interview Readiness Score
function computeReadinessScore(allProbs = [], streak = { current: 0 }, byDifficulty = {}, byTopic = {}) {
  // 1. Difficulty-weighted volume (Max 35 pts)
  // Easy = 0.5 pts, Medium = 2.5 pts, Hard = 5.0 pts
  const easy = byDifficulty.Easy || 0
  const medium = byDifficulty.Medium || 0
  const hard = byDifficulty.Hard || 0
  const rawVolumeScore = (easy * 0.5) + (medium * 2.5) + (hard * 5.0)
  const volumeScore = Math.min(35, Math.round(rawVolumeScore))

  // 2. Core Topic & High-Frequency Pattern Breadth (Max 35 pts) - 7 pillars x 5 pts
  const CORE_PILLARS = [
    { name: "Arrays & Hashing", match: /array|string|hash|map/i },
    { name: "Two Pointers & Sliding Window", match: /pointer|sliding|window/i },
    { name: "Stack & Queue", match: /stack|queue|monotonic|heap|priority/i },
    { name: "Binary Search & Sorting", match: /binary\s*search|search|sort/i },
    { name: "Trees & BST", match: /tree|bst|trie/i },
    { name: "Graphs & Traversal", match: /graph|bfs|dfs|matrix|island|union/i },
    { name: "Dynamic Programming", match: /dp|dynamic|recursion|backtrack/i }
  ]

  let topicScore = 0
  const topicPillars = []
  CORE_PILLARS.forEach(pillar => {
    let count = 0
    allProbs.forEach(p => {
      const topicStr = `${p.topic || ""} ${p.pattern || ""}`
      if (pillar.match.test(topicStr)) count++
    })
    const covered = count >= 2
    if (covered) topicScore += 5
    else if (count === 1) topicScore += 2.5

    topicPillars.push({
      pillar: pillar.name,
      count,
      status: count >= 2 ? "Mastered" : count === 1 ? "Practiced" : "Needed"
    })
  })
  topicScore = Math.min(35, Math.round(topicScore))

  // 3. Spaced Repetition Consistency & Retention (Max 30 pts)
  const streakPts = streak.current >= 7 ? 10 : streak.current >= 3 ? 6 : streak.current >= 1 ? 3 : 0
  const totalRevisions = allProbs.reduce((acc, p) => acc + (p.revisionCount || 0), 0)
  const revisionPts = totalRevisions >= 8 ? 10 : totalRevisions >= 4 ? 7 : totalRevisions >= 1 ? 4 : 0
  const avgEase = allProbs.length > 0
    ? (allProbs.reduce((acc, p) => acc + (p.easeFactor || 2.5), 0) / allProbs.length)
    : 2.5
  const easePts = avgEase >= 2.6 ? 10 : avgEase >= 2.2 ? 7 : 4

  const retentionScore = Math.min(30, streakPts + revisionPts + easePts)
  const totalScore = Math.min(100, Math.max(0, volumeScore + topicScore + retentionScore))

  let tier = "Developing Core"
  let tierLevel = "Level 1"
  let tierColor = "#94a3b8"
  let recommendation = "Build initial momentum with Arrays, Two Pointers, and maintaining a 3-day streak."

  if (totalScore >= 85) {
    tier = "FAANG Ready"
    tierLevel = "Level 4 (Elite)"
    tierColor = "#a855f7"
    recommendation = "Maintain your spaced repetition intervals and practice timed Hard problems."
  } else if (totalScore >= 70) {
    tier = "Interview Competitive"
    tierLevel = "Level 3 (Advanced)"
    tierColor = "#10b981"
    recommendation = "Target Graphs and Hard Dynamic Programming to push into Elite tier."
  } else if (totalScore >= 50) {
    tier = "Solid Foundation"
    tierLevel = "Level 2 (Intermediate)"
    tierColor = "#f59e0b"
    recommendation = "Increase Medium problem volume and focus on Sliding Window and Trees."
  }

  return {
    score: totalScore,
    tier,
    tierLevel,
    tierColor,
    recommendation,
    breakdown: {
      volumeScore,
      maxVolume: 35,
      topicScore,
      maxTopic: 35,
      retentionScore,
      maxRetention: 30
    },
    topicPillars
  }
}

// @route   POST /api/problems/fetch-meta
// @desc    Fetch problem details from URL (SSRF Protected)
router.post('/fetch-meta', async (req, res) => {
  const { link } = req.body
  if (!link) return res.status(400).json({ message: "No link provided" })

  let parsedUrl
  try {
    parsedUrl = new URL(link)
    if (parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ message: "Only secure HTTPS URLs are permitted" })
    }
  } catch (err) {
    return res.status(400).json({ message: "Invalid URL format" })
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, '')

  if (!ALLOWED_PLATFORMS.has(hostname)) {
    return res.status(400).json({ 
      message: "Unsupported platform. Automatic fetching is only supported for LeetCode, GFG, Codeforces, HackerRank, InterviewBit, and CodeChef." 
    })
  }

  try {
    if (hostname === 'leetcode.com') {
      const slugMatch = parsedUrl.pathname.match(/\/problems\/([^/]+)/)
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

    const platformMap = {
      'codeforces.com': 'Codeforces',
      'geeksforgeeks.org': 'GeeksforGeeks',
      'hackerrank.com': 'HackerRank',
      'interviewbit.com': 'InterviewBit',
      'codechef.com': 'CodeChef',
      'atcoder.jp': 'AtCoder'
    }

    const response = await axios.get(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 8000,
      maxRedirects: 3
    })

    const match = response.data.match(/<title[^>]*>([^<]*)<\/title>/i)
    let title = match ? match[1].trim() : ""
    title = title
      .replace(/\s*-\s*GeeksforGeeks\s*$/i, '')
      .replace(/\s*\|\s*GeeksforGeeks\s*$/i, '')
      .replace(/\s*-\s*Codeforces\s*$/i, '')
      .replace(/\s*-\s*HackerRank\s*$/i, '')
      .replace(/^\d+\.\s*/, '')

    res.json({ title, platform: platformMap[hostname] || hostname })
  } catch (err) {
    console.error("Fetch-meta error:", err.message)
    res.status(500).json({ message: "Could not fetch details automatically. Please enter them manually." })
  }
})

// @route   GET /api/problems/stats/summary
// @desc    Dashboard analytics computed via MongoDB Aggregation Pipeline
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId)

    const [statsResult] = await Problem.aggregate([
      { $match: { userId } },
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byDifficulty: [
            { $group: { _id: "$difficulty", count: { $sum: 1 } } }
          ],
          byTopic: [
            { $group: { _id: { $ifNull: ["$topic", "Uncategorized"] }, total: { $sum: 1 }, solved: { $sum: { $cond: [{ $eq: ["$status", "solved"] }, 1, 0] } } } }
          ],
          byPattern: [
            { $match: { pattern: { $nin: [null, ""] } } },
            { $group: { _id: "$pattern", count: { $sum: 1 } } }
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { _id: 1, title: 1, difficulty: 1, status: 1, createdAt: 1 } }
          ],
          allProblemsForStreak: [
            { $project: { createdAt: 1, lastRevisedAt: 1, revisionIntervalDays: 1, revisionCount: 1, easeFactor: 1, title: 1, difficulty: 1, topic: 1, pattern: 1, link: 1 } }
          ]
        }
      }
    ])

    const total = statsResult.totalCount[0]?.count || 0
    const solved = statsResult.byStatus.find(s => s._id === 'solved')?.count || 0
    const attempted = statsResult.byStatus.find(s => s._id === 'attempted')?.count || 0

    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 }
    statsResult.byDifficulty.forEach(d => {
      if (d._id) byDifficulty[d._id] = d.count
    })

    const byTopic = {}
    let weakTopic = null
    statsResult.byTopic.forEach(t => {
      byTopic[t._id] = t.total
      if (t.total >= 2) {
        const solveRate = t.solved / t.total
        if (!weakTopic || solveRate < weakTopic.solveRate) {
          weakTopic = { topic: t._id, solveRate, total: t.total, solved: t.solved }
        }
      }
    })

    const byPattern = {}
    statsResult.byPattern.forEach(p => {
      byPattern[p._id] = p.count
    })

    const allProbs = statsResult.allProblemsForStreak
    const activityDateSet = new Set(allProbs.map(p => getDateKey(p.createdAt)))
    const streak = computeStreaks(activityDateSet)

    const now = new Date()
    const dueForRevision = allProbs
      .filter(p => {
        const dueDate = new Date(p.lastRevisedAt)
        dueDate.setDate(dueDate.getDate() + (p.revisionIntervalDays || 7))
        return dueDate <= now
      })
      .sort((a, b) => new Date(a.lastRevisedAt) - new Date(b.lastRevisedAt))
      .slice(0, 5)

    const readiness = computeReadinessScore(allProbs, streak, byDifficulty, byTopic)

    res.json({
      total,
      solved,
      attempted,
      byDifficulty,
      byTopic,
      byPattern,
      streak,
      weakTopic,
      dueForRevision,
      recent: statsResult.recent,
      readiness
    })
  } catch (err) {
    console.error("Aggregation stats error:", err)
    res.status(500).json({ message: "Error calculating dashboard statistics" })
  }
})

// @route   GET /api/problems/portfolio
// @desc    Export aggregated portfolio data for 1-click PDF Generation
router.get('/portfolio', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('name email createdAt')
    if (!user) return res.status(404).json({ message: "User not found" })

    const problems = await Problem.find({ userId: req.userId }).sort({ createdAt: -1 })

    const total = problems.length
    const solved = problems.filter(p => p.status === 'solved').length
    const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 }
    problems.forEach(p => {
      if (p.difficulty && byDifficulty[p.difficulty] !== undefined) {
        byDifficulty[p.difficulty]++
      }
    })

    const byTopic = {}
    problems.forEach(p => {
      const top = p.topic || 'Uncategorized'
      byTopic[top] = (byTopic[top] || 0) + 1
    })

    const byPattern = {}
    problems.forEach(p => {
      if (p.pattern) {
        byPattern[p.pattern] = (byPattern[p.pattern] || 0) + 1
      }
    })

    const activityDateSet = new Set(problems.map(p => getDateKey(p.createdAt)))
    const streak = computeStreaks(activityDateSet)
    const readiness = computeReadinessScore(problems, streak, byDifficulty, byTopic)

    // Highlight top solved Medium & Hard problems (with notes or key insights)
    const keyProblems = problems
      .filter(p => p.status === 'solved')
      .slice(0, 10)
      .map(p => ({
        id: p._id,
        title: p.title,
        difficulty: p.difficulty,
        topic: p.topic || 'Algorithms',
        pattern: p.pattern || '',
        notes: p.notes || '',
        link: p.link || '',
        solvedAt: p.createdAt
      }))

    res.json({
      candidate: {
        name: user.name,
        email: user.email,
        memberSince: user.createdAt
      },
      readiness,
      stats: {
        total,
        solved,
        attempted: total - solved,
        byDifficulty,
        byTopic,
        byPattern,
        streak
      },
      keyProblems,
      generatedAt: new Date()
    })
  } catch (err) {
    console.error("Portfolio export error:", err)
    res.status(500).json({ message: "Error generating portfolio data" })
  }
})

// @route   GET /api/problems
// @desc    Get all problems with filter and search
router.get('/', async (req, res) => {
  const { search, topic, pattern, difficulty, status, revision } = req.query
  const query = { userId: req.userId }

  if (search) query.title = { $regex: search, $options: 'i' }
  if (topic) query.topic = topic
  if (pattern) query.pattern = { $regex: `^${pattern}$`, $options: 'i' }
  if (difficulty) query.difficulty = difficulty
  if (status) query.status = status

  let problems = await Problem.find(query).sort({ lastRevisedAt: 1 })

  if (revision === "true") {
    const now = new Date()
    problems = problems.filter(p => {
      const dueDate = new Date(p.lastRevisedAt)
      dueDate.setDate(dueDate.getDate() + (p.revisionIntervalDays || 7))
      return dueDate <= now
    })
  }

  res.json(problems)
})

// @route   GET /api/problems/meta/options
// @desc    Get distinct topics and patterns for filters
router.get('/meta/options', async (req, res) => {
  const topics = await Problem.distinct('topic', { userId: req.userId, topic: { $nin: [null, ""] } })
  const patterns = await Problem.distinct('pattern', { userId: req.userId, pattern: { $nin: [null, ""] } })
  res.json({ topics: topics.sort(), patterns: patterns.sort() })
})

// @route   POST /api/problems
// @desc    Create a new problem
router.post('/', async (req, res) => {
  const newProblem = new Problem({ ...req.body, userId: req.userId })
  const saved = await newProblem.save()
  res.status(201).json(saved)
})

// @route   GET /api/problems/:id
// @desc    Get problem by ID
router.get('/:id', async (req, res) => {
  const problem = await Problem.findOne({ _id: req.params.id, userId: req.userId })
  if (!problem) return res.status(404).json({ message: "Problem not found" })
  res.json(problem)
})

// @route   PUT /api/problems/:id
// @desc    Update problem by ID
router.put('/:id', async (req, res) => {
  const updated = await Problem.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    req.body,
    { returnDocument: 'after' }
  )
  if (!updated) return res.status(404).json({ message: "Problem not found" })
  res.json(updated)
})

// @route   DELETE /api/problems/:id
// @desc    Delete problem by ID
router.delete('/:id', async (req, res) => {
  const deleted = await Problem.findOneAndDelete({ _id: req.params.id, userId: req.userId })
  if (!deleted) return res.status(404).json({ message: "Problem not found" })
  res.status(204).send()
})

// @route   PATCH /api/problems/:id/revise
// @desc    Update problem revision with adaptive SuperMemo-2 (SM-2) algorithm
router.patch('/:id/revise', async (req, res) => {
  const { quality } = req.body // 'again' (1) | 'hard' (2) | 'good' (3) | 'easy' (4)

  const problem = await Problem.findOne({ _id: req.params.id, userId: req.userId })
  if (!problem) return res.status(404).json({ message: "Problem not found" })

  let currentInterval = problem.revisionIntervalDays || 7
  let easeFactor = problem.easeFactor || 2.5
  let revisionCount = (problem.revisionCount || 0) + 1

  if (!quality) {
    // Backward-compatible fallback
    problem.lastRevisedAt = new Date()
    problem.revisionCount = revisionCount
    await problem.save()
    return res.json(problem)
  }

  const q = String(quality).toLowerCase()
  let nextInterval = currentInterval

  switch (q) {
    case 'again':
      nextInterval = 1
      easeFactor = Math.max(1.3, easeFactor - 0.2)
      break
    case 'hard':
      nextInterval = Math.max(2, Math.round(currentInterval * 1.2))
      easeFactor = Math.max(1.3, easeFactor - 0.15)
      break
    case 'good':
      nextInterval = Math.max(3, Math.round(currentInterval * easeFactor))
      break
    case 'easy':
      nextInterval = Math.max(5, Math.round(currentInterval * easeFactor * 1.3))
      easeFactor = Math.min(3.5, easeFactor + 0.15)
      break
    default:
      nextInterval = currentInterval
  }

  problem.lastRevisedAt = new Date()
  problem.revisionIntervalDays = nextInterval
  problem.easeFactor = Number(easeFactor.toFixed(2))
  problem.revisionCount = revisionCount

  await problem.save()
  res.json(problem)
})

module.exports = router