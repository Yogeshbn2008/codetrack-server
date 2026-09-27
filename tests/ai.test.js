require('dotenv').config();
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Ensure test JWT secret and timeout
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
jest.setTimeout(20000);

const aiRoutes = require('../routes/ai');
const authMiddleware = require('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/ai', authMiddleware, aiRoutes);

const mockUserId = '650000000000000000000001';
const validToken = jwt.sign({ id: mockUserId }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('AI Complexity & Socratic Hint Engine (/api/ai)', () => {

  describe('Authentication Check', () => {
    it('should reject requests without a Bearer token with 401', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-complexity')
        .send({ code: 'for (let i = 0; i < n; i++) {}' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/token/i);
    });
  });

  describe('POST /api/ai/analyze-complexity', () => {
    it('should return 400 if code snippet is missing or empty', async () => {
      const res = await request(app)
        .post('/api/ai/analyze-complexity')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ code: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Code snippet is required/i);
    });

    it('should correctly analyze nested loops as O(n²) complexity', async () => {
      const nestedCode = `
        function findPairs(arr) {
          for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
              if (arr[i] + arr[j] === 0) return true;
            }
          }
          return false;
        }
      `;

      const res = await request(app)
        .post('/api/ai/analyze-complexity')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ code: nestedCode, language: 'javascript' });

      expect(res.status).toBe(200);
      expect(res.body.timeComplexity).toMatch(/O\(n²\)|O\(n\^2\)/);
      expect(res.body.timeExplanation).toBeDefined();
      expect(res.body.spaceComplexity).toBeDefined();
      expect(Array.isArray(res.body.bottlenecks)).toBe(true);
      expect(Array.isArray(res.body.optimizations)).toBe(true);
    });

    it('should correctly identify sorting as O(n log n)', async () => {
      const sortCode = `
        function sortAndSearch(nums) {
          nums.sort((a, b) => a - b);
          return nums[0];
        }
      `;

      const res = await request(app)
        .post('/api/ai/analyze-complexity')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ code: sortCode, language: 'javascript' });

      expect(res.status).toBe(200);
      expect(res.body.timeComplexity).toMatch(/O\(n log n\)/);
    });
  });

  describe('POST /api/ai/socratic-hint', () => {
    it('should return 4 tiered progressive hints and a coachTip', async () => {
      const res = await request(app)
        .post('/api/ai/socratic-hint')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Two Sum',
          topic: 'Two Pointers',
          difficulty: 'Easy',
          notes: 'Looking for pairs adding up to target'
        });

      expect(res.status).toBe(200);
      expect(res.body.hint1).toBeDefined();
      expect(res.body.hint2).toBeDefined();
      expect(res.body.hint3).toBeDefined();
      expect(res.body.hint4).toBeDefined();
      expect(res.body.coachTip).toBeDefined();
    });
  });
});
