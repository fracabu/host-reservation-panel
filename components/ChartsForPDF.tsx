import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { Reservation, Status } from '../types';

interface ChartsForPDFProps {
  reservations: Reservation[];
}

const ChartsForPDF: React.FC<ChartsForPDFProps> = ({ reservations }) => {
  const activeReservations = reservations.filter(r => r.status === Status.OK || r.status === Status.NoShow);

  const monthlyData = useMemo(() => {
    const monthlyStats: { [key: string]: any } = {};

    activeReservations.forEach(res => {
      try {
        const arrival = new Date(res.arrival);
        if (isNaN(arrival.getTime())) return;

        const monthKey = `${arrival.getFullYear()}-${String(arrival.getMonth() + 1).padStart(2, '0')}`;
        const departure = new Date(res.departure);
        const nights = Math.max(1, Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)));

        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            month: new Date(arrival.getFullYear(), arrival.getMonth()).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
            booking: 0,
            airbnb: 0,
            totalRevenue: 0,
            totalNights: 0,
            bookings: 0
          };
        }

        monthlyStats[monthKey][res.platform === 'Booking.com' ? 'booking' : 'airbnb'] += res.price;
        monthlyStats[monthKey].totalRevenue += res.price;
        monthlyStats[monthKey].totalNights += nights;
        monthlyStats[monthKey].bookings += 1;
      } catch (e) {
        console.error('Error processing reservation for analytics:', e);
      }
    });

    return Object.keys(monthlyStats)
      .sort()
      .map(key => monthlyStats[key]);
  }, [activeReservations]);

  const avgNightlyRate = useMemo(() => {
    return monthlyData.map(month => ({
      ...month,
      avgRate: month.totalNights > 0 ? Math.round(month.totalRevenue / month.totalNights) : 0
    }));
  }, [monthlyData]);

  if (activeReservations.length === 0) {
    return <div>Nessun dato disponibile per i grafici</div>;
  }

  return (
    <div style={{ backgroundColor: 'white', padding: '20px', width: '800px' }}>
      {/* Revenue Trend */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
          Trend Revenue Mensile
        </h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `€${value}`} />
              <Tooltip formatter={(value) => `€${Number(value).toLocaleString('it-IT')}`} />
              <Legend />
              <Area type="monotone" dataKey="booking" stackId="1" stroke="#0088FE" fill="#0088FE" name="Booking.com" />
              <Area type="monotone" dataKey="airbnb" stackId="1" stroke="#00C49F" fill="#00C49F" name="Airbnb" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Average Nightly Rate */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
          Tariffa Media per Notte
        </h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={avgNightlyRate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `€${value}`} />
              <Tooltip formatter={(value) => `€${value}/notte`} />
              <Line type="monotone" dataKey="avgRate" stroke="#8884d8" strokeWidth={3} dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bookings per Month */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '20px' }}>
          Prenotazioni per Mese
        </h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="bookings" fill="#8884d8" name="Prenotazioni" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartsForPDF;