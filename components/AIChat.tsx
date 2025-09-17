import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Reservation, MonthlyBreakdown, Forecast } from '../types';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  reservations: Reservation[];
  monthlyBreakdowns: MonthlyBreakdown[];
  forecast?: Forecast;
  currentSection: string;
  width: number;
  onWidthChange: (width: number) => void;
  isProcessingFiles?: boolean;
  processingFileNames?: string[];
}

const AIChat: React.FC<AIChatProps> = ({
  isCollapsed,
  onToggleCollapse,
  reservations,
  monthlyBreakdowns,
  forecast,
  currentSection,
  width,
  onWidthChange,
  isProcessingFiles = false,
  processingFileNames = []
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const availableModels = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Latest, fastest' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Stable, reliable' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'More capable' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle resize functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 320;
      const maxWidth = Math.min(800, window.innerWidth * 0.6);

      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onWidthChange(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, onWidthChange]);

  // Generate context-specific prompts
  const generateContext = () => {
    // Include OK and NoShow reservations in totals (exclude only Cancelled)
    const activeReservations = reservations.filter(r => r.status === 'OK' || r.status === 'Mancata presentazione');
    const totalReservations = reservations.length;
    const activeReservationsCount = activeReservations.length;
    const cancelledCount = reservations.filter(r => r.status === 'Cancellata').length;

    const totalRevenue = activeReservations.reduce((acc, r) => acc + r.price, 0);
    const totalNights = activeReservations.reduce((acc, res) => {
      try {
        const arrival = new Date(res.arrival);
        const departure = new Date(res.departure);
        const diffTime = Math.abs(departure.getTime() - arrival.getTime());
        return acc + Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } catch {
        return acc;
      }
    }, 0);

    const avgRate = totalRevenue / totalNights || 0;
    const activeBookingCount = activeReservations.filter(r => r.platform === 'Booking.com').length;
    const activeAirbnbCount = activeReservations.filter(r => r.platform === 'Airbnb').length;
    const noShowCount = reservations.filter(r => r.status === 'Mancata presentazione').length;

    let context = `Stai analizzando i dati di un host di affitti brevi. Ecco il contesto attuale:

DATI GENERALI:
- Prenotazioni totali: ${totalReservations} (${activeReservationsCount} attive, ${cancelledCount} cancellate)
- Revenue totale: €${totalRevenue.toFixed(2)} (include no-show)
- Notti vendute: ${totalNights}
- Tariffa media: €${avgRate.toFixed(2)}/notte
- Booking.com: ${activeBookingCount} prenotazioni attive
- Airbnb: ${activeAirbnbCount} prenotazioni attive
- No-show: ${noShowCount} prenotazioni (incluse nel revenue)

SEZIONE CORRENTE: ${currentSection}`;

    switch (currentSection) {
      case 'dashboard':
        context += `

Sei nella sezione DASHBOARD. Puoi rispondere a domande su:
- Statistiche generali e KPI
- Performance finanziaria
- Confronto tra piattaforme
- Trend dei ricavi
- Suggerimenti per migliorare le performance`;
        break;

      case 'analytics':
        context += `

Sei nella sezione ANALYTICS. Puoi rispondere a domande su:
- Analisi dei grafici e trend
- Stagionalità dei dati
- Performance mensili
- Comparazioni temporali
- Identificazione di pattern nei dati`;
        break;

      case 'reservations':
        context += `

Sei nella sezione PRENOTAZIONI. Puoi rispondere a domande su:
- Dettagli specifici delle prenotazioni
- Analisi degli ospiti
- Gestione delle cancellazioni
- Ottimizzazione del pricing
- Strategie per ridurre i no-show`;
        break;

      case 'forecast':
        if (forecast) {
          context += `

Sei nella sezione PREVISIONI. Hai accesso a:
- Analisi di mercato: ${forecast.demandOutlook}
- Eventi chiave identificati
- Raccomandazioni strategiche
- Azioni di pricing suggerite

Puoi rispondere a domande su strategie future, pricing dinamico, e ottimizzazione revenue.`;
        }
        break;
    }

    if (monthlyBreakdowns.length > 0) {
      context += `

DATI MENSILI DISPONIBILI:
${monthlyBreakdowns.map(mb =>
  `- ${mb.monthYear}: ${mb.total.activeBookings} prenotazioni, €${mb.total.totalGross.toFixed(2)} lordo`
).join('\n')}`;
    }

    context += `

IMPORTANTE: I no-show sono inclusi nei calcoli di revenue e notti perché l'host riceve comunque il pagamento.

ISTRUZIONI:
- Rispondi sempre in italiano
- Sii conciso ma informativo (max 300 parole)
- Fornisci insights pratici e actionable
- Se chiedi grafici, descrivi cosa vedi nei dati
- Suggerisci azioni concrete per migliorare il business
- I no-show contano come revenue attivo (ospite ha pagato ma non si è presentato)
- Solo le cancellazioni sono escluse dai totali di revenue
- Non inventare dati che non hai`;

    return context;
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY non configurata");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = generateContext();

      const prompt = `${context}

DOMANDA DELL'UTENTE: ${inputText}

Rispondi in modo specifico e utile basandoti sui dati forniti.`;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: {
          maxOutputTokens: 800,
          temperature: 0.7
        }
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text || "Errore nel generare la risposta.",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Errore: ${error.message?.includes('503') ? 'Servizio temporaneamente non disponibile. Riprova.' : 'Errore di connessione.'}`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div
      ref={sidebarRef}
      className={`bg-gray-900 text-white transition-all duration-300 flex flex-col relative ${
        isCollapsed ? 'w-16' : ''
      }`}
      style={{ width: isCollapsed ? '64px' : `${width}px` }}
    >
      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-gray-700 hover:bg-indigo-500 cursor-col-resize z-10"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 flex-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {!isCollapsed && (
              <button
                onClick={clearChat}
                className="text-gray-400 hover:text-white p-1 rounded"
                title="Pulisci chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md hover:bg-gray-700 transition-colors"
              title={isCollapsed ? 'Espandi Chat' : 'Comprimi Chat'}
            >
              <svg className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="text-xs text-gray-400 mt-1 space-y-1">
            <p>
              Sezione: <span className="font-medium capitalize text-indigo-300">{currentSection}</span>
            </p>
            {isProcessingFiles && (
              <div className="bg-yellow-900 bg-opacity-50 border border-yellow-600 rounded p-2 mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-300 text-xs font-medium">Elaborazione file in corso...</span>
                </div>
                {processingFileNames.length > 0 && (
                  <div className="text-yellow-400 text-xs mt-1">
                    {processingFileNames.join(', ')}
                  </div>
                )}
                <p className="text-yellow-200 text-xs mt-1">Puoi continuare a chattare durante l'elaborazione</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Modello:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded text-xs px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-gray-500 text-xs">
              {availableModels.find(m => m.id === selectedModel)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-8">
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">Chiedimi qualcosa sui tuoi dati!</p>
                <p className="text-xs mt-2 text-gray-500">Es: "Qual è il mese più redditizio?"</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    message.isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.isUser ? 'text-indigo-200' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-700 flex-shrink-0">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Chiedimi qualcosa..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-white placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || isLoading}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Collapsed state icon */}
      {isCollapsed && (
        <div className="pt-8 flex justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default AIChat;