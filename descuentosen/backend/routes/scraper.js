const express = require('express')
const router = express.Router()
const { startScraping, stopScraping, getScrapingStatus } = require('../services/scraperService')

// POST /api/scraper/start - Iniciar scraping
router.post('/start', async (req, res) => {
  try {
    await startScraping()
    res.json({ message: 'Scraping iniciado', status: 'running' })
  } catch (error) {
    console.error('Error starting scraper:', error)
    res.status(500).json({ error: 'Error al iniciar el scraper' })
  }
})

// POST /api/scraper/stop - Detener scraping
router.post('/stop', async (req, res) => {
  try {
    stopScraping()
    res.json({ message: 'Scraping detenido', status: 'stopped' })
  } catch (error) {
    console.error('Error stopping scraper:', error)
    res.status(500).json({ error: 'Error al detener el scraper' })
  }
})

// GET /api/scraper/status - Obtener estado del scraping
router.get('/status', async (req, res) => {
  try {
    const status = getScrapingStatus()
    res.json(status)
  } catch (error) {
    console.error('Error getting scraper status:', error)
    res.status(500).json({ error: 'Error al obtener el estado' })
  }
})

module.exports = router
