# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Host Reservation Panel is a React/TypeScript application for managing Airbnb and Booking.com reservations. It uses Google Gemini AI to extract data from uploaded files (CSV, images, PDFs) and provides dashboard analytics, forecasting capabilities, and an AI chat assistant.

## Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start development server (http://localhost:5173)
npm run build     # Build for production
npm run preview   # Preview production build
```

**Note**: No linting, testing, or type-checking commands are configured.

## Environment Setup

Create `.env.local` with your Gemini API key:
```
GEMINI_API_KEY=your_key_here
```

The key is exposed as `process.env.API_KEY` via Vite config.

## Architecture

### File Processing Flow
1. **CSV Files**: Parsed locally in `App.tsx:151-410` - auto-detects format (Booking.com, Airbnb new/old)
2. **Images/PDFs**: Processed via Gemini AI in `services/geminiService.ts:135-350`
3. **Validation**: Platform and status validation in `geminiService.ts:66-133`
4. **Deduplication**: Uses `platform-id` composite key in `App.tsx:472-476`

### CSV Format Detection (`App.tsx:187-191`)
- **Booking.com**: Italian headers with `N° di prenotazione`, `Importo commissione`
- **Airbnb New (2025)**: Headers include `Tipo`, `Guadagni lordi`, filters `Prenotazione` rows
- **Airbnb Old**: Original Italian format with `Codice di conferma`, `Guadagni`

Delimiter auto-detection: TAB > semicolon > comma

### Data Models (`types.ts`)
```typescript
type Status = 'OK' | 'Cancellata' | 'Mancata presentazione'
type Platform = 'Booking.com' | 'Airbnb'
interface Reservation { id, platform, guestName, guestsDescription, arrival, departure, bookingDate, status, price, commission }
interface MonthlyBreakdown { monthYear, booking: MonthlyStats, airbnb: MonthlyStats, total: MonthlyStats }
interface Forecast { demandOutlook, keyEvents, quantitativeForecast, strategicRecommendations, pricingActions }
```

### State Management
All state lives in `App.tsx` using React hooks:
- `reservations`, `isLoading`, `error`, `processingFileNames`
- `forecast`, `forecastLoading`, `forecastError` (persistent across tab switches)
- `activeView`: `'dashboard' | 'analytics' | 'reservations' | 'forecast' | 'calendar'`

### Component Responsibilities
| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root state, file processing, view routing |
| `Dashboard.tsx` | Stats overview, file upload |
| `Analytics.tsx` | Charts via Recharts |
| `ReservationsList.tsx` | Filterable/sortable reservation table |
| `ForecastingAssistant.tsx` | AI forecasting with persistent state |
| `AIChat.tsx` | Resizable chat sidebar, multi-model (Gemini 2.5 Flash, 1.5 Flash, 1.5 Pro) |
| `Calendar.tsx` | Calendar view for reservations |
| `ComprehensiveReport.tsx` | PDF generation with jsPDF |

### Services
- `services/geminiService.ts`: All Gemini AI interactions (file extraction, chat, forecasting)
- `services/data.ts`: Data aggregation utilities

## Key Implementation Details

### AI File Extraction (`geminiService.ts`)
- Uses `gemini-2.0-flash-exp` model
- Base64 encodes files for multimodal input
- Structured JSON response schema with TypeScript types
- Status normalization handles variations (no-show, cancelled, etc.)

### Financial Calculations (`App.tsx:56-59`)
- Commission tracked separately per platform
- Cedolare Secca: 21% tax on net income (price - commission)
- No-shows (`Mancata presentazione`) included in revenue calculations

### Path Aliases
`@/*` resolves to project root (configured in `vite.config.ts` and `tsconfig.json`)

## Tech Stack
- React 19 + TypeScript
- Vite 6 (build tool)
- Tailwind CSS v4
- Recharts (charts)
- jsPDF + jsPDF-AutoTable (PDF export)
- xlsx (SheetJS) - Excel file parsing
- @google/genai (Gemini AI)
- react-markdown (chat rendering)

## Ricerca Informazioni Aggiornate

Per verificare informazioni aggiornate su commissioni, policy o funzionalità delle piattaforme, usa il server Firecrawl disponibile in `C:\Users\utente\firecrawl-power-app`.

### Avviare il server Firecrawl
```bash
cd C:\Users\utente\firecrawl-power-app && npm run server
```
Il server sarà disponibile su `http://localhost:3001`.

### Cercare sui portali ufficiali
```bash
# Ricerca su Airbnb
curl -X POST http://localhost:3001/api/search -H "Content-Type: application/json" \
  -d '{"query": "commissioni host site:airbnb.it/help"}'

# Ricerca su Booking.com Partner Hub
curl -X POST http://localhost:3001/api/search -H "Content-Type: application/json" \
  -d '{"query": "commissione percentuale site:partner.booking.com"}'
```

### Estrarre contenuto da pagine specifiche
```bash
curl -X POST http://localhost:3001/api/scrape -H "Content-Type: application/json" \
  -d '{"url": "https://www.airbnb.it/help/article/1857", "formats": ["markdown"]}'
```

### Fonti ufficiali da consultare
| Piattaforma | URL | Contenuto |
|-------------|-----|-----------|
| Airbnb | `airbnb.it/help/article/1857` | Costi del servizio host |
| Airbnb | `airbnb.it/help/article/2827` | Costi addebitati dall'host |
| Booking.com | `partner.booking.com/it/aiuto/commissioni-fatture-e-tasse` | Commissioni e fatture |

### Documentazione commissioni
Vedi `COMMISSIONI.md` nella root del progetto per i dettagli aggiornati su:
- Commissioni Airbnb (3% + IVA = 3,66%)
- Commissioni Booking.com (variabile, attualmente 18% per questa struttura)
- Formule di calcolo usate nell'app
