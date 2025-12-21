import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Descuentos En - Agregador de Ofertas y Promociones',
  description: 'Encuentra las mejores ofertas y descuentos de tiendas online y físicas en un solo lugar',
  keywords: 'descuentos, ofertas, promociones, ahorro, rebajas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
