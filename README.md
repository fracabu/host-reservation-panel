# Host Reservation Panel

**AI-powered reservation management dashboard for Airbnb and Booking.com hosts**

[English](#english) | [Italiano](#italiano)

---

## English

### Overview

A web application for managing and analyzing reservations from Airbnb and Booking.com, featuring AI-powered data extraction from images and PDFs, market forecasting, and comprehensive financial analytics.

### Key Features

- **Multi-Format Data Extraction** - Support for CSV, images, and PDF reservation files
- **AI-Powered Processing** - Google Gemini AI for automatic data extraction from images and documents
- **Dashboard Analytics** - Complete reservation statistics with interactive charts
- **AI Forecasting** - Market predictions and pricing recommendations with persistent state
- **Financial Analysis** - Monthly summary with commission calculations and net earnings
- **Multi-Platform Support** - Native support for Airbnb and Booking.com
- **PDF Reports** - Automatic generation of comprehensive reports with integrated forecasts
- **AI Chat Assistant** - Conversational assistant for data insights
- **Responsive Design** - Collapsible sidebar optimized for all devices

### Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **AI Integration**: Google Gemini AI (@google/genai)
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Styling**: Tailwind CSS

### Quick Start

```bash
# Clone repository
git clone https://github.com/fracabu/host-reservation-panel.git
cd host-reservation-panel

# Install dependencies
npm install

# Configure environment
# Create .env.local with:
GEMINI_API_KEY=your_gemini_api_key_here

# Start application
npm run dev
```

Application available at `http://localhost:5173`

### Supported Formats

| Format | Description |
|--------|-------------|
| CSV | Airbnb exports (Italian headers) |
| Images | PNG, JPG, JPEG screenshots |
| PDF | Platform booking documents |

### Navigation Views

- **Dashboard** - General overview and file upload
- **Analytics** - Detailed charts and advanced metrics
- **Reservations** - Complete list with filters and sorting
- **Forecasting** - AI predictions and pricing strategies

### Calculated Metrics

| Metric | Description |
|--------|-------------|
| Occupancy Rate | Percentage of booked nights |
| Revenue per Night | Average nightly earnings |
| Total Commissions | Platform fees breakdown |
| Net Earnings | Pre/post tax calculations (21%) |

### Project Structure

```
host-reservation-panel/
├── components/
│   ├── Dashboard.tsx
│   ├── Analytics.tsx
│   ├── ReservationsList.tsx
│   ├── ForecastingAssistant.tsx
│   ├── AIChat.tsx
│   └── ComprehensiveReport.tsx
├── services/
│   ├── geminiService.ts
│   └── data.ts
├── types.ts
└── App.tsx
```

### Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### License

MIT License

---

## Italiano

### Panoramica

Un'applicazione web per la gestione e analisi delle prenotazioni da Airbnb e Booking.com, con estrazione dati AI da immagini e PDF, previsioni di mercato e analisi finanziaria completa.

### Funzionalita Principali

- **Estrazione Dati Multi-Formato** - Supporto per file CSV, immagini e PDF delle prenotazioni
- **Processing AI-Powered** - Google Gemini AI per estrazione automatica dati da immagini e documenti
- **Dashboard Analytics** - Statistiche complete prenotazioni con grafici interattivi
- **Previsioni AI** - Previsioni di mercato e raccomandazioni prezzi con stato persistente
- **Analisi Finanziaria** - Riepilogo mensile con calcolo commissioni e guadagni netti
- **Supporto Multi-Piattaforma** - Supporto nativo per Airbnb e Booking.com
- **Report PDF** - Generazione automatica report completi con previsioni integrate
- **AI Chat Assistant** - Assistente conversazionale per insights sui dati
- **Design Responsivo** - Sidebar collassabile ottimizzata per tutti i dispositivi

### Stack Tecnologico

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Integrazione AI**: Google Gemini AI (@google/genai)
- **Generazione PDF**: jsPDF + jsPDF-AutoTable
- **Styling**: Tailwind CSS

### Avvio Rapido

```bash
# Clona repository
git clone https://github.com/fracabu/host-reservation-panel.git
cd host-reservation-panel

# Installa dipendenze
npm install

# Configura ambiente
# Crea .env.local con:
GEMINI_API_KEY=your_gemini_api_key_here

# Avvia applicazione
npm run dev
```

Applicazione disponibile su `http://localhost:5173`

### Formati Supportati

| Formato | Descrizione |
|---------|-------------|
| CSV | Export Airbnb (intestazioni italiane) |
| Immagini | Screenshot PNG, JPG, JPEG |
| PDF | Documenti prenotazione piattaforme |

### Viste di Navigazione

- **Dashboard** - Overview generale e upload file
- **Analytics** - Grafici dettagliati e metriche avanzate
- **Prenotazioni** - Lista completa con filtri e ordinamento
- **Forecasting** - Previsioni AI e strategie di pricing

### Metriche Calcolate

| Metrica | Descrizione |
|---------|-------------|
| Tasso Occupazione | Percentuale notti prenotate |
| Revenue per Notte | Guadagno medio per notte |
| Commissioni Totali | Breakdown fee piattaforme |
| Guadagni Netti | Calcoli pre/post tasse (21%) |

### Struttura Progetto

```
host-reservation-panel/
├── components/
│   ├── Dashboard.tsx
│   ├── Analytics.tsx
│   ├── ReservationsList.tsx
│   ├── ForecastingAssistant.tsx
│   ├── AIChat.tsx
│   └── ComprehensiveReport.tsx
├── services/
│   ├── geminiService.ts
│   └── data.ts
├── types.ts
└── App.tsx
```

### Comandi

```bash
npm run dev      # Server sviluppo
npm run build    # Build produzione
npm run preview  # Preview build produzione
```

### Licenza

MIT License
