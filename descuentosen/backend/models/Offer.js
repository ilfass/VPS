const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  store: {
    type: String,
    required: true,
    index: true
  },
  discount: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true,
    enum: ['supermercado', 'combustible', 'tecnologia', 'indumentaria', 'hogar', 'salud', 'entretenimiento', 'restaurantes', 'otros']
  },
  location: {
    type: String,
    required: true,
    index: true
  },
  image: {
    type: String
  },
  source: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  extractedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  validity: {
    type: String
  },
  requirements: {
    type: String
  },
  description: {
    type: String
  },
  originalPrice: {
    type: Number
  },
  discountPrice: {
    type: Number
  },
  discountLimit: {
    type: Number
  },
  discountPercentage: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
})

// Índices compuestos para búsquedas eficientes
offerSchema.index({ category: 1, location: 1, isActive: 1 })
offerSchema.index({ store: 1, isActive: 1 })
offerSchema.index({ extractedAt: -1 })

module.exports = mongoose.model('Offer', offerSchema)
