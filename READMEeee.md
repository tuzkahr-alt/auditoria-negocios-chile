# 📍 Auditoría Negocios Chile — Sin Sitio Web

Herramienta web para encontrar negocios registrados en Google Maps en Chile que **no tienen sitio web** — ideal para identificar oportunidades de contacto y venta de servicios digitales.

## ✨ Funcionalidades

- 🔍 **Búsqueda por ciudad y radio** — busca en cualquier ciudad de Chile
- 📂 **20+ categorías** — restaurantes, tiendas, talleres, peluquerías, dentistas, etc.
- 📞 **Llamada directa** — botón para llamar al negocio con un toque
- 🗺️ **Link a Google Maps** — ver el negocio en el mapa
- 📊 **Vista en tarjetas o lista** — elige cómo ver los resultados
- 🔎 **Filtro en tiempo real** — busca por nombre, dirección o categoría
- ⬇️ **Exportar a Excel** — descarga todos los resultados en .xlsx
- 💾 **API Key guardada** — no necesitas ingresarla cada vez

## 🚀 Cómo usar

### 1. Obtén tu API Key de Google Maps (gratis)

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un proyecto nuevo
3. Activa **Places API** y **Maps JavaScript API**
4. Ve a **Credentials → Create API Key**
5. Copia la key (empieza con `AIza...`)

> Google da **$200 USD gratis al mes** — suficiente para miles de búsquedas.

### 2. Abre la app

- **Online (GitHub Pages):** https://TU-USUARIO.github.io/auditoria-negocios-chile/
- **Local:** abre `index.html` en tu navegador

### 3. Busca

1. Pega tu API Key en el campo inferior del panel izquierdo → **Guardar**
2. Escribe la ciudad: `Viña del Mar`, `Santiago`, `Concepción`, etc.
3. Elige el tipo de negocio y el radio de búsqueda
4. Haz clic en **Buscar negocios**

## 📁 Estructura

```
auditoria-negocios-chile/
├── index.html   # Estructura de la app
├── style.css    # Estilos
├── app.js       # Lógica de búsqueda y UI
└── README.md    # Este archivo
```

## 🌐 Publicar en GitHub Pages

1. Sube los archivos a un repositorio en GitHub
2. Ve a **Settings → Pages**
3. En **Source**, selecciona `main` → `/root`
4. Tu app estará disponible en `https://TU-USUARIO.github.io/NOMBRE-REPO/`

## ⚠️ Consideraciones

- La API de Google Places tiene límites de búsqueda por solicitud (60 resultados por tipo/zona)
- Para cubrir ciudades grandes, usa búsquedas con radios más pequeños en distintas zonas
- Los resultados dependen de la calidad de datos en Google Maps

## 📄 Licencia

MIT — úsalo libremente.
