# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Host Reservation Panel is a React/TypeScript application for managing Airbnb and Booking.com reservations. It uses AI to extract data from uploaded files (CSV, images, PDFs) and provides dashboard analytics and forecasting capabilities.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Note**: This project has minimal build scripts. No linting, testing, or type-checking commands are configured in package.json.

## Environment Setup

The application requires a Gemini API key for AI processing:
- Set `GEMINI_API_KEY` in `.env.local` file
- The API key is exposed as `process.env.API_KEY` in the build via Vite config

## Core Architecture

### File Processing Flow
1. **CSV Files**: Parsed locally using custom Airbnb CSV parser in `App.tsx:32-112`
2. **Images/PDFs**: Processed via Google Gemini AI with structured JSON response schema
3. **Data Validation**: Platform and status validation occurs in `App.tsx:167-182`
4. **Deduplication**: Uses platform-id composite key to prevent duplicates in `App.tsx:192-197`

### Data Models
- **Reservation**: Core data type with platform, guest info, dates, pricing
- **Status Enum**: `'OK' | 'Cancellata' | 'Mancata presentazione'`
- **Platform**: `'Booking.com' | 'Airbnb'`
- **MonthlyBreakdown**: Analytics aggregation by month and platform

### Component Architecture
- **App.tsx**: Main state management and file processing logic
- **Dashboard**: Primary view with stats and file upload
- **ForecastingAssistant**: AI-powered forecasting and pricing recommendations
- **MonthlySummaryTable**: Financial analytics breakdown
- **FileUpload**: Drag-and-drop file processing interface

### State Management
- React hooks-based state in App.tsx
- Key states: `reservations`, `isLoading`, `error`, `processingFileNames`, `forecast`, `forecastLoading`, `forecastError`
- View switching between 'dashboard', 'analytics', 'reservations', and 'forecast' modes
- **Persistent Forecasting**: Forecast state is global, allowing tab switching without interrupting AI generation

## AI Integration

### Gemini AI Processing
- Uses `@google/genai` package for image/PDF analysis
- Structured response schema with TypeScript type validation
- Prompts specifically designed for Airbnb/Booking.com data extraction
- Base64 file encoding for multimodal input processing

### CSV Processing
- Custom parser for Italian Airbnb exports
- Date format conversion from DD/MM/YYYY to YYYY-MM-DD
- Price parsing with Euro symbol and comma decimal handling
- Guest description concatenation from separate adult/child/infant columns
- **Status Mapping**: Correctly handles 'Mancata presentazione' (no-show) status from CSV files

## Development Notes

### Path Aliases
- `@/*` resolves to project root via Vite config
- TypeScript configured for React JSX and ES2022 target

### Data Flow
1. Files uploaded → `handleProcessFiles` in App.tsx
2. CSV files processed locally, others via AI
3. Results merged and deduplicated
4. State updated and dashboard refreshed
5. View automatically switches to dashboard after processing

### Key Features
- Multi-file upload support (CSV, images, PDFs)
- Real-time processing status with file names
- Error handling with user-friendly messages
- Platform-specific data extraction and validation
- Monthly financial analytics and forecasting
- **Comprehensive PDF Reports**: Professional reports with analytics, charts, and forecast integration
- **Sidebar Navigation**: Multi-view interface (Dashboard, Analytics, Reservations, Forecasting)
- **AI Chat Assistant**: Interactive chat for data insights and analysis
- **Advanced Forecasting**: Event-based pricing strategies with quantitative predictions

## Component Structure

The application follows a flat component structure in the `components/` directory:
- **Dashboard.tsx**: Main dashboard with file upload and stats overview
- **Analytics.tsx**: Advanced analytics with charts and visualizations
- **ReservationsList.tsx**: Comprehensive reservation management with filtering and sorting
- **ForecastingAssistant.tsx**: AI-powered forecasting and pricing recommendations (with persistent state)
- **Sidebar.tsx**: Navigation sidebar with collapsible design
- **AIChat.tsx**: Interactive AI assistant with multi-model support (Gemini 2.5 Flash, 1.5 Flash, 1.5 Pro)
- **Calendar.tsx**: Calendar view for reservations
- **ComprehensiveReport.tsx**: Professional PDF report generation with forecasts
- **ChartsForPDF.tsx**: Chart components optimized for PDF export
- **MonthlySummaryTable.tsx**: Monthly financial breakdown table
- **StatsCard.tsx**: Reusable statistics display cards
- **StatusBadge.tsx**: Status indicator component
- **FileUpload.tsx**: Drag-and-drop file upload interface
- **ReservationsTable.tsx**: Table component for displaying reservations
- **PricingAssistant.tsx**: Pricing recommendations component

All components are TypeScript React functional components using hooks for state management.

## Services Architecture

- **services/geminiService.ts**: Handles all Google Gemini AI interactions for image/PDF processing and chat
- **services/data.ts**: Data processing and aggregation utilities

## Recent Updates (2025)

### Persistent Forecasting System
- **Global State Management**: Forecast generation continues even when switching tabs
- **Visual Indicators**: Header shows "Generando previsione..." during AI processing
- **Auto-Resume**: Return to forecast tab to see completed results

### Enhanced PDF Reports
- **Professional Layout**: Improved margins, typography, and spacing
- **Complete Forecast Integration**: All forecast sections included (events, pricing actions, recommendations)
- **Financial Summary**: Comprehensive overview including net calculations and commission tracking
- **Optimized Tables**: Fixed column widths to prevent content truncation

### No-Show Status Handling
- **CSV Parser Enhancement**: Correctly identifies and maps "Mancata presentazione" status
- **Financial Inclusion**: No-shows are included in revenue calculations as intended
- **Status Display**: Proper badge colors and filtering in reservation lists

### Multi-View Interface
- **Dashboard**: Overview and file processing
- **Analytics**: Charts and advanced metrics
- **Reservations**: Detailed reservation management
- **Forecasting**: AI-powered pricing and demand analysis
- **Calendar**: Calendar view for reservation visualization

### AI Chat Assistant Features
- **Multi-Model Support**: Switch between Gemini 2.5 Flash (fast, experimental), 1.5 Flash (stable, recommended), and 1.5 Pro (powerful)
- **Resizable Sidebar**: Drag to adjust chat panel width (320px-800px)
- **Context-Aware**: Automatically includes reservation data, monthly breakdowns, and forecast in conversations
- **Mobile Responsive**: Collapsible on desktop, drawer on mobile

### CSV Format Support
The CSV parser intelligently detects and handles three formats:
1. **Booking.com Format**: Italian headers with N° di prenotazione, Importo commissione
2. **Airbnb New Format** (2025): Headers include "Tipo", "Guadagni lordi", filters "Prenotazione" rows
3. **Airbnb Old Format**: Original Italian format with "Codice di conferma", "Guadagni"

Delimiter auto-detection supports TAB, semicolon, and comma separators.