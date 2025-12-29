# Configuración de Google AdSense para Nuevos Sitios

Este documento contiene los pasos necesarios para vincular un nuevo sitio con Google AdSense.

## Información de la Cuenta

- **ID de Publicador de AdSense**: `ca-pub-2913558400341127`

## Pasos para Configurar AdSense

### 1. Meta Tag de AdSense

Agregar la siguiente meta tag dentro de las etiquetas `<head></head>` de cada página:

```html
<meta name="google-adsense-account" content="ca-pub-2913558400341127">
```

### 2. Script de AdSense

Agregar el siguiente script dentro de las etiquetas `<head></head>` de cada página:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2913558400341127"
     crossorigin="anonymous"></script>
```

## Implementación por Tipo de Sitio

### Sitios HTML Estáticos

Para sitios con archivos HTML estáticos (como `habilispro`, `habilispro-live`, `expodiario`):

1. Abrir el archivo `index.html` (o el archivo HTML principal)
2. Localizar la sección `<head>`
3. Agregar primero la meta tag
4. Agregar luego el script
5. Guardar el archivo

**Ejemplo de implementación:**

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="google-adsense-account" content="ca-pub-2913558400341127">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2913558400341127"
     crossorigin="anonymous"></script>
    <title>Mi Sitio</title>
    <!-- resto de meta tags y enlaces -->
</head>
```

### Sitios Next.js (App Router)

Para sitios Next.js 13+ con App Router (como `descuentosen`):

1. Abrir el archivo `app/layout.tsx`
2. Importar el componente `Script` de Next.js
3. Agregar la meta tag en el objeto `metadata`
4. Agregar el componente `Script` dentro del `body`

**Ejemplo de implementación:**

```typescript
import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mi Sitio',
  description: 'Descripción del sitio',
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
```

**Nota importante para Next.js:**
- El componente `Script` debe ir dentro del `body`, no dentro de un `<head>` manual
- Usar `strategy="afterInteractive"` para cargar el script después de que la página sea interactiva
- La meta tag se agrega en el objeto `metadata` usando la propiedad `other`

## Verificación

Después de implementar ambos elementos:

1. Verificar que la meta tag esté presente en el `<head>` del HTML generado
2. Verificar que el script de AdSense esté cargando correctamente
3. En la consola del navegador, no deberían aparecer errores relacionados con AdSense
4. En Google AdSense, el sitio debería aparecer como verificado después de unos minutos

## Sitios Actualmente Configurados

- ✅ `habilispro` - HTML estático
- ✅ `habilispro-live` - HTML estático
- ✅ `expodiario` - HTML estático
- ✅ `descuentosen` - Next.js App Router

## Referencias

- [Documentación oficial de AdSense](https://support.google.com/adsense/answer/9261304)
- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)

