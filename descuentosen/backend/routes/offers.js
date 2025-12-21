const express = require('express')
const router = express.Router()
const Offer = require('../models/Offer')

// GET /api/offers - Obtener todas las ofertas activas
router.get('/', async (req, res) => {
  try {
    const { category, location, search, limit = 100 } = req.query
    
    const query = { isActive: true }
    
    if (category) {
      query.category = category
    }
    
    if (location) {
      query.location = new RegExp(location, 'i')
    }
    
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { store: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ]
    }
    
    const offers = await Offer.find(query)
      .sort({ extractedAt: -1 })
      .limit(parseInt(limit))
    
    res.json(offers)
  } catch (error) {
    console.error('Error fetching offers:', error)
    res.status(500).json({ error: 'Error al obtener ofertas' })
  }
})

// GET /api/offers/:id - Obtener una oferta específica
router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
    if (!offer) {
      return res.status(404).json({ error: 'Oferta no encontrada' })
    }
    res.json(offer)
  } catch (error) {
    console.error('Error fetching offer:', error)
    res.status(500).json({ error: 'Error al obtener la oferta' })
  }
})

module.exports = router
