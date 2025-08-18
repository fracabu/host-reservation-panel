import React, { useState } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Reservation, Status, Forecast, PricingAction } from '../types';

interface ForecastingAssistantProps {
    reservations: Reservation[];
}

const ForecastingAssistant: React.FC<ForecastingAssistantProps> = ({ reservations }) => {
    const [location, setLocation] = useState('Roma');
    const [date, setDate] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM format
    const [description, setDescription] = useState('Appartamento con una camera vicino al Vaticano');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forecast, setForecast] = useState<Forecast | null>(null);

    const getHistoricalSummary = (): string => {
        if (reservations.length === 0) {
            return "Nessun dato storico disponibile.";
        }
        
        const activeReservations = reservations.filter(r => r.status === Status.OK || r.status === Status.NoShow);
        if (activeReservations.length === 0) {
            return "Nessuna prenotazione attiva nei dati storici.";
        }

        const totalRevenue = activeReservations.reduce((acc, r) => acc + r.price, 0);
        const totalNights = activeReservations.reduce((acc, res) => {
            const arrival = new Date(res.arrival);
            const departure = new Date(res.departure);
            if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return acc;
            const diffTime = Math.abs(departure.getTime() - arrival.getTime());
            return acc + Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }, 0);
        
        const averageDailyRate = totalNights > 0 ? (totalRevenue / totalNights).toFixed(2) : 0;

        return `Basandosi sui dati storici forniti, la performance passata della struttura è la seguente:
        - Tariffa Media Giornaliera (ADR) di base: ${averageDailyRate} EUR
        - Ricavo Lordo Totale (su tutto il periodo fornito): ${totalRevenue.toFixed(2)} EUR
        - Notti Totali Vendute: ${totalNights}`;
    };

    const handleGenerateForecast = async () => {
        if (!location || !date || !description) {
            setError("Per favore, compila tutti i campi.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setForecast(null);

        try {
            if (!process.env.API_KEY) throw new Error("API_KEY environment variable is not set.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const historicalData = getHistoricalSummary();
            const [year, month] = date.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('it-IT', { month: 'long' });

            const prompt = `Agisci come un analista di mercato d'élite specializzato in revenue management per affitti brevi. La tua missione è fornire una previsione strategica e un piano d'azione sui prezzi per la seguente proprietà.

            **Dati di Input:**
            - **Località:** ${location}
            - **Mese/Anno:** ${monthName} ${year}
            - **Descrizione Proprietà:** ${description}
            - **Dati Storici di Performance (Baseline):**
              ${historicalData}
            
            **Istruzioni Critiche:**
            1.  **RICERCA WEB APPROFONDITA:** Esegui una ricerca online completa e in tempo reale per identificare OGNI evento rilevante (concerti, sport, fiere, congressi, festività, etc.).
            2.  **ANALISI EVENTI DETTAGLIATA:** Per ogni evento, fornisci date esatte, valuta l'impatto sulla domanda ('Basso', 'Medio', 'Alto', 'Molto Alto'), e categorizzalo ('Concerto', 'Sport', etc.).
            3.  **PREVISIONI QUANTITATIVE:** Basa le tue stime su una combinazione dei dati storici e dell'impatto degli eventi futuri.
            4.  **RACCOMANDAZIONI STRATEGICHE:** Fornisci consigli pratici e direttamente collegati agli eventi.
            5.  **RIEPILOGO AZIONI DI PREZZO (pricingActions):** Questo è il punto più importante. Crea un riepilogo per gli eventi con impatto 'Alto' o 'Molto Alto'. Per ciascuno:
                - **AGGREGAZIONE EVENTI:** Se più eventi ad alto impatto si sovrappongono (es. concerto + partita nello stesso weekend), calcola il loro IMPATTO COMBINATO.
                - **FORNISCI UN PREZZO FINALE:** Non dare un aumento percentuale. Fornisci un **prezzo finale per notte consigliato (ADR)** come range in Euro (es. "ADR: €280-€320/notte").
                - **SUGGERIMENTI AGGIUNTIVI:** Includi strategie come "Soggiorno Minimo: 3 notti" o "Target: Tifosi in trasferta".
                - **REALISMO DI MERCATO:** Assicurati che il prezzo finale, anche se alto, sia realistico e competitivo per il tipo di alloggio e la località.

            **Output Mandatorio:**
            La tua risposta DEVE essere un blocco di codice JSON valido e nient'altro. Non aggiungere testo, spiegazioni o \`\`\`json.
            Deve seguire ESATTAMENTE questa struttura:
            {
              "demandOutlook": "Un'analisi della domanda di mercato per il mese.",
              "keyEvents": [
                {
                  "dateRange": "es. 05-08 Settembre 2025",
                  "eventName": "Nome dell'evento",
                  "impact": "Molto Alto",
                  "eventType": "Religioso"
                }
              ],
              "quantitativeForecast": {
                "occupancyRate": "es. 85-95%",
                "averageDailyRate": "es. 160€ - 210€",
                "projectedGrossRevenue": "es. ~4.500€ - 6.000€"
              },
              "strategicRecommendations": [
                {
                  "recommendation": "Titolo della raccomandazione.",
                  "reasoning": "Spiegazione della raccomandazione."
                }
              ],
              "pricingActions": [
                {
                  "eventName": "Nome dell'evento per l'azione di prezzo",
                  "dateRange": "es. 05-08 Settembre 2025",
                  "suggestedADR": "es. €250-€300/notte",
                  "minimumStay": "es. 3 notti",
                  "targetAudience": "es. Pellegrini"
                }
              ]
            }`;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}]
                }
            });

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const sources = groundingChunks?.map((chunk: any) => ({
                uri: chunk.web.uri,
                title: chunk.web.title,
            })).filter((source: any) => source.uri) ?? [];
            
            const rawText = response.text;
            if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
                throw new Error("La risposta dell'IA è vuota o non valida. L'analisi potrebbe essere stata bloccata per motivi di sicurezza. Riprova con una richiesta diversa.");
            }

            let jsonText = rawText.trim();
            const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match && match[1]) {
                jsonText = match[1].trim();
            } else {
                const jsonStart = jsonText.indexOf('{');
                const jsonEnd = jsonText.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                  jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
                }
            }
            
            if (!jsonText) {
                throw new Error("Non è stato possibile estrarre un JSON valido dalla risposta dell'IA.");
            }

            const parsedData: Omit<Forecast, 'groundingSources'> = JSON.parse(jsonText);
            setForecast({
                ...parsedData,
                groundingSources: sources
            });

        } catch (e: any) {
            console.error(e);
            setError(`Analisi fallita: ${e.message || 'Errore sconosciuto.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const renderPricingAction = (action: PricingAction) => {
        const parts = [];
        if (action.suggestedADR) parts.push(`ADR: ${action.suggestedADR}`);
        if (action.minimumStay) parts.push(`Soggiorno Minimo: ${action.minimumStay}`);
        if (action.targetAudience) parts.push(`Target: ${action.targetAudience}`);
        return parts.join('; ');
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Assistente Previsioni e Strategie</h2>
                <p className="text-sm text-gray-600 mb-6">Ottieni previsioni realistiche e suggerimenti strategici sui prezzi basandoti sui tuoi dati storici, la stagionalità e gli eventi futuri.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">Località</label>
                        <input type="text" id="location" value={location} onChange={e => setLocation(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Mese e Anno</label>
                        <input type="month" id="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div className="md:col-span-3">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Breve descrizione dell'alloggio</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                </div>
                <div className="mt-6">
                    <button onClick={handleGenerateForecast} disabled={isLoading} className="w-full md:w-auto px-6 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
                        {isLoading ? 'Analisi in corso...' : 'Genera Previsione'}
                    </button>
                </div>
            </div>
            
            {isLoading && (
                <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow">
                    <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">L'IA sta elaborando la tua previsione...</h3>
                    <p className="mt-1 text-sm text-gray-500">Analisi di dati storici ed eventi di mercato in corso.</p>
                </div>
            )}

            {error && <p className="text-red-600 bg-red-100 p-4 rounded-md">{error}</p>}
            
            {forecast && !isLoading && (
                 <div className="bg-white shadow rounded-lg p-6 space-y-8 animate-fade-in">
                    
                    {forecast.quantitativeForecast && (
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Previsioni Quantitative</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-center">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <dt className="text-sm font-medium text-blue-600">Tasso di Occupazione</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-blue-900">{forecast.quantitativeForecast.occupancyRate || 'N/A'}</dd>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <dt className="text-sm font-medium text-green-600">Tariffa Media (ADR)</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-green-900">{forecast.quantitativeForecast.averageDailyRate || 'N/A'}</dd>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <dt className="text-sm font-medium text-blue-600">Guadagno Lordo Previsto</dt>
                                    <dd className="mt-1 text-3xl font-semibold text-blue-900">{forecast.quantitativeForecast.projectedGrossRevenue || 'N/A'}</dd>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            {forecast.demandOutlook && (
                                <>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Analisi di Mercato</h3>
                                    <p className="text-gray-600">{forecast.demandOutlook}</p>
                                </>
                            )}
                           
                            {forecast.keyEvents && forecast.keyEvents.length > 0 && (
                                <>
                                    <h4 className="text-lg font-semibold text-gray-700 mt-6 mb-3">Eventi Chiave del Mese</h4>
                                    <ul className="space-y-3">
                                        {forecast.keyEvents.map((event, index) => (
                                            <li key={index} className="flex items-start p-3 bg-gray-50 rounded-md">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                </div>
                                                <div className="ml-4">
                                                    <p className="font-bold text-gray-800">{event.eventName} <span className="text-sm font-medium text-gray-500 ml-2">({event.dateRange})</span></p>
                                                    <p className="text-sm text-gray-600">Impatto: <span className="font-semibold">{event.impact}</span></p>
                                                </div>
                                            </li>
                                        ))}
                                   </ul>
                                </>
                            )}
                            {forecast.groundingSources && forecast.groundingSources.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="text-md font-semibold text-gray-700 mb-2">Fonti dati per l'analisi</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {forecast.groundingSources.map((source, index) => (
                                            <li key={index}>
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline" title={source.uri}>
                                                    {source.title || new URL(source.uri).hostname}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div>
                            {forecast.strategicRecommendations && forecast.strategicRecommendations.length > 0 && (
                                <>
                                     <h3 className="text-xl font-semibold text-gray-800 mb-4">Raccomandazioni Strategiche</h3>
                                     <ul className="space-y-4">
                                        {forecast.strategicRecommendations.map((rec, index) => (
                                            <li key={index} className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="font-semibold text-gray-800">{rec.recommendation}</p>
                                                    <p className="text-sm text-gray-500">{rec.reasoning}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>

                    {forecast.pricingActions && forecast.pricingActions.length > 0 && (
                        <div className="border-t border-gray-200 pt-8">
                            <h3 className="text-xl font-semibold text-gray-800">Riepilogo Azioni di Prezzo</h3>
                            <p className="text-sm text-gray-600 mt-1 mb-6">Un riassunto delle modifiche di prezzo più importanti da applicare per massimizzare i guadagni.</p>
                            <div className="space-y-4">
                                {forecast.pricingActions.map((action, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-indigo-50/50 rounded-xl border border-indigo-200/80 shadow-sm">
                                        <div className="mb-3 sm:mb-0">
                                            <p className="font-bold text-indigo-900">{action.eventName}</p>
                                            <p className="text-sm text-indigo-700">{action.dateRange}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg shadow-inner text-right w-full sm:w-auto">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Azione Suggerita</p>
                                            <p className="text-lg font-bold text-indigo-600">{renderPricingAction(action)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

export default ForecastingAssistant;