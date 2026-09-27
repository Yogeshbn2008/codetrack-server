require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const express = require('express')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345'

const Goal = require('../models/Goal')
const goalRoutes = require('../routes/goals')
const authMiddleware = require('../middleware/auth')

const app = express()
app.use(express.json())
app.use('/api/goals', authMiddleware, goalRoutes)

const testUserId = new mongoose.Types.ObjectId()
const token = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET)

beforeAll(async () => {
  const baseUri = process.env.MONGO_URI
  if (!baseUri) {
    throw new Error('MONGO_URI is missing from your .env file!')
  }

  const testUri = baseUri.includes('?')
    ? baseUri.replace(/\/[^/?]+(\?)/, '/codetrack_test$1')
    : `${baseUri}/codetrack_test`

  await mongoose.connect(testUri)
}, 30000)

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await Goal.deleteMany({ userId: testUserId })
    await mongoose.disconnect()
  }
})

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await Goal.deleteMany({ userId: testUserId })
  }
})

describe('Daily Goals API Integration Tests', () => {
  const todayStr = '2026-09-27'
  const tomorrowStr = '2026-09-28'

  it('should create a new goal for today', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Solve 2 Dynamic Programming problems',
        date: todayStr,
        type: 'topic',
        priority: 'high'
      })

    expect(res.statusCode).toBe(201)
    expect(res.body.title).toBe('Solve 2 Dynamic Programming problems')
    expect(res.body.date).toBe(todayStr)
    expect(res.body.isCompleted).toBe(false)
    expect(res.body.userId).toBe(testUserId.toString())
  })

  it('should create a goal queued for tomorrow', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Revise LRU Cache Implementation',
        date: tomorrowStr,
        type: 'revision',
        priority: 'medium'
      })

    expect(res.statusCode).toBe(201)
    expect(res.body.title).toBe('Revise LRU Cache Implementation')
    expect(res.body.date).toBe(tomorrowStr)
  })

  it('should toggle goal completion status', async () => {
    const goal = await Goal.create({
      userId: testUserId,
      title: 'Practice Binary Search',
      date: todayStr,
      isCompleted: false
    })

    const res = await request(app)
      .patch(`/api/goals/${goal._id}/toggle`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.isCompleted).toBe(true)
    expect(res.body.completedAt).not.toBeNull()

    // Toggle back to incomplete
    const res2 = await request(app)
      .patch(`/api/goals/${goal._id}/toggle`)
      .set('Authorization', `Bearer ${token}`)

    expect(res2.statusCode).toBe(200)
    expect(res2.body.isCompleted).toBe(false)
    expect(res2.body.completedAt).toBeNull()
  })

  it('should fetch daily overview with today, tomorrow, and stats', async () => {
    await Goal.create([
      { userId: testUserId, title: 'Goal 1', date: todayStr, isCompleted: true },
      { userId: testUserId, title: 'Goal 2', date: todayStr, isCompleted: false },
      { userId: testUserId, title: 'Tomorrow Task', date: tomorrowStr, isCompleted: false }
    ])

    const res = await request(app)
      .get(`/api/goals/daily-overview?today=${todayStr}&tomorrow=${tomorrowStr}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.todayGoals.length).toBe(2)
    expect(res.body.tomorrowGoals.length).toBe(1)
    expect(res.body.stats.todayTotal).toBe(2)
    expect(res.body.stats.todayCompleted).toBe(1)
    expect(res.body.stats.completionRate).toBe(50)
  })

  it('should rollover incomplete goals from yesterday into today', async () => {
    const yesterdayStr = '2026-09-26'
    await Goal.create([
      { userId: testUserId, title: 'Unfinished Yesterday', date: yesterdayStr, isCompleted: false },
      { userId: testUserId, title: 'Finished Yesterday', date: yesterdayStr, isCompleted: true }
    ])

    const res = await request(app)
      .post('/api/goals/rollover')
      .set('Authorization', `Bearer ${token}`)
      .send({ today: todayStr })

    expect(res.statusCode).toBe(200)
    expect(res.body.modifiedCount).toBe(1)

    // Check that unfinished goal now has date = todayStr and rolledOver = true
    const rolled = await Goal.findOne({ userId: testUserId, title: 'Unfinished Yesterday' })
    expect(rolled.date).toBe(todayStr)
    expect(rolled.rolledOver).toBe(true)

    // Check finished goal stayed on yesterday
    const finished = await Goal.findOne({ userId: testUserId, title: 'Finished Yesterday' })
    expect(finished.date).toBe(yesterdayStr)
  })

  it('should update a goal title, priority, and date via PUT', async () => {
    const goal = await Goal.create({
      userId: testUserId,
      title: 'Original Title',
      date: todayStr,
      priority: 'low',
      type: 'custom'
    })

    const res = await request(app)
      .put(`/api/goals/${goal._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Strategic Goal',
        priority: 'high',
        type: 'problem',
        date: tomorrowStr
      })

    expect(res.statusCode).toBe(200)
    expect(res.body.title).toBe('Updated Strategic Goal')
    expect(res.body.priority).toBe('high')
    expect(res.body.type).toBe('problem')
    expect(res.body.date).toBe(tomorrowStr)

    const updatedInDb = await Goal.findById(goal._id)
    expect(updatedInDb.title).toBe('Updated Strategic Goal')
    expect(updatedInDb.priority).toBe('high')
    expect(updatedInDb.date).toBe(tomorrowStr)
  })

  it('should delete a goal successfully', async () => {
    const goal = await Goal.create({
      userId: testUserId,
      title: 'Goal to delete',
      date: todayStr
    })

    const res = await request(app)
      .delete(`/api/goals/${goal._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.statusCode).toBe(200)
    const exists = await Goal.findById(goal._id)
    expect(exists).toBeNull()
  })
})
