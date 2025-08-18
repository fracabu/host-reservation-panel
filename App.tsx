import React, { useState, useRef } from 'react';
import Dashboard from './components/Dashboard';
import { Reservation, Status, Platform } from './types';
import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import ForecastingAssistant from './components/ForecastingAssistant';

type View = 'dashboard' | 'forecast';

const App: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processingFileNames, setProcessingFileNames] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            mimeType: file.type,
            data: base64EncodedData,
        },
    };
  };

  const parseAirbnbCSV = (file: File): Promise<Reservation[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    resolve([]);
                    return;
                }
                const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
                const rows = lines.slice(1);

                const getIndex = (name: string) => {
                    const index = header.indexOf(name);
                    if (index === -1) console.warn(`CSV Header '${name}' not found.`);
                    return index;
                };

                const col = {
                    id: getIndex('Codice di conferma'),
                    status: getIndex('Stato'),
                    guestName: getIndex("Nome dell'ospite"),
                    adults: getIndex('N. di adulti'),
                    children: getIndex('N. di bambini'),
                    infants: getIndex('N. di neonati'),
                    arrival: getIndex('Data di inizio'),
                    departure: getIndex('Data di fine'),
                    bookingDate: getIndex('Prenotata'),
                    earnings: getIndex('Guadagni'),
                };
                
                const reformatDate = (dateStr: string) => {
                   if (!dateStr) return '';
                   const parts = dateStr.split('/');
                   if (parts.length === 3) {
                       return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                   }
                   return dateStr; // Assume YYYY-MM-DD if not DD/MM/YYYY
                };

                const parsedReservations: Reservation[] = rows.map(row => {
                    const values = row.split(',').map(v => v.replace(/"/g, '').trim());
                    
                    const earningsStr = values[col.earnings]?.replace('€', '').replace(',', '.').trim() || '0';
                    const price = parseFloat(earningsStr);

                    const guestDesc = `${values[col.adults]} adulti, ${values[col.children]} bambini, ${values[col.infants]} neonati`;
                    
                    let status: Status;
                    const airbnbStatus = values[col.status]?.toLowerCase();
                    if (airbnbStatus === 'cancellata') {
                        status = Status.Cancelled;
                    } else {
                        status = Status.OK; // Treat 'Ospite precedente', 'Confermata', etc. as OK
                    }

                    return {
                        id: values[col.id],
                        platform: 'Airbnb' as Platform,
                        guestName: values[col.guestName],
                        guestsDescription: guestDesc,
                        arrival: reformatDate(values[col.arrival]),
                        departure: reformatDate(values[col.departure]),
                        bookingDate: values[col.bookingDate], // Already YYYY-MM-DD
                        status,
                        price: isNaN(price) ? 0 : price,
                        commission: 0, // CSV contains final payout, commission is not specified
                    };
                }).filter(res => res.id); // Filter out any rows that couldn't be parsed

                resolve(parsedReservations);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
  };

  const handleProcessFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setProcessingFileNames(Array.from(files).map(f => f.name));
    setIsLoading(true);
    setError(null);

    try {
      const csvFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.csv'));
      const otherFiles = Array.from(files).filter(file => !file.name.toLowerCase().endsWith('.csv'));

      let newlyParsedReservations: Reservation[] = [];

      // 1. Process CSV files locally
      if (csvFiles.length > 0) {
        const results = await Promise.all(csvFiles.map(parseAirbnbCSV));
        newlyParsedReservations.push(...results.flat());
      }
      
      // 2. Process Image/PDF files with GenAI
      if (otherFiles.length > 0) {
        if (!process.env.API_KEY) throw new Error("API_KEY environment variable is not set.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const fileParts: Part[] = await Promise.all(otherFiles.map(fileToGenerativePart));
        
        const prompt = `Analyze the provided image(s) or PDF(s) of booking reservation lists from Booking.com or Airbnb.
          Your task is to:
          1. Identify the source platform ('Booking.com' or 'Airbnb') for each reservation.
          2. Extract all reservations and return them as a single, structured JSON array.
          3. For each reservation, you MUST include a 'platform' field with the identified source.
          Adhere to these rules for all extracted data:
          - Convert all dates to 'YYYY-MM-DD' format.
          - Prices and commissions must be numeric values.
          - The 'status' field must be one of the following exact strings: 'OK', 'Cancellata', 'Mancata presentazione'.
          - Ensure you extract a unique ID for each reservation.`;
        
        const responseSchema = {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, platform: { type: Type.STRING }, guestName: { type: Type.STRING }, guestsDescription: { type: Type.STRING }, arrival: { type: Type.STRING }, departure: { type: Type.STRING }, bookingDate: { type: Type.STRING }, status: { type: Type.STRING }, price: { type: Type.NUMBER }, commission: { type: Type.NUMBER } },
              required: ['id', 'platform', 'guestName', 'arrival', 'departure', 'status', 'price', 'commission']
            }
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: { parts: [{ text: prompt }, ...fileParts] }, config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText);
        
        if (Array.isArray(parsedData)) {
            const validatedData = parsedData.filter((item: any): item is Reservation => {
                if (!item || typeof item !== 'object') {
                    return false;
                }
                const platformIsValid = item.platform === 'Booking.com' || item.platform === 'Airbnb';
                const statusIsValid = Object.values(Status).includes(item.status as Status);

                if (!platformIsValid) {
                    console.warn('Invalid platform received from AI:', item.platform);
                }
                if (!statusIsValid) {
                    console.warn('Invalid status received from AI:', item.status);
                }
                
                return platformIsValid && statusIsValid;
            });
            newlyParsedReservations.push(...validatedData);
        } else {
            console.warn("AI did not return a valid array:", parsedData);
        }
      }
      
      // 3. Update state cumulatively and de-duplicate
      setReservations(prevReservations => {
        const combined = [...prevReservations, ...newlyParsedReservations];
        const uniqueMap = new Map<string, Reservation>();
        combined.forEach(res => {
          const uniqueKey = `${res.platform}-${res.id}`;
          uniqueMap.set(uniqueKey, res);
        });
        return Array.from(uniqueMap.values());
      });
      
      // Switch to dashboard view after processing
      setActiveView('dashboard');

    } catch (e: any) {
        console.error(e);
        setError(`Failed to process files: ${e.message || 'An unknown error occurred. Please check the console and try again.'}`);
    } finally {
        setIsLoading(false);
        setProcessingFileNames([]);
    }
  };

  const handleAddFilesClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleReset = () => {
    setReservations([]);
    setError(null);
    setActiveView('dashboard');
  };

  const renderContent = () => {
    switch(activeView) {
      case 'forecast':
        return <ForecastingAssistant reservations={reservations} />;
      case 'dashboard':
      default:
        return <Dashboard 
            reservations={reservations}
            isLoading={isLoading}
            error={error}
            onProcessFiles={handleProcessFiles}
            processingFileNames={processingFileNames}
          />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
       <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
            handleProcessFiles(e.target.files);
            if(e.target) e.target.value = ''; // Reset file input to allow re-uploading the same file
        }}
        multiple
        accept="image/*,application/pdf,.csv"
        className="hidden"
      />
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Pannello Host</h1>
              {reservations.length > 0 && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Ricomincia
                  </button>
                  <button
                    onClick={handleAddFilesClick}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Aggiungi File
                  </button>
                </div>
              )}
          </div>
          <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                      onClick={() => setActiveView('dashboard')}
                      className={`${
                          activeView === 'dashboard'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                      Dashboard
                  </button>
                  <button
                      onClick={() => setActiveView('forecast')}
                      className={`${
                          activeView === 'forecast'
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      aria-current={activeView === 'forecast' ? 'page' : undefined}
                  >
                      Previsioni e Strategie
                  </button>
              </nav>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;