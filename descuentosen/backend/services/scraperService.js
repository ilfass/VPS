const axios = require('axios')
const cheerio = require('cheerio')
const cron = require('node-cron')
const Offer = require('../models/Offer')
const ScrapeConfig = require('../models/ScrapeConfig')
const { extractOfferWithAI, isAIAvailable } = require('./aiService')

let scrapingInterval = null
let isScraping = false
let lastScrapeResult = null

// Función de scraping tradicional (fallback)
async function scrapeUrlTraditional(config) {
  try {
    console.log(`🔍 Scrapeando (método tradicional): ${config.url}`)
    
    const response = await axios.get(config.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    const $ = cheerio.load(response.data)
    
    // Extraer información usando selectores configurados o detección automática
    const title = config.selector?.title 
      ? $(config.selector.title).first().text().trim()
      : $('h1, .title, [class*="title"]').first().text().trim() || 'Oferta sin título'
    
    const priceText = config.selector?.price
      ? $(config.selector.price).first().text().trim()
      : $('[class*="price"], .price, [data-price]').first().text().trim() || ''
    
    const image = config.selector?.image
      ? $(config.selector.image).first().attr('src') || $(config.selector.image).first().attr('data-src')
      : $('img').first().attr('src') || $('img').first().attr('data-src') || ''
    
    const discountText = config.selector?.discount
      ? $(config.selector.discount).first().text().trim()
      : $('[class*="discount"], .discount, [class*="descuento"]').first().text().trim() || ''
    
    // Procesar precios
    const priceMatch = priceText.match(/[\d.,]+/)
    const originalPrice = priceMatch ? parseFloat(priceMatch[0].replace(/[,.]/g, '')) : null
    
    // Detectar porcentaje de descuento
    const discountMatch = discountText.match(/(\d+)%/) || title.match(/(\d+)%/)
    const discountPercentage = discountMatch ? parseInt(discountMatch[1]) : null
    
    // Detectar tope de descuento
    const limitMatch = discountText.match(/tope.*?(\d+)/i) || title.match(/tope.*?(\d+)/i)
    const discountLimit = limitMatch ? parseFloat(limitMatch[1].replace(/[,.]/g, '')) : null
    
    const discountPrice = originalPrice && discountPercentage
      ? originalPrice * (1 - discountPercentage / 100)
      : null
    
    // Crear o actualizar oferta
    const offerData = {
      title: title || 'Oferta sin título',
      store: config.store,
      discount: discountText || `${discountPercentage || 'Descuento'}%`,
      category: config.category,
      location: config.location,
      image: image ? (image.startsWith('http') ? image : new URL(image, config.url).href) : undefined,
      source: config.url,
      url: config.url,
      extractedAt: new Date(),
      originalPrice,
      discountPrice,
      discountLimit,
      discountPercentage,
      isActive: true
    }
    
    await Offer.findOneAndUpdate(
      { url: config.url },
      offerData,
      { upsert: true, new: true }
    )
    
    console.log(`✅ Oferta procesada (tradicional): ${title}`)
    return { success: true, offer: offerData }
  } catch (error) {
    console.error(`❌ Error scrapeando ${config.url}:`, error.message)
    return { success: false, error: error.message }
  }
}

// Función principal de scraping (usa IA si está disponible, fallback a tradicional)
async function scrapeUrl(config) {
  try {
    console.log(`🔍 Scrapeando: ${config.url}`)
    
    // Intentar primero con IA si está disponible
    if (isAIAvailable()) {
      console.log('🤖 Intentando extracción con IA...')
      const aiResult = await extractOfferWithAI(config.url, config)
      
      if (aiResult.success && aiResult.offer) {
        // Guardar la oferta extraída por IA
        await Offer.findOneAndUpdate(
          { url: config.url },
          aiResult.offer,
          { upsert: true, new: true }
        )
        
        console.log(`✅ Oferta procesada con IA: ${aiResult.offer.title}`)
        return { success: true, offer: aiResult.offer, method: 'ai' }
      } else {
        console.log('⚠️ IA no pudo extraer información, intentando método tradicional...')
      }
    } else {
      console.log('⚠️ IA no disponible, usando método tradicional...')
    }
    
    // Fallback al método tradicional
    const traditionalResult = await scrapeUrlTraditional(config)
    if (traditionalResult.success) {
      return { ...traditionalResult, method: 'traditional' }
    }
    
    return traditionalResult
    
  } catch (error) {
    console.error(`❌ Error scrapeando ${config.url}:`, error.message)
    return { success: false, error: error.message }
  }
}

// Scrapear todas las configuraciones activas
async function scrapeAll() {
  if (isScraping) {
    console.log('⏳ Scraping ya en progreso...')
    return
  }
  
  isScraping = true
  const results = []
  
  try {
    const configs = await ScrapeConfig.find({ isActive: true })
    
    if (configs.length === 0) {
      console.log('⚠️ No hay configuraciones de scraping activas. Agrega configuraciones desde el panel de administración.')
      lastScrapeResult = {
        timestamp: new Date(),
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
        message: 'No hay configuraciones de scraping activas'
      }
      return
    }
    
    console.log(`🚀 Iniciando scraping de ${configs.length} URLs...`)
    
    for (const config of configs) {
      const result = await scrapeUrl(config)
      results.push({ url: config.url, ...result })
      
      // Actualizar última fecha de scraping
      config.lastScraped = new Date()
      await config.save()
      
      // Pequeña pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    lastScrapeResult = {
      timestamp: new Date(),
      total: configs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
    
    console.log(`✅ Scraping completado: ${lastScrapeResult.successful}/${lastScrapeResult.total} exitosos`)
  } catch (error) {
    console.error('❌ Error en scraping general:', error)
  } finally {
    isScraping = false
  }
}

// Iniciar scraping programado
function startScraping() {
  if (scrapingInterval) {
    console.log('⚠️ Scraping ya está programado')
    return
  }
  
  // Ejecutar inmediatamente
  scrapeAll()
  
  // Programar ejecución diaria a las 6 AM
  scrapingInterval = cron.schedule('0 6 * * *', () => {
    console.log('⏰ Ejecutando scraping programado...')
    scrapeAll()
  }, {
    scheduled: true,
    timezone: 'America/Argentina/Buenos_Aires'
  })
  
  console.log('✅ Scraping programado iniciado (diario a las 6 AM)')
}

// Detener scraping programado
function stopScraping() {
  if (scrapingInterval) {
    scrapingInterval.stop()
    scrapingInterval = null
    console.log('⏹️ Scraping programado detenido')
  }
}

// Obtener estado del scraping
function getScrapingStatus() {
  return {
    isRunning: scrapingInterval !== null,
    isScraping: isScraping,
    lastResult: lastScrapeResult
  }
}

module.exports = {
  scrapeAll,
  scrapeUrl,
  startScraping,
  stopScraping,
  getScrapingStatus
}

