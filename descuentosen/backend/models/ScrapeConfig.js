const mongoose = require('mongoose')

const scrapeConfigSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true
  },
  store: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'otros'
  },
  location: {
    type: String,
    default: 'Nacional'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  frequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    default: 'daily'
  },
  lastScraped: {
    type: Date
  },
  selector: {
    title: String,
    price: String,
    image: String,
    discount: String
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('ScrapeConfig', scrapeConfigSchema)





