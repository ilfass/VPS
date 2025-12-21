'use client'

interface Offer {
  _id: string
  title: string
  store: string
  discount: string
  discountLimit?: number
  discountPercentage?: number
}

interface CalculatorProps {
  offers: Offer[]
  onClear: () => void
}

export default function Calculator({ offers, onClear }: CalculatorProps) {
  const calculateOffer = (offer: Offer) => {
    if (!offer.discountLimit || !offer.discountPercentage) {
      return null
    }

    // Si el descuento es del X%, para obtener $Y de descuento, necesitas gastar $Y / (X/100)
    const percentage = offer.discountPercentage / 100
    const requiredSpend = offer.discountLimit / percentage
    const totalSavings = offer.discountLimit

    return {
      requiredSpend,
      totalSavings,
      discountLimit: offer.discountLimit,
      discountPercentage: offer.discountPercentage
    }
  }

  const calculations = offers
    .map(offer => ({
      offer,
      calc: calculateOffer(offer)
    }))
    .filter(item => item.calc !== null)

  const totalRequiredSpend = calculations.reduce((sum, item) => sum + (item.calc?.requiredSpend || 0), 0)
  const totalSavings = calculations.reduce((sum, item) => sum + (item.calc?.totalSavings || 0), 0)

  if (calculations.length === 0) {
    return (
      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <p>Las ofertas seleccionadas no tienen información de topes de descuento.</p>
        <button className="btn btn-secondary" onClick={onClear} style={{ marginTop: '0.5rem' }}>
          Limpiar selección
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: 'white',
      border: '2px solid #3498db',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>
        🧮 Calculadora de Topes de Descuento
      </h2>

      <div style={{ marginBottom: '1.5rem' }}>
        {calculations.map(({ offer, calc }) => (
          <div
            key={offer._id}
            style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '0.75rem'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {offer.store} - {offer.discount}
            </div>
            {calc && (
              <div style={{ fontSize: '0.9rem', color: '#555' }}>
                <div>💵 Debes gastar: <strong>${calc.requiredSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong></div>
                <div>💰 Ahorrarás: <strong style={{ color: '#27ae60' }}>${calc.totalSavings.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong></div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginTop: '0.25rem' }}>
                  (Tope: ${calc.discountLimit.toLocaleString('es-AR')} con {calc.discountPercentage}% de descuento)
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        padding: '1rem',
        background: '#e8f5e9',
        borderRadius: '8px',
        border: '2px solid #27ae60',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#2c3e50' }}>
          📊 Resumen Total
        </div>
        <div style={{ fontSize: '1.2rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            Total a gastar: <strong style={{ color: '#2980b9' }}>${totalRequiredSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
          </div>
          <div>
            Ahorro total: <strong style={{ color: '#27ae60', fontSize: '1.4rem' }}>${totalSavings.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>
      </div>

      <div style={{
        padding: '1rem',
        background: '#fff3cd',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.9rem'
      }}>
        <strong>💡 Hoja de Ruta Recomendada:</strong>
        <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          {calculations
            .sort((a, b) => (b.calc?.discountPercentage || 0) - (a.calc?.discountPercentage || 0))
            .map(({ offer, calc }, index) => (
              <li key={offer._id} style={{ marginBottom: '0.25rem' }}>
                <strong>{offer.store}</strong> - Gastar ${calc?.requiredSpend.toLocaleString('es-AR', { maximumFractionDigits: 0 })} 
                para ahorrar ${calc?.totalSavings.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </li>
            ))}
        </ol>
      </div>

      <button className="btn btn-secondary" onClick={onClear}>
        Limpiar selección
      </button>
    </div>
  )
}
