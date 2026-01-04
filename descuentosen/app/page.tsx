'use client'

import { useState, useEffect } from 'react'
import OfferModal from './components/OfferModal'
import Calculator from './components/Calculator'

interface Offer {
  _id: string
  title: string
  store: string
  discount: string
  category: string
  location: string
  image?: string
  source: string
  url: string
  extractedAt: string
  validity?: string
  requirements?: string
  description?: string
  originalPrice?: number
  discountPrice?: number
  discountLimit?: number
  discountPercentage?: number
}

export default function Home() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([])
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [userLocation, setUserLocation] = useState<string | null>(null)

  useEffect(() => {
    fetchOffers()
    detectUserLocation()
  }, [])

  useEffect(() => {
    filterOffers()
  }, [offers, searchTerm, categoryFilter, locationFilter])

  const detectUserLocation = async () => {
    try {
      const response = await fetch('/api/location')
      const data = await response.json()
      if (data.location) {
        setUserLocation(data.location)
      }
    } catch (err) {
      console.error('Error detecting location:', err)
    }
  }

  const fetchOffers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/offers')
      if (!response.ok) throw new Error('Error al cargar ofertas')
      const data = await response.json()
      setOffers(data)
      setError(null)
    } catch (err) {
      setError('No se pudieron cargar las ofertas. Por favor, intenta más tarde.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filterOffers = () => {
    let filtered = [...offers]

    if (searchTerm) {
      filtered = filtered.filter(offer =>
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter) {
      filtered = filtered.filter(offer => offer.category === categoryFilter)
    }

    if (locationFilter) {
      if (locationFilter === 'local' && userLocation) {
        filtered = filtered.filter(offer =>
          offer.location.toLowerCase().includes(userLocation.toLowerCase())
        )
      } else if (locationFilter === 'nacional') {
        filtered = filtered.filter(offer =>
          offer.location.toLowerCase().includes('nacional') ||
          offer.location.toLowerCase().includes('todo el país')
        )
      }
    }

    // Priorizar ofertas locales si hay ubicación detectada
    if (userLocation && !locationFilter) {
      filtered.sort((a, b) => {
        const aIsLocal = a.location.toLowerCase().includes(userLocation.toLowerCase())
        const bIsLocal = b.location.toLowerCase().includes(userLocation.toLowerCase())
        if (aIsLocal && !bIsLocal) return -1
        if (!aIsLocal && bIsLocal) return 1
        return 0
      })
    }

    setFilteredOffers(filtered)
  }

  const categories = Array.from(new Set(offers.map(o => o.category))).filter(Boolean)

  const handleOfferClick = (offer: Offer) => {
    setSelectedOffer(offer)
  }

  const handleCloseModal = () => {
    setSelectedOffer(null)
  }

  const toggleOfferSelection = (offer: Offer) => {
    setSelectedOffers(prev => {
      const exists = prev.find(o => o._id === offer._id)
      if (exists) {
        return prev.filter(o => o._id !== offer._id)
      } else {
        return [...prev, offer]
      }
    })
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🛍️ Descuentos En</h1>
        <p style={{ textAlign: 'center', color: '#7f8c8d', marginTop: '0.5rem' }}>
          Encuentra las mejores ofertas y descuentos en un solo lugar
        </p>
      </header>

      <div className="filters">
        <input
          type="text"
          className="search-box"
          placeholder="Buscar ofertas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="">Todas las ubicaciones</option>
          <option value="local">Local</option>
          <option value="nacional">Nacional</option>
        </select>
      </div>

      {selectedOffers.length > 0 && (
        <Calculator offers={selectedOffers} onClear={() => setSelectedOffers([])} />
      )}

      {loading && <div className="loading">Cargando ofertas...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <>
          {filteredOffers.length === 0 ? (
            <div className="loading">
              {offers.length === 0 
                ? 'No hay ofertas disponibles. El sistema está buscando ofertas, por favor intenta más tarde.'
                : 'No se encontraron ofertas con los filtros seleccionados'}
            </div>
          ) : (
            <div className="offers-grid">
              {filteredOffers.map(offer => (
                <div
                  key={offer._id}
                  className="offer-card"
                  onClick={() => handleOfferClick(offer)}
                >
                  {offer.image && (
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="offer-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="offer-content">
                    <h3 className="offer-title">{offer.title}</h3>
                    <div className="offer-store">{offer.store}</div>
                    <div>
                      <span className="offer-discount">{offer.discount}</span>
                      {offer.category && (
                        <span className="offer-category">{offer.category}</span>
                      )}
                    </div>
                    {offer.location && (
                      <div className="offer-location">📍 {offer.location}</div>
                    )}
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: '0.5rem', width: '100%' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleOfferSelection(offer)
                      }}
                    >
                      {selectedOffers.find(o => o._id === offer._id) ? '✓ Seleccionado' : 'Seleccionar para calculadora'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedOffer && (
        <OfferModal offer={selectedOffer} onClose={handleCloseModal} />
      )}
    </div>
  )
}






