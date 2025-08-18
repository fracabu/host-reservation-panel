import React from 'react';
import { Reservation, Status, MonthlyBreakdown, MonthlyStats, Platform } from '../types';
import StatsCard from './StatsCard';
import FileUpload from './FileUpload';
import MonthlySummaryTable from './MonthlySummaryTable';

interface DashboardProps {
  reservations: Reservation[];
  isLoading: boolean;
  error: string | null;
  onProcessFiles: (files: FileList) => void;
  processingFileNames: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ reservations, isLoading, error, onProcessFiles, processingFileNames }) => {
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow">
         <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Analisi in corso...</h3>
        <p className="mt-1 text-sm text-gray-500">L'IA sta estraendo i dati dai file. Potrebbero volerci alcuni istanti.</p>
        {processingFileNames.length > 0 && (
          <div className="mt-4 w-full max-w-md">
            <p className="text-sm font-medium text-gray-600">File in elaborazione:</p>
            <ul className="list-disc list-inside bg-gray-50 p-2 rounded-md mt-1 text-xs text-gray-500 text-left">
              {processingFileNames.map((name, index) => <li key={index}>{name}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (error) {
     return (
      <div className="text-center p-10 bg-white rounded-lg shadow border border-red-200">
         <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        <h3 className="mt-4 text-lg font-medium text-red-800">Si è verificato un errore</h3>
        <p className="mt-1 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
         <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Riprova
          </button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return <FileUpload onProcessFiles={onProcessFiles} />;
  }
  
  const activeReservations = reservations.filter(r => r.status === Status.OK || r.status === Status.NoShow);

  const calculateStats = (resList: Reservation[]): MonthlyStats => {
    const totalNights = resList.reduce((acc, res) => {
       try {
        const arrival = new Date(res.arrival);
        const departure = new Date(res.departure);
        if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return acc;
        const diffTime = Math.abs(departure.getTime() - arrival.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return acc + (diffDays > 0 ? diffDays : 1);
      } catch (e) {
        return acc;
      }
    }, 0);

    const totalGross = resList.reduce((acc, res) => acc + res.price, 0);
    const totalCommission = resList.reduce((acc, res) => acc + res.commission, 0);
    const totalNetPreTax = totalGross - totalCommission;
    const totalNetPostTax = totalNetPreTax * 0.79; // Apply 21% tax

    return {
      activeBookings: resList.length,
      totalNights,
      totalGross,
      totalCommission,
      totalNetPreTax,
      totalNetPostTax
    };
  };
  
  const platformStats = {
    'Booking.com': calculateStats(activeReservations.filter(r => r.platform === 'Booking.com')),
    'Airbnb': calculateStats(activeReservations.filter(r => r.platform === 'Airbnb')),
    'Total': calculateStats(activeReservations)
  };

  const monthlyBreakdowns: MonthlyBreakdown[] = React.useMemo(() => {
    const emptyStats: MonthlyStats = { activeBookings: 0, totalNights: 0, totalGross: 0, totalCommission: 0, totalNetPreTax: 0, totalNetPostTax: 0 };
    
    const summaries: { [key: string]: Omit<MonthlyBreakdown, 'monthYear'> } = {};

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
        const netPostTax = netPreTax * 0.79;

        const platformKey = res.platform === 'Booking.com' ? 'booking' : 'airbnb';

        summaries[monthYearKey][platformKey].activeBookings += 1;
        summaries[monthYearKey][platformKey].totalNights += diffDays;
        summaries[monthYearKey][platformKey].totalGross += res.price;
        summaries[monthYearKey][platformKey].totalCommission += res.commission;
        summaries[monthYearKey][platformKey].totalNetPreTax += netPreTax;
        summaries[monthYearKey][platformKey].totalNetPostTax += netPostTax;

        summaries[monthYearKey].total.activeBookings += 1;
        summaries[monthYearKey].total.totalNights += diffDays;
        summaries[monthYearKey].total.totalGross += res.price;
        summaries[monthYearKey].total.totalCommission += res.commission;
        summaries[monthYearKey].total.totalNetPreTax += netPreTax;
        summaries[monthYearKey].total.totalNetPostTax += netPostTax;

      } catch (e) {
        console.error(`Could not parse date for reservation ${res.id}. Arrival: ${res.arrival}`, e);
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
  }, [activeReservations]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('it-IT', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Riepilogo Totale</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Prenotazioni Attive" value={platformStats.Total.activeBookings.toString()} />
          <StatsCard title="Notti Totali" value={platformStats.Total.totalNights.toString()} />
          <StatsCard title="Lordo Totale" value={formatCurrency(platformStats.Total.totalGross)} />
          <StatsCard title="Netto Finale (post-tasse)" value={formatCurrency(platformStats.Total.totalNetPostTax)} />
        </div>
      </div>
      
       <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Dettaglio per Piattaforma</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="bg-white p-6 rounded-lg shadow">
                 <h3 className="text-lg font-bold text-gray-800 mb-4">Booking.com</h3>
                 <div className="space-y-4">
                    <p className="flex justify-between text-sm"><span>Notti Vendute:</span> <span className="font-semibold">{platformStats['Booking.com'].totalNights}</span></p>
                    <p className="flex justify-between text-sm"><span>Incasso Lordo:</span> <span className="font-semibold">{formatCurrency(platformStats['Booking.com'].totalGross)}</span></p>
                     <p className="flex justify-between text-sm"><span>Commissioni:</span> <span className="font-semibold text-red-600">{formatCurrency(platformStats['Booking.com'].totalCommission)}</span></p>
                    <p className="flex justify-between text-base"><span>Netto (pre-tasse):</span> <span className="font-semibold">{formatCurrency(platformStats['Booking.com'].totalNetPreTax)}</span></p>
                    <p className="flex justify-between text-base font-bold"><span>Netto Finale (21%):</span> <span className="text-green-600">{formatCurrency(platformStats['Booking.com'].totalNetPostTax)}</span></p>
                 </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                 <h3 className="text-lg font-bold text-gray-800 mb-4">Airbnb</h3>
                 <div className="space-y-4">
                    <p className="flex justify-between text-sm"><span>Notti Vendute:</span> <span className="font-semibold">{platformStats['Airbnb'].totalNights}</span></p>
                    <p className="flex justify-between text-sm"><span>Incasso Lordo:</span> <span className="font-semibold">{formatCurrency(platformStats['Airbnb'].totalGross)}</span></p>
                    <p className="flex justify-between text-sm"><span>Commissioni:</span> <span className="font-semibold text-red-600">{formatCurrency(platformStats['Airbnb'].totalCommission)}</span></p>
                    <p className="flex justify-between text-base"><span>Netto (pre-tasse):</span> <span className="font-semibold">{formatCurrency(platformStats['Airbnb'].totalNetPreTax)}</span></p>
                    <p className="flex justify-between text-base font-bold"><span>Netto Finale (21%):</span> <span className="text-green-600">{formatCurrency(platformStats['Airbnb'].totalNetPostTax)}</span></p>
                 </div>
            </div>
        </div>
      </div>


      <div className="bg-white shadow rounded-lg">
        <MonthlySummaryTable summaries={monthlyBreakdowns} />
      </div>
    </div>
  );
};

export default Dashboard;