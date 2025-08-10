import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import { errorHandler, notFound } from './middleware/error.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Middleware
app.use(limiter)
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(compression())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'MetricSoft Backend API',
    version: '1.0.0',
    description: 'Performance Management Platform API',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      health: '/health'
    }
  })
})

// Error handling
app.use(notFound)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MetricSoft Backend Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
  console.log(`📋 API Documentation: http://localhost:${PORT}/api`)
})

export default app
