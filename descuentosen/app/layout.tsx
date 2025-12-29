import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Descuentos En - Agregador de Ofertas y Promociones',
  description: 'Encuentra las mejores ofertas y descuentos de tiendas online y físicas en un solo lugar',
  keywords: 'descuentos, ofertas, promociones, ahorro, rebajas',
  other: {
    'google-adsense-account': 'ca-pub-2913558400341127',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2913558400341127"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  )
}





