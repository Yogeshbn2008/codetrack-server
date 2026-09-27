const express = require('express')
const router = express.Router()
const Goal = require('../models/Goal')

// Helper: Format today's date if not passed
function getISODateKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

// 1. GET /api/goals/daily-overview?today=YYYY-MM-DD&tomorrow=YYYY-MM-DD
router.get('/daily-overview', async (req, res) => {
  try {
    const today = req.query.today || getISODateKey()
    
    // Calculate default tomorrow if not provided
    let tomorrow = req.query.tomorrow
    if (!tomorrow) {
      const tomorrowDate = new Date()
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)
      tomorrow = getISODateKey(tomorrowDate)
    }

    // Fetch Today's Goals, Tomorrow's Queued Goals, and Incomplete Past Goals
    const [todayGoals, tomorrowGoals, pendingFromYesterday] = await Promise.all([
      Goal.find({ userId: req.userId, date: today }).sort({ createdAt: 1 }),
      Goal.find({ userId: req.userId, date: tomorrow }).sort({ createdAt: 1 }),
      Goal.find({ 
        userId: req.userId, 
        date: { $lt: today }, 
        isCompleted: false 
      }).sort({ date: -1, createdAt: 1 }).limit(10)
    ])

    const todayTotal = todayGoals.length
    const todayCompleted = todayGoals.filter(g => g.isCompleted).length
    const completionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

    res.json({
      today,
      tomorrow,
      todayGoals,
      tomorrowGoals,
      pendingFromYesterday,
      stats: {
        todayTotal,
        todayCompleted,
        completionRate
      }
    })
  } catch (err) {
    console.error("Error fetching daily goals overview:", err)
    res.status(500).json({ message: "Server error fetching goals overview" })
  }
})

// 2. POST /api/goals - Create a new goal for today or tomorrow
router.post('/', async (req, res) => {
  try {
    const { title, date, type, priority, problemId, problemUrl } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Goal title is required" })
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Valid date in YYYY-MM-DD format is required" })
    }

    const goal = new Goal({
      userId: req.userId,
      title: title.trim(),
      date,
      type: type || 'custom',
      priority: priority || 'medium',
      problemId: problemId || null,
      problemUrl: problemUrl || ''
    })

    await goal.save()
    res.status(201).json(goal)
  } catch (err) {
    console.error("Error creating goal:", err)
    res.status(500).json({ message: "Server error creating goal" })
  }
})

// 3. PATCH /api/goals/:id/toggle - Toggle completion status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId })
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" })
    }

    goal.isCompleted = !goal.isCompleted
    goal.completedAt = goal.isCompleted ? new Date() : null

    await goal.save()
    res.json(goal)
  } catch (err) {
    console.error("Error toggling goal:", err)
    res.status(500).json({ message: "Server error toggling goal" })
  }
})

// 4. PUT /api/goals/:id - Update goal details (title, type, priority, date)
router.put('/:id', async (req, res) => {
  try {
    const { title, date, type, priority } = req.body

    const goal = await Goal.findOne({ _id: req.params.id, userId: req.userId })
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" })
    }

    if (title && title.trim()) goal.title = title.trim()
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) goal.date = date
    if (type) goal.type = type
    if (priority) goal.priority = priority

    await goal.save()
    res.json(goal)
  } catch (err) {
    console.error("Error updating goal:", err)
    res.status(500).json({ message: "Server error updating goal" })
  }
})

// 5. POST /api/goals/rollover - Move yesterday's incomplete goals into today
router.post('/rollover', async (req, res) => {
  try {
    const today = req.body.today || getISODateKey()

    const result = await Goal.updateMany(
      { 
        userId: req.userId, 
        date: { $lt: today }, 
        isCompleted: false 
      },
      { 
        $set: { 
          date: today, 
          rolledOver: true 
        } 
      }
    )

    res.json({ 
      message: "Incomplete goals rolled over successfully", 
      modifiedCount: result.modifiedCount 
    })
  } catch (err) {
    console.error("Error rolling over goals:", err)
    res.status(500).json({ message: "Server error rolling over goals" })
  }
})

// 5. DELETE /api/goals/:id - Delete a goal
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" })
    }

    res.json({ message: "Goal deleted successfully", id: req.params.id })
  } catch (err) {
    console.error("Error deleting goal:", err)
    res.status(500).json({ message: "Server error deleting goal" })
  }
})

module.exports = router
