import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { Reservation, Status } from '../types';

interface AnalyticsProps {
  reservations: Reservation[];
}

const Analytics: React.FC<AnalyticsProps> = ({ reservations }) => {
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

  const platformData = useMemo(() => {
    const platforms = activeReservations.reduce((acc, res) => {
      const platform = res.platform === 'Booking.com' ? 'Booking.com' : 'Airbnb';
      acc[platform] = (acc[platform] || 0) + res.price;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(platforms).map(([name, value]) => ({ name, value }));
  }, [activeReservations]);

  const avgNightlyRate = useMemo(() => {
    return monthlyData.map(month => ({
      ...month,
      avgRate: month.totalNights > 0 ? Math.round(month.totalRevenue / month.totalNights) : 0
    }));
  }, [monthlyData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const formatCurrency = (value: number) => {
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  if (activeReservations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun dato per analytics</h3>
          <p className="mt-1 text-sm text-gray-500">Carica dei file per visualizzare i grafici.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h2>

        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Trend Revenue Mensile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `€${value}`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Area type="monotone" dataKey="booking" stackId="1" stroke="#0088FE" fill="#0088FE" name="Booking.com" />
              <Area type="monotone" dataKey="airbnb" stackId="1" stroke="#00C49F" fill="#00C49F" name="Airbnb" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Average Nightly Rate - Full Width */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tariffa Media per Notte</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={avgNightlyRate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `€${value}`} />
              <Tooltip formatter={(value) => `€${value}/notte`} />
              <Line type="monotone" dataKey="avgRate" stroke="#8884d8" strokeWidth={3} dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bookings per Month */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Prenotazioni per Mese</h3>
          <ResponsiveContainer width="100%" height={300}>
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

export default Analytics;