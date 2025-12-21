const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/offers', require('./routes/offers'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/scraper', require('./routes/scraper'))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/descuentosen'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB')
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error)
    process.exit(1)
  })

module.exports = app
