require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const authRoutes = require('./routes/auth')
const problemRoutes = require('./routes/problems')
const authMiddleware = require('./middleware/auth')

const app = express()

// 1. Behind Render reverse proxy (Crucial for rate limiter)
app.set('trust proxy', 1)

// 2. Security Headers
app.use(helmet())

// 3. CORS Configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://codetrack-henna.vercel.app']
}))
app.use(express.json())

// 4. Rate Limiters (Must be declared BEFORE routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 200,
  message: { message: "Too many requests from this IP, please try again later." }
})
app.use('/api', globalLimiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 min
  message: { message: "Too many login attempts. Please try again after 15 minutes." }
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// 5. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

// 6. Public Health Check Route
app.get('/', (req, res) => {
  res.send('CodeTrack API is running')
})

// 7. Application Routes
app.use('/api/auth', authRoutes)
app.use('/api/problems', authMiddleware, problemRoutes)

// 8. 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// 9. Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.stack)
  res.status(500).json({ message: "An unexpected error occurred" })
})

// 10. Start Server (Always at the very bottom!)
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})