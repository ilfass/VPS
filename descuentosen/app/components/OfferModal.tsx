'use client'

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
}

interface OfferModalProps {
  offer: Offer
  onClose: () => void
}

export default function OfferModal({ offer, onClose }: OfferModalProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const handleVerOferta = () => {
    window.open(offer.url, '_blank')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-body">
          {offer.image && (
            <img
              src={offer.image}
              alt={offer.title}
              className="modal-image"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          
          <h2 className="modal-title">{offer.title}</h2>
          
          <div className="modal-info-grid">
            <div className="modal-info-item">
              <div className="modal-info-label">Tienda</div>
              <div className="modal-info-value">{offer.store}</div>
            </div>
            
            <div className="modal-info-item">
              <div className="modal-info-label">Descuento</div>
              <div className="modal-info-value">{offer.discount}</div>
            </div>
            
            <div className="modal-info-item">
              <div className="modal-info-label">Categoría</div>
              <div className="modal-info-value">{offer.category}</div>
            </div>
            
            <div className="modal-info-item">
              <div className="modal-info-label">Ubicación</div>
              <div className="modal-info-value">{offer.location}</div>
            </div>
            
            <div className="modal-info-item">
              <div className="modal-info-label">Fuente</div>
              <div className="modal-info-value">{offer.source}</div>
            </div>
            
            <div className="modal-info-item">
              <div className="modal-info-label">Fecha de extracción</div>
              <div className="modal-info-value">{formatDate(offer.extractedAt)}</div>
            </div>
          </div>

          {(offer.originalPrice || offer.discountPrice) && (
            <div className="modal-prices">
              {offer.originalPrice && (
                <div className="price-item">
                  <div className="price-label">Precio Original</div>
                  <div className="price-value price-original">
                    ${offer.originalPrice.toLocaleString('es-AR')}
                  </div>
                </div>
              )}
              {offer.discountPrice && (
                <div className="price-item">
                  <div className="price-label">Precio con Descuento</div>
                  <div className="price-value price-discount">
                    ${offer.discountPrice.toLocaleString('es-AR')}
                  </div>
                </div>
              )}
            </div>
          )}

          {offer.validity && (
            <div className="modal-info-item" style={{ marginTop: '1rem' }}>
              <div className="modal-info-label">Validez</div>
              <div className="modal-info-value">{offer.validity}</div>
            </div>
          )}

          {offer.requirements && (
            <div className="modal-info-item" style={{ marginTop: '1rem' }}>
              <div className="modal-info-label">Requisitos o Condiciones</div>
              <div className="modal-info-value">{offer.requirements}</div>
            </div>
          )}

          {offer.description && (
            <div className="modal-description">
              <strong>Descripción completa:</strong>
              <p style={{ marginTop: '0.5rem' }}>{offer.description}</p>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handleVerOferta}>
              Ver Oferta
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
