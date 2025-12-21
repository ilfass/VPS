import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Intentar obtener ubicación desde headers (si está detrás de un proxy)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip')
    
    // Por ahora retornamos una ubicación genérica
    // En producción, podrías usar un servicio de geolocalización por IP
    return NextResponse.json({
      location: 'Buenos Aires', // Por defecto
      ip: ip || 'unknown'
    })
  } catch (error) {
    console.error('Error detecting location:', error)
    return NextResponse.json(
      { location: null },
      { status: 500 }
    )
  }
}
