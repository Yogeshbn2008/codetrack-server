require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');

// Set test environment secret and timeout
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
jest.setTimeout(20000);

const authRoutes = require('../routes/auth');
const User = require('../models/User');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

beforeAll(async () => {
  const baseUri = process.env.MONGO_URI;
  if (!baseUri) {
    throw new Error('MONGO_URI is missing from your .env file!');
  }

  // Switch database to 'codetrack_test' so your real data is never touched
  const testUri = baseUri.includes('?')
    ? baseUri.replace(/\/[^/?]+(\?)/, '/codetrack_test$1')
    : `${baseUri}/codetrack_test`;

  await mongoose.connect(testUri);
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    // Clean up test data and disconnect
    await User.deleteMany({ email: /@testcandidate\.com$/ });
    await mongoose.disconnect();
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: /@testcandidate\.com$/ });
  }
});

describe('Authentication API Integration Tests', () => {
  it('should register a new user successfully and hash the password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Candidate',
        email: 'john@testcandidate.com',
        password: 'SecurePassword123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('User registered successfully');

    // Verify user is in DB and password was hashed
    const user = await User.findOne({ email: 'john@testcandidate.com' });
    expect(user).toBeTruthy();
    expect(user.password).not.toBe('SecurePassword123'); // Hashed with bcrypt
  });

  it('should prevent duplicate email registration', async () => {
    await User.create({
      name: 'Existing',
      email: 'duplicate@testcandidate.com',
      password: 'somehashedpassword'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second Person',
        email: 'duplicate@testcandidate.com',
        password: 'Password123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Email already registered');
  });

  it('should reject login with incorrect credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User',
        email: 'login@testcandidate.com',
        password: 'CorrectPassword'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@testcandidate.com',
        password: 'WrongPassword'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid email or password');
  });
});