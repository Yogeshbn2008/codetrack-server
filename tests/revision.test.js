require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const express = require('express')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345'
jest.setTimeout(20000)

const Problem = require('../models/Problem')
const problemRoutes = require('../routes/problems')
const authMiddleware = require('../middleware/auth')

const app = express()
app.use(express.json())
app.use('/api/problems', authMiddleware, problemRoutes)

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
    await Problem.deleteMany({ userId: testUserId })
    await mongoose.disconnect()
  }
})

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await Problem.deleteMany({ userId: testUserId })
  }
})

describe('Adaptive Spaced Repetition (SM-2) Integration Tests', () => {
  it('should reset interval to 1 day when recall quality is "again"', async () => {
    const problem = await Problem.create({
      userId: testUserId,
      title: 'Median of Two Sorted Arrays',
      revisionIntervalDays: 7,
      easeFactor: 2.5,
      revisionCount: 1
    })

    const res = await request(app)
      .patch(`/api/problems/${problem._id}/revise`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quality: 'again' })

    expect(res.statusCode).toBe(200)
    expect(res.body.revisionIntervalDays).toBe(1)
    expect(res.body.easeFactor).toBe(2.3) // 2.5 - 0.2
    expect(res.body.revisionCount).toBe(2)
  })

  it('should multiply interval by easeFactor when recall quality is "good"', async () => {
    const problem = await Problem.create({
      userId: testUserId,
      title: 'LRU Cache',
      revisionIntervalDays: 7,
      easeFactor: 2.5,
      revisionCount: 1
    })

    const res = await request(app)
      .patch(`/api/problems/${problem._id}/revise`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quality: 'good' })

    expect(res.statusCode).toBe(200)
    expect(res.body.revisionIntervalDays).toBe(18) // Math.round(7 * 2.5) = 18
    expect(res.body.easeFactor).toBe(2.5)
    expect(res.body.revisionCount).toBe(2)
  })

  it('should significantly expand interval and increase easeFactor on "easy"', async () => {
    const problem = await Problem.create({
      userId: testUserId,
      title: 'Two Sum',
      revisionIntervalDays: 7,
      easeFactor: 2.5,
      revisionCount: 2
    })

    const res = await request(app)
      .patch(`/api/problems/${problem._id}/revise`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quality: 'easy' })

    expect(res.statusCode).toBe(200)
    expect(res.body.revisionIntervalDays).toBe(23) // Math.round(7 * 2.5 * 1.3) = 22.75 -> 23
    expect(res.body.easeFactor).toBe(2.65) // 2.5 + 0.15
    expect(res.body.revisionCount).toBe(3)
  })

  it('should support backward-compatible revise without quality payload', async () => {
    const problem = await Problem.create({
      userId: testUserId,
      title: 'Invert Binary Tree',
      revisionIntervalDays: 7,
      easeFactor: 2.5,
      revisionCount: 0
    })

    const res = await request(app)
      .patch(`/api/problems/${problem._id}/revise`)
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.statusCode).toBe(200)
    expect(res.body.revisionIntervalDays).toBe(7)
    expect(res.body.revisionCount).toBe(1)
  })
})
