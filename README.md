# Host Reservation Panel

Un'applicazione web per la gestione e analisi delle prenotazioni di host Airbnb e Booking.com, con funzionalità di estrazione dati tramite AI e previsioni di mercato.

![Host Reservation Panel](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 🚀 Funzionalità Principali

- **📄 Estrazione Dati Multi-formato**: Supporto per file CSV, immagini e PDF delle prenotazioni
- **🤖 AI-Powered Processing**: Utilizzo di Google Gemini AI per l'estrazione automatica dei dati da immagini e documenti
- **📊 Dashboard Analytics**: Visualizzazione completa delle statistiche di prenotazione con grafici interattivi
- **📈 Previsioni e Strategie**: Assistente AI per previsioni di mercato e raccomandazioni sui prezzi (con stato persistente)
- **💰 Analisi Finanziaria**: Riepilogo mensile con calcoli di commissioni e guadagni netti
- **🔄 Gestione Multi-piattaforma**: Supporto nativo per Airbnb e Booking.com
- **📋 Report PDF Professionali**: Generazione automatica di report completi con previsioni integrate
- **💬 AI Chat Assistant**: Assistente conversazionale per insights sui dati
- **🎛️ Interfaccia Multi-Vista**: Navigazione tra Dashboard, Analytics, Prenotazioni e Forecasting
- **📱 Design Responsivo**: Sidebar collassabile e interfaccia ottimizzata per tutti i dispositivi

## 🛠 Tecnologie

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **AI Integration**: Google Gemini AI (@google/genai)
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Styling**: Tailwind CSS (classi utility)

## 📋 Prerequisiti

- Node.js (versione 18 o superiore)
- Chiave API di Google Gemini

## 🚀 Installazione e Avvio

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd host-reservation-panel
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura l'ambiente**
   
   Crea un file `.env.local` nella root del progetto:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Avvia l'applicazione**
   ```bash
   npm run dev
   ```

   L'applicazione sarà disponibile su `http://localhost:5173`

## 📁 Struttura del Progetto

```
host-reservation-panel/
├── components/           # Componenti React
│   ├── Dashboard.tsx     # Dashboard principale con overview
│   ├── Analytics.tsx     # Grafici e analytics avanzate
│   ├── ReservationsList.tsx  # Gestione prenotazioni con filtri
│   ├── ForecastingAssistant.tsx  # Assistente previsioni (stato persistente)
│   ├── Sidebar.tsx       # Navigazione laterale
│   ├── AIChat.tsx        # Chat assistant AI
│   ├── ComprehensiveReport.tsx  # Generazione report PDF
│   ├── ChartsForPDF.tsx  # Grafici ottimizzati per PDF
│   ├── FileUpload.tsx    # Upload file drag-and-drop
│   ├── MonthlySummaryTable.tsx   # Tabella riepilogo mensile
│   └── ...
├── services/
│   ├── geminiService.ts  # Servizio AI per elaborazione
│   └── data.ts          # Servizi per elaborazione dati
├── types.ts             # Definizioni TypeScript
├── App.tsx              # Componente principale e gestione stato globale
└── index.tsx            # Entry point dell'applicazione
```

## 💼 Come Usare

### 1. Caricamento File
- **File CSV**: Esportazioni dirette da Airbnb (formato italiano)
- **Immagini/PDF**: Screenshot o documenti dalle piattaforme di prenotazione
- **Multi-selezione**: Carica più file contemporaneamente per un'analisi completa

### 2. Formati Supportati
- ✅ CSV Airbnb (con intestazioni italiane)
- ✅ Immagini (PNG, JPG, JPEG)
- ✅ Documenti PDF
- ✅ Screenshot delle piattaforme di prenotazione

### 3. Navigazione Multi-Vista
- **Dashboard**: Overview generale e caricamento file
- **Analytics**: Grafici dettagliati e metriche avanzate
- **Prenotazioni**: Lista completa con filtri e ordinamento
- **Forecasting**: Previsioni AI e strategie di pricing

### 4. Analisi Dati
- Dashboard con statistiche in tempo reale
- Riepilogo mensile per piattaforma
- Calcolo automatico di commissioni e tasse (21%)
- Gestione corretta di no-show e cancellazioni
- Esportazione PDF dei report completi

### 5. Previsioni AI (Stato Persistente)
- Analisi del mercato locale con eventi identificati
- Raccomandazioni sui prezzi per eventi speciali
- Strategie di ottimizzazione dell'occupancy rate
- Insights quantitativi su domanda e offerta
- Generazione continua anche cambiando scheda

### 6. AI Chat Assistant
- Conversazioni naturali sui tuoi dati
- Insights automatici e analisi personalizzate
- Risposte basate sui dati reali delle prenotazioni

## 🔧 Comandi Disponibili

```bash
# Sviluppo
npm run dev          # Avvia server di sviluppo

# Produzione  
npm run build        # Build per produzione
npm run preview      # Preview build di produzione
```

## 📊 Tipologie di Dati Gestiti

### Prenotazioni
- ID prenotazione
- Piattaforma (Airbnb/Booking.com)
- Informazioni ospiti
- Date arrivo/partenza
- Stato prenotazione
- Prezzi e commissioni

### Stati Prenotazione
- `OK`: Prenotazione confermata
- `Cancellata`: Prenotazione cancellata
- `Mancata presentazione`: No-show

### Metriche Calcolate
- Tasso di occupazione
- Revenue per notte
- Commissioni totali
- Guadagni netti (pre/post tasse)

## 🤖 Integrazione AI

L'applicazione utilizza Google Gemini AI per:

- **Estrazione OCR**: Lettura automatica di testo da immagini
- **Parsing Intelligente**: Riconoscimento di strutture dati complesse
- **Validazione**: Controllo coerenza e completezza dei dati estratti
- **Forecasting**: Previsioni basate su dati storici e trend di mercato

## 🛡 Sicurezza

- Le chiavi API sono gestite tramite variabili d'ambiente
- Nessun dato sensibile viene salvato permanentemente
- Elaborazione locale dei file CSV per maggiore privacy

## 📱 Responsive Design

L'interfaccia è ottimizzata per:
- 💻 Desktop
- 📱 Tablet
- 📞 Mobile

## 🔗 Link Utili

- **AI Studio App**: https://ai.studio/apps/drive/182CA3lBr5-9E7JY0vZ49aJt3b6XxM3Kz
- **Google Gemini AI**: https://ai.google.dev/
- **Documentazione Vite**: https://vitejs.dev/

## 🤝 Contributi

Per contribuire al progetto:

1. Fork del repository
2. Crea un branch per la tua feature
3. Commit delle modifiche
4. Push del branch
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.

---

**Nota**: Assicurati di avere una chiave API valida di Google Gemini per utilizzare tutte le funzionalità dell'applicazione.