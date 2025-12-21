const express = require('express')
const router = express.Router()
const Offer = require('../models/Offer')
const ScrapeConfig = require('../models/ScrapeConfig')

// GET /api/admin/offers - Obtener todas las ofertas (incluyendo inactivas)
router.get('/offers', async (req, res) => {
  try {
    const offers = await Offer.find().sort({ extractedAt: -1 }).limit(500)
    res.json(offers)
  } catch (error) {
    console.error('Error fetching offers:', error)
    res.status(500).json({ error: 'Error al obtener ofertas' })
  }
})

// PUT /api/admin/offers/:id - Actualizar una oferta
router.put('/offers/:id', async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!offer) {
      return res.status(404).json({ error: 'Oferta no encontrada' })
    }
    res.json(offer)
  } catch (error) {
    console.error('Error updating offer:', error)
    res.status(500).json({ error: 'Error al actualizar la oferta' })
  }
})

// DELETE /api/admin/offers/:id - Eliminar una oferta
router.delete('/offers/:id', async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id)
    if (!offer) {
      return res.status(404).json({ error: 'Oferta no encontrada' })
    }
    res.json({ message: 'Oferta eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting offer:', error)
    res.status(500).json({ error: 'Error al eliminar la oferta' })
  }
})

// GET /api/admin/configs - Obtener todas las configuraciones de scraping
router.get('/configs', async (req, res) => {
  try {
    const configs = await ScrapeConfig.find().sort({ createdAt: -1 })
    res.json(configs)
  } catch (error) {
    console.error('Error fetching configs:', error)
    res.status(500).json({ error: 'Error al obtener configuraciones' })
  }
})

// POST /api/admin/configs - Crear una nueva configuración de scraping
router.post('/configs', async (req, res) => {
  try {
    const config = new ScrapeConfig(req.body)
    await config.save()
    res.status(201).json(config)
  } catch (error) {
    console.error('Error creating config:', error)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Esta URL ya está configurada' })
    }
    res.status(500).json({ error: 'Error al crear la configuración' })
  }
})

// PUT /api/admin/configs/:id - Actualizar una configuración
router.put('/configs/:id', async (req, res) => {
  try {
    const config = await ScrapeConfig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' })
    }
    res.json(config)
  } catch (error) {
    console.error('Error updating config:', error)
    res.status(500).json({ error: 'Error al actualizar la configuración' })
  }
})

// DELETE /api/admin/configs/:id - Eliminar una configuración
router.delete('/configs/:id', async (req, res) => {
  try {
    const config = await ScrapeConfig.findByIdAndDelete(req.params.id)
    if (!config) {
      return res.status(404).json({ error: 'Oferta no encontrada' })
    }
    res.json({ message: 'Configuración eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting config:', error)
    res.status(500).json({ error: 'Error al eliminar la configuración' })
  }
})

module.exports = router
