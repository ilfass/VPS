const { GoogleGenerativeAI } = require('@google/generative-ai')
const axios = require('axios')
const cheerio = require('cheerio')

// Inicializar Gemini (puede fallar si no hay API key, pero no es crítico)
let genAI = null
let model = null
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    console.log('✅ Servicio de IA (Gemini) inicializado')
  } else {
    console.log('⚠️ GEMINI_API_KEY no configurada. El scraping con IA no estará disponible.')
  }
} catch (error) {
  console.log('⚠️ Error inicializando Gemini:', error.message)
}

/**
 * Extrae información de ofertas usando IA (Gemini)
 * @param {string} url - URL de la página
 * @param {object} config - Configuración de scraping
 * @returns {object} Datos extraídos de la oferta
 */
async function extractOfferWithAI(url, config) {
  if (!model) {
    throw new Error('Gemini no está configurado. Agrega GEMINI_API_KEY a las variables de entorno.')
  }

  try {
    console.log(`🤖 Extrayendo información con Gemini de: ${url}`)
    
    // Obtener el HTML de la página
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    const $ = cheerio.load(response.data)
    
    // Limpiar el HTML: remover scripts, estilos, y otros elementos innecesarios
    $('script, style, noscript, iframe, embed, object').remove()
    $('[style*="display:none"], [style*="display: none"], .hidden, [hidden]').remove()
    
    // Obtener texto relevante (limitar a ~30000 caracteres para Gemini)
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 30000)
    const title = $('title').text().trim() || ''
    const metaDescription = $('meta[name="description"]').attr('content') || ''
    
    // Construir prompt para Gemini
    const prompt = `Eres un experto en extraer información de ofertas y descuentos de páginas web.

Analiza el siguiente contenido de una página web y extrae información sobre ofertas, descuentos, precios y promociones.

URL: ${url}
Tienda: ${config.store}
Categoría esperada: ${config.category}
Ubicación esperada: ${config.location}

Título de la página: ${title}
Descripción: ${metaDescription}

Contenido de la página:
${bodyText}

IMPORTANTE: Responde SOLO con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. Solo el JSON puro con la siguiente estructura exacta:

{
  "title": "título de la oferta o promoción",
  "discount": "texto del descuento (ej: '20% OFF', 'Hasta $5000 de descuento')",
  "originalPrice": número o null,
  "discountPrice": número o null,
  "discountPercentage": número o null,
  "discountLimit": número o null,
  "description": "descripción de la oferta",
  "validity": "vigencia o fecha límite si está disponible",
  "requirements": "requisitos para aplicar el descuento si los hay",
  "image": "URL de imagen si está disponible en el contenido"
}

Si no encuentras información clara sobre una oferta, usa valores null o cadenas vacías. Los números deben ser números, no strings.`

    // Llamar a Gemini para extraer información estructurada
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    let extractedData
    
    try {
      // Intentar parsear directamente
      extractedData = JSON.parse(responseText)
    } catch (parseError) {
      // Intentar extraer JSON del texto si está envuelto en markdown o tiene texto adicional
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        console.error('Respuesta de Gemini:', responseText)
        throw new Error('No se pudo parsear la respuesta de Gemini')
      }
    }

    // Buscar imagen en el HTML si no se encontró en la respuesta de IA
    let imageUrl = extractedData.image || ''
    if (!imageUrl) {
      const firstImage = $('img').first()
      imageUrl = firstImage.attr('src') || firstImage.attr('data-src') || ''
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, url).href
      }
    }

    // Construir objeto de oferta
    const offerData = {
      title: extractedData.title || title || 'Oferta sin título',
      store: config.store,
      discount: extractedData.discount || 'Descuento disponible',
      category: config.category,
      location: config.location,
      image: imageUrl || undefined,
      source: url,
      url: url,
      extractedAt: new Date(),
      originalPrice: extractedData.originalPrice || null,
      discountPrice: extractedData.discountPrice || null,
      discountLimit: extractedData.discountLimit || null,
      discountPercentage: extractedData.discountPercentage || null,
      description: extractedData.description || undefined,
      validity: extractedData.validity || undefined,
      requirements: extractedData.requirements || undefined,
      isActive: true
    }

    console.log(`✅ Gemini extrajo: ${offerData.title}`)
    return { success: true, offer: offerData }
    
  } catch (error) {
    console.error(`❌ Error en extracción con Gemini: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Verifica si el servicio de IA está disponible
 */
function isAIAvailable() {
  return model !== null
}

module.exports = {
  extractOfferWithAI,
  isAIAvailable
}
