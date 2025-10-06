import React, { useState, useRef, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import ReservationsList from './components/ReservationsList';
import Sidebar from './components/Sidebar';
import AIChat from './components/AIChat';
import Calendar from './components/Calendar';
import { Reservation, Status, Platform } from './types';
import { GeminiService } from './services/geminiService';
import ForecastingAssistant from './components/ForecastingAssistant';

type View = 'dashboard' | 'analytics' | 'reservations' | 'forecast' | 'calendar';

const App: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processingFileNames, setProcessingFileNames] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(false);
  const [chatMobileOpen, setChatMobileOpen] = useState<boolean>(false);
  const [chatWidth, setChatWidth] = useState<number>(400);
  const [forecast, setForecast] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcola monthly breakdowns per la chat
  const monthlyBreakdowns = useMemo(() => {
    const activeReservations = reservations.filter(r => r.status === Status.OK || r.status === Status.NoShow);
    const emptyStats = { activeBookings: 0, totalNights: 0, totalGross: 0, totalCommission: 0, totalNetPreTax: 0, totalCedolareSecca: 0, totalNetPostTax: 0 };
    const summaries: { [key: string]: any } = {};

    activeReservations.forEach(res => {
      try {
        const arrival = new Date(res.arrival);
        if (isNaN(arrival.getTime())) return;

        const monthYearKey = `${arrival.getFullYear()}-${String(arrival.getMonth() + 1).padStart(2, '0')}`;

        if (!summaries[monthYearKey]) {
          summaries[monthYearKey] = {
            booking: { ...emptyStats },
            airbnb: { ...emptyStats },
            total: { ...emptyStats },
          };
        }

        const departure = new Date(res.departure);
        const diffTime = Math.abs(departure.getTime() - arrival.getTime());
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        const netPreTax = res.price - res.commission;
        // Calculate cedolare secca (21% tax on net income)
        const cedolareSecca = netPreTax * 0.21;
        const netPostTax = netPreTax - cedolareSecca;

        const platformKey = res.platform === 'Booking.com' ? 'booking' : 'airbnb';

        summaries[monthYearKey][platformKey].activeBookings += 1;
        summaries[monthYearKey][platformKey].totalNights += diffDays;
        summaries[monthYearKey][platformKey].totalGross += res.price;
        summaries[monthYearKey][platformKey].totalCommission += res.commission;
        summaries[monthYearKey][platformKey].totalNetPreTax += netPreTax;
        summaries[monthYearKey][platformKey].totalCedolareSecca += cedolareSecca;
        summaries[monthYearKey][platformKey].totalNetPostTax += netPostTax;

        summaries[monthYearKey].total.activeBookings += 1;
        summaries[monthYearKey].total.totalNights += diffDays;
        summaries[monthYearKey].total.totalGross += res.price;
        summaries[monthYearKey].total.totalCommission += res.commission;
        summaries[monthYearKey].total.totalNetPreTax += netPreTax;
        summaries[monthYearKey].total.totalCedolareSecca += cedolareSecca;
        summaries[monthYearKey].total.totalNetPostTax += netPostTax;

      } catch (e) {
        console.error(`Could not parse date for reservation ${res.id}`, e);
      }
    });

    const monthFormatter = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });

    return Object.keys(summaries)
      .sort()
      .map(key => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const monthYear = monthFormatter.format(date);
        const formattedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

        return {
          monthYear: formattedMonthYear,
          ...summaries[key],
        };
      });
  }, [reservations]);


  const splitCSVIntoRows = (text: string): string[] => {
    const rows: string[] = [];
    let currentRow = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"') {
        inQuotes = !inQuotes;
        currentRow += char;
      } else if (char === '\n' && !inQuotes) {
        if (currentRow.trim()) {
          rows.push(currentRow);
        }
        currentRow = '';
      } else {
        currentRow += char;
      }
    }

    if (currentRow.trim()) {
      rows.push(currentRow);
    }

    return rows;
  };

  const parseCSVLine = (line: string, delimiter: string = ','): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseAirbnbCSV = (file: File): Promise<Reservation[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = splitCSVIntoRows(text);
                if (lines.length < 2) {
                    resolve([]);
                    return;
                }
                // Remove BOM if present
                const cleanedFirstLine = lines[0].replace(/^\ufeff/, '');

                // Detect delimiter (tab, semicolon, or comma) - check in order of priority
                let delimiter = ',';
                if (cleanedFirstLine.includes('\t')) {
                    delimiter = '\t';
                } else if (cleanedFirstLine.includes(';')) {
                    delimiter = ';';
                }

                const header = parseCSVLine(cleanedFirstLine, delimiter).map(h => (h || '').replace(/"/g, '').trim());
                const rows = lines.slice(1);

                console.log('🔍 CSV Headers detected:', JSON.stringify(header, null, 2));
                console.log('📊 Delimiter used:', delimiter === '\t' ? 'TAB' : delimiter === ';' ? 'SEMICOLON' : 'COMMA');
                console.log('📝 Total headers found:', header.length);

                const getIndex = (name: string) => {
                    const index = header.indexOf(name);
                    if (index === -1) console.warn(`CSV Header '${name}' not found.`);
                    return index;
                };

                // Detect CSV format - use safer checks
                const hasHeader = (name: string) => header.some(h => h && h.includes(name));
                const isNewFormat = hasHeader('Tipo') && hasHeader('Guadagni lordi');
                const isBookingFormat = hasHeader('N° di prenotazione') || hasHeader('Importo commissione');

                if (isBookingFormat) {
                    // Booking.com format with Italian headers
                    const col = {
                        id: getIndex('N° di prenotazione'),
                        guestName: getIndex('Nome ospite(i)'),
                        arrival: getIndex('Arrivo'),
                        departure: getIndex('Partenza'),
                        bookingDate: getIndex('Data di prenotazione'),
                        status: getIndex('Stato'),
                        people: getIndex('Persone'),
                        price: getIndex('Prezzo'),
                        commissionPercent: getIndex('% commissione'),
                        commissionAmount: getIndex('Importo commissione'),
                        nights: getIndex('Durata (notti)'),
                    };

                    console.log('📋 Column indices for Booking.com:', col);

                    const parsedReservations: Reservation[] = rows
                        .map((row, index) => {
                            const values = parseCSVLine(row, delimiter).map(v => v.replace(/"/g, '').trim());

                            // Log first reservation for debugging
                            if (index === 0) {
                                console.log('🔍 First row values:', values);
                                console.log('📝 Guest name from col ' + col.guestName + ':', values[col.guestName]);
                            }

                            // Parse price (e.g., "144 EUR" or "144.50 EUR")
                            const priceStr = values[col.price]?.replace('EUR', '').replace(',', '.').trim() || '0';
                            const price = parseFloat(priceStr);

                            // Parse commission amount (e.g., "25.92 EUR")
                            const commissionStr = values[col.commissionAmount]?.replace('EUR', '').replace(',', '.').trim() || '0';
                            const commission = parseFloat(commissionStr);

                            // Parse status
                            let status: Status;
                            const bookingStatus = values[col.status]?.toLowerCase() || '';
                            if (bookingStatus === 'no_show' || bookingStatus.includes('no show')) {
                                status = Status.NoShow;
                            } else if (bookingStatus === 'cancellata' || bookingStatus.includes('cancel')) {
                                status = Status.Cancelled;
                            } else {
                                status = Status.OK; // 'ok' or other statuses
                            }

                            // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
                            const reformatBookingDate = (dateStr: string) => {
                                if (!dateStr) return '';
                                const parts = dateStr.split('/');
                                if (parts.length === 3) {
                                    const day = parts[0].padStart(2, '0');
                                    const month = parts[1].padStart(2, '0');
                                    const year = parts[2];
                                    return `${year}-${month}-${day}`;
                                }
                                return dateStr;
                            };

                            // Parse dates (format: DD/MM/YYYY -> YYYY-MM-DD)
                            const arrival = reformatBookingDate(values[col.arrival] || '');
                            const departure = reformatBookingDate(values[col.departure] || '');

                            // Parse booking date (format: "DD/MM/YYYY HH:MM" -> YYYY-MM-DD)
                            const bookingDateFull = values[col.bookingDate] || '';
                            const bookingDateOnly = bookingDateFull.split(' ')[0];
                            const bookingDate = reformatBookingDate(bookingDateOnly);

                            // Build guest description
                            const people = values[col.people] || '';
                            const nights = values[col.nights] || '1';
                            const guestDesc = `${people} ${people === '1' ? 'persona' : 'persone'}, ${nights} ${nights === '1' ? 'notte' : 'notti'}`;

                            return {
                                id: values[col.id],
                                platform: 'Booking.com' as Platform,
                                guestName: values[col.guestName],
                                guestsDescription: guestDesc,
                                arrival,
                                departure,
                                bookingDate,
                                status,
                                price: isNaN(price) ? 0 : price,
                                commission: isNaN(commission) ? 0 : commission,
                            };
                        })
                        .filter((res): res is Reservation => !!res.id);

                    resolve(parsedReservations);
                } else if (isNewFormat) {
                    // New format: Data,Tipo,Codice di Conferma,Data di prenotazione,Data di inizio,Data di fine,Notti,Ospite,Annuncio,Dettagli,Codice di riferimento,Valuta,Importo,Costi del servizio,Spese di pulizia,Guadagni lordi,Tassa di soggiorno,Annualità guadagni
                    const col = {
                        tipo: getIndex('Tipo'),
                        id: getIndex('Codice di Conferma'),
                        guestName: getIndex('Ospite'),
                        arrival: getIndex('Data di inizio'),
                        departure: getIndex('Data di fine'),
                        bookingDate: getIndex('Data di prenotazione'),
                        grossEarnings: getIndex('Guadagni lordi'),
                        serviceFees: getIndex('Costi del servizio'),
                        nights: getIndex('Notti'),
                    };

                    const reformatDate = (dateStr: string) => {
                        if (!dateStr) return '';
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            // New format uses MM/DD/YYYY (US format)
                            const month = parts[0];
                            const day = parts[1];
                            const year = parts[2];
                            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }
                        return dateStr;
                    };

                    // Group rows by Codice di Conferma and only keep "Prenotazione" rows
                    const parsedReservations: Reservation[] = rows
                        .map(row => {
                            const values = parseCSVLine(row, delimiter).map(v => v.replace(/"/g, '').trim());
                            const tipo = values[col.tipo]?.toLowerCase() || '';

                            // Only process "Prenotazione" rows, skip tax rows
                            if (!tipo.includes('prenotazione')) {
                                return null;
                            }

                            const grossStr = values[col.grossEarnings]?.replace('€', '').replace(',', '.').trim() || '0';
                            const price = parseFloat(grossStr);

                            const serviceFeesStr = values[col.serviceFees]?.replace('€', '').replace(',', '.').trim() || '0';
                            const commission = parseFloat(serviceFeesStr);

                            const nights = parseInt(values[col.nights] || '1');
                            const guestDesc = `${nights} ${nights === 1 ? 'notte' : 'notti'}`;

                            return {
                                id: values[col.id],
                                platform: 'Airbnb' as Platform,
                                guestName: values[col.guestName],
                                guestsDescription: guestDesc,
                                arrival: reformatDate(values[col.arrival]),
                                departure: reformatDate(values[col.departure]),
                                bookingDate: reformatDate(values[col.bookingDate]),
                                status: Status.OK, // New format only shows confirmed bookings
                                price: isNaN(price) ? 0 : price,
                                commission: isNaN(commission) ? 0 : commission,
                            };
                        })
                        .filter((res): res is Reservation => res !== null && !!res.id);

                    resolve(parsedReservations);
                } else {
                    // Old format: original parser logic
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
                        const values = parseCSVLine(row).map(v => v.replace(/"/g, '').trim());

                        const earningsStr = values[col.earnings]?.replace('€', '').replace(',', '.').trim() || '0';
                        const price = parseFloat(earningsStr);

                        const guestDesc = `${values[col.adults]} adulti, ${values[col.children]} bambini, ${values[col.infants]} neonati`;

                        let status: Status;
                        const airbnbStatus = values[col.status]?.toLowerCase();
                        if (airbnbStatus === 'cancellata') {
                            status = Status.Cancelled;
                        } else if (airbnbStatus.includes('mancata presentazione') || airbnbStatus.includes('no show') || airbnbStatus.includes('no-show')) {
                            status = Status.NoShow;
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
                }
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = (e) => reject(e);
        // Try Windows-1252 encoding first for Italian CSV exports
        reader.readAsText(file, 'Windows-1252');
    });
  };


  const handleProcessFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setProcessingFileNames(Array.from(files).map(f => f.name));
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      // Check for unsupported Excel files
      const excelFiles = Array.from(files).filter(file => {
        const name = file.name.toLowerCase();
        return name.endsWith('.xls') || name.endsWith('.xlsx');
      });

      if (excelFiles.length > 0) {
        const fileNames = excelFiles.map(f => f.name).join(', ');
        throw new Error(`File Excel non supportati: ${fileNames}. Per favore, esporta i dati in formato CSV e riprova. In Excel: File > Salva con nome > CSV (delimitato dal separatore di elenco).`);
      }

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

        const geminiService = new GeminiService(process.env.API_KEY);
        const aiResults = await geminiService.extractReservationsFromFiles(Array.from(otherFiles));
        newlyParsedReservations.push(...aiResults);
      }

      // 3. Update state cumulatively and de-duplicate
      console.log('🔍 NEWLY PARSED RESERVATIONS:', newlyParsedReservations);
      console.log('📊 Status breakdown of new reservations:',
        newlyParsedReservations.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );

      setReservations(prevReservations => {
        const combined = [...prevReservations, ...newlyParsedReservations];
        console.log('🎯 COMBINED RESERVATIONS:', combined);
        console.log('📈 Combined status breakdown:',
          combined.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        );

        const uniqueMap = new Map<string, Reservation>();
        combined.forEach(res => {
          const uniqueKey = `${res.platform}-${res.id}`;
          uniqueMap.set(uniqueKey, res);
        });

        const final = Array.from(uniqueMap.values());
        console.log('✅ FINAL RESERVATIONS AFTER DEDUP:', final);
        console.log('🏁 Final status breakdown:',
          final.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        );

        return final;
      });

      // Switch to dashboard view after processing
      setActiveView('dashboard');

    } catch (e: any) {
        console.error(e);
        let errorMessage = 'Failed to process files: ';

        if (e.message?.includes('503') || e.message?.includes('overloaded')) {
          errorMessage += 'Il servizio AI è temporaneamente sovraccarico. Riprova tra qualche minuto.';
        } else if (e.message?.includes('API_KEY')) {
          errorMessage += 'Chiave API Gemini non configurata. Controlla il file .env.local';
        } else {
          errorMessage += e.message || 'Errore sconosciuto. Controlla la console e riprova.';
        }

        setError(errorMessage);
    } finally {
        setIsLoading(false);
        setProcessingFileNames([]);
        setRetryCount(0);
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
      case 'analytics':
        return <Analytics reservations={reservations} />;
      case 'reservations':
        return <ReservationsList reservations={reservations} />;
      case 'forecast':
        return <ForecastingAssistant
          reservations={reservations}
          forecast={forecast}
          isLoading={forecastLoading}
          error={forecastError}
          onSetForecast={setForecast}
          onSetLoading={setForecastLoading}
          onSetError={setForecastError}
        />;
      case 'calendar':
        return <Calendar />;
      case 'dashboard':
      default:
        return <Dashboard
            reservations={reservations}
            isLoading={isLoading}
            error={error}
            onProcessFiles={handleProcessFiles}
            processingFileNames={processingFileNames}
            retryCount={retryCount}
            forecast={forecast}
          />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
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

      {/* Mobile Sidebar Overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown as drawer when open */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            setSidebarMobileOpen(false); // Close mobile menu after selection
          }}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Pannello Host</h1>
                {reservations.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {reservations.length} prenotazioni
                  </span>
                )}
                {forecastLoading && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando previsione...
                  </span>
                )}
              </div>
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
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="p-4 sm:p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Chat Button */}
      <button
        onClick={() => setChatMobileOpen(!chatMobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-30 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Mobile Chat Overlay */}
      {chatMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setChatMobileOpen(false)}
        />
      )}

      {/* AI Chat Sidebar - Hidden on mobile unless chatMobileOpen */}
      <div className={`
        fixed lg:static inset-y-0 right-0 z-50 lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${chatMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <AIChat
          isCollapsed={chatCollapsed}
          onToggleCollapse={() => {
            setChatCollapsed(!chatCollapsed);
            if (!chatCollapsed) setChatMobileOpen(false); // Close mobile chat when collapsing
          }}
          reservations={reservations}
          monthlyBreakdowns={monthlyBreakdowns}
          forecast={forecast}
          currentSection={activeView}
          width={chatWidth}
          onWidthChange={setChatWidth}
          isProcessingFiles={isLoading}
          processingFileNames={processingFileNames}
        />
      </div>
    </div>
  );
};

export default App;