import { NextResponse } from 'next/server'

const API_URL = process.env.BACKEND_URL || 'http://descuentosen-backend:3001'

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/offers`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Error al obtener ofertas')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching offers:', error)
    return NextResponse.json(
      { error: 'Error al cargar ofertas' },
      { status: 500 }
    )
  }
}
