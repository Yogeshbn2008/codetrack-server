require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const authRoutes = require('./routes/auth')
const problemRoutes = require('./routes/problems')
const authMiddleware = require('./middleware/auth')

const app = express()

// Global Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'https://codetrack-henna.vercel.app']
}))
app.use(express.json())

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

// Public Health Check Route
app.get('/', (req, res) => {
  res.send('CodeTrack API is running')
})

// Application Routes
app.use('/api/auth', authRoutes)
app.use('/api/problems', authMiddleware, problemRoutes)

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.stack)
  res.status(500).json({ message: "An unexpected error occurred" })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})