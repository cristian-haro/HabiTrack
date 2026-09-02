# 🏠 HabiTrack

> **Buscador, Gestor y Calculadora Financiera de Gastos de Compraventa Inmobiliaria en España**  
> *Real Estate Search, Property Manager & Spanish Real Estate Expense Calculator*

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19+-lightgrey.svg)](https://expressjs.com/)
[![SQLite / PostgreSQL](https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-blue.svg)](https://sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20Passed-brightgreen.svg)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-ISC-purple.svg)](LICENSE)

---

## 🌐 Idiomas / Languages
- 🇪🇸 [Español](#-español)
- 🇬🇧 [English](#-english)

---

## 🇪🇸 Español

### 📌 Descripción del Proyecto
**HabiTrack** es una plataforma integral diseñada para compradores e inversores inmobiliarios en España. Permite registrar inmuebles favoritos, calcular con precisión milimétrica los impuestos de compra (ITP autonómico por CCAA, IVA y AJD para obra nueva), estimar gastos notariales y registrales, y proyectar las cuotas de hipotecas mediante amortización francesa.

### ✨ Características Principales
1. **Acceso sin Contraseña (Passwordless OTP)**: Autenticación segura mediante código numérico de 6 dígitos enviado al correo electrónico (con modo dev para entorno local).
2. **Calculadora Financiera de Alta Precisión**:
   - ITP oficial por Comunidad Autónoma (Andalucía, Madrid, Cataluña, C. Valenciana, etc.).
   - IVA (10%) y AJD autonómico para viviendas de obra nueva.
   - Gastos de Notaría, Registro de la Propiedad, Gestoría y Tasación.
   - Cálculo de cuota hipotecaria mensual y desglose de capital de entrada mínimo necesario (*Ahorro requerido en firma*).
3. **Extracción Automática (Bookmarklet)**: Captura en 1 clic de datos de anuncios desde portales líderes (Idealista, Fotocasa) hacia el panel de HabiTrack.
4. **Mapa Interactivo con Vista Satelital**: Visualización geolocalizada en mapa Leaflet con vista satelital e información de hipoteca por pin.
5. **Persistencia Dual**: Soporte nativo para SQLite local (`casas.db`) y PostgreSQL en la nube (Supabase, Neon, Vercel Postgres).
6. **PWA & Soporte Offline**: Service Worker integrado con manifiesto PWA.

### 🚀 Instalación y Puesta en Marcha

#### Requisitos Previos
- Node.js (v18 o superior)
- npm

#### Pasos
1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/cristian-haro/HabiTrack.git
   cd HabiTrack
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   ```
   *(Opcional: configurar credenciales SMTP en `.env` para envío de correos; de lo contrario, el sistema mostrará el código OTP de prueba en la interfaz).*

4. **Iniciar el servidor**:
   ```bash
   npm start
   ```
   Accede en tu navegador a: **`http://localhost:3000`**

### 🧪 Ejecución de Tests
```bash
# Ejecutar suite de pruebas completa con Vitest
npm test

# Ejecutar linter
npm run lint
```

---

## 🇬🇧 English

### 📌 Project Overview
**HabiTrack** is an all-in-one property management and financial analysis platform tailored for homebuyers and real estate investors in Spain. It enables users to bookmark properties, calculate exact regional transfer taxes (ITP by Autonomous Community, VAT & AJD for new developments), estimate notary and land registry costs, and simulate mortgage schedules using French amortization.

### ✨ Key Features
1. **Passwordless OTP Authentication**: Secure 6-digit one-time passcode login sent via email (includes automated dev OTP fallback for local testing).
2. **High-Precision Financial Calculator**:
   - Official Transfer Tax (ITP) rates for all 17 Autonomous Communities + Ceuta and Melilla.
   - VAT (10%) and regional Stamp Duty (AJD) for new builds.
   - Notary, Property Registry, Management Agency, and Appraisal estimations.
   - French amortization mortgage simulation and minimum cash-down upfront estimation.
3. **1-Click Listing Scraper (Bookmarklet)**: Instant import of real estate listings from top Spanish portals (Idealista, Fotocasa).
4. **Interactive Satellite Map**: Leaflet map integration with high-resolution satellite tiles and mortgage summary markers.
5. **Dual Database Engine**: Seamless operation with local SQLite (`casas.db`) and Cloud PostgreSQL (Supabase, Neon, Vercel).
6. **PWA & Offline Readiness**: Built-in Service Worker and Web App Manifest.

### 🚀 Getting Started

#### Prerequisites
- Node.js (v18+)
- npm

#### Setup Instructions
1. **Clone the repository**:
   ```bash
   git clone https://github.com/cristian-haro/HabiTrack.git
   cd HabiTrack
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Run development server**:
   ```bash
   npm start
   ```
   Open your browser at: **`http://localhost:3000`**

### 🧪 Running Tests
```bash
# Run all integration & unit test suites
npm test

# Run code style linter
npm run lint
```

---

### 📂 Architecture & Tech Stack

```text
HabiTrack/
├── src/
│   ├── config/          # Database connection (SQLite & PG) and business constants
│   ├── controllers/     # Auth, Properties, and Settings controller handlers
│   ├── middlewares/     # JWT Auth, Zod validation, Rate limiters, Security
│   ├── routes/          # Express REST API routes (/api/auth, /api/propiedades, ...)
│   ├── schemas/         # Zod schemas for request validation
│   └── services/        # Tax Calculator, Email (Nodemailer), and Scraper logic
├── js/                  # Modular frontend client modules
├── tests/               # Vitest automated test suites
├── app.js               # Core frontend SPA application script
├── index.html           # Main SPA HTML structure (Bento design)
├── styles.css           # Modern precision daylight design system
├── server.js            # Express server entry point
└── package.json         # Project metadata and dependencies
```

---

### 📜 Conventional Commits Standard

This project adheres to [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):
- `feat`: New feature or user capability.
- `fix`: Bug fix or patch.
- `docs`: Documentation updates.
- `refactor`: Code refactoring without changing functionality.
- `test`: Adding or updating automated test suites.
- `chore`: Tooling, build config, and dependency updates.
