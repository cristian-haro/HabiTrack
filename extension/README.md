# 🏡 HabiTrack - Extensión de Navegador (Manifest V3)

Extensión oficial para **Google Chrome**, **Microsoft Edge**, **Brave** y navegadores basados en Chromium que permite capturar, analizar y guardar pisos en tu cuenta de HabiTrack en **1 solo clic** sin copiar y pegar URLs.

---

## 🚀 Portales Inmobiliarios Compatibles

- ✅ **Idealista** (`idealista.com`)
- ✅ **Fotocasa** (`fotocasa.es`)
- ✅ **Habitaclia** (`habitaclia.com`)
- ✅ **YaEncontre** (`yaencontre.com`)
- ✅ **Pisos.com** (`pisos.com`)
- ✅ **Facebook Marketplace** (`facebook.com/marketplace`)

---

## 📦 Cómo Instalar en tu Navegador (Modo Desarrollador)

1. Abre tu navegador Chromium (Chrome / Edge / Brave).
2. Ve a la sección de extensiones:
   - **Chrome / Brave**: Escribe `chrome://extensions` en la barra de direcciones.
   - **Edge**: Escribe `edge://extensions`.
3. Activa el interruptor **"Modo de desarrollador"** (ubicado arriba a la derecha).
4. Haz clic en el botón **"Cargar descomprimida"** (*Load unpacked*).
5. Selecciona la carpeta `extension` dentro del repositorio de HabiTrack:
   ```text
   C:\Users\crist\Documents\GitHub\HabiTrack\extension
   ```
6. ¡Listo! Verás el icono de **HabiTrack** 🏡 en tu barra de extensiones. Fíjalo (*pin*) para tenerlo siempre a mano.

---

## ⚡ Funcionalidades

1. **Botón Flotante In-Situ**:
   - Al navegar por cualquier anuncio de Idealista, Fotocasa o Habitaclia, aparecerá una pastilla flotante abajo a la derecha:
     `[ 🏡 Guardar en HabiTrack · ~650 €/mes ]`
   - Al hacer clic, el piso se guarda directamente en tu base de datos y muestra una notificación en pantalla.

2. **Ventana Emergente (Popup)**:
   - Haz clic en el icono de la extensión para ver la previsualización del inmueble, foto principal, desglose del ahorro necesario para la firma y cuota hipotecaria calculada.

3. **Configuración de Servidor**:
   - Pulsa en el engranaje ⚙️ del popup para apuntar a tu servidor local (`http://localhost:3007`) o a tu URL de producción en Vercel/Render.
