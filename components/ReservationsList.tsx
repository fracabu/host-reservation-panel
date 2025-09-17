import React, { useState, useMemo } from 'react';
import { Reservation, Status } from '../types';
import StatusBadge from './StatusBadge';

interface ReservationsListProps {
  reservations: Reservation[];
}

const ReservationsList: React.FC<ReservationsListProps> = ({ reservations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Reservation>('arrival');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedReservations = useMemo(() => {
    let filtered = reservations.filter(reservation => {
      const matchesSearch = reservation.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           reservation.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = filterPlatform === 'all' || reservation.platform === filterPlatform;
      const matchesStatus = filterStatus === 'all' || reservation.status === filterStatus;

      return matchesSearch && matchesPlatform && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'arrival' || sortField === 'departure' || sortField === 'bookingDate') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [reservations, searchTerm, filterPlatform, filterStatus, sortField, sortDirection]);

  const handleSort = (field: keyof Reservation) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  };

  const calculateNights = (arrival: string, departure: string) => {
    try {
      const arrivalDate = new Date(arrival);
      const departureDate = new Date(departure);
      const diffTime = Math.abs(departureDate.getTime() - arrivalDate.getTime());
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      return 1;
    }
  };

  const SortIcon = ({ field }: { field: keyof Reservation }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'text-blue-600' : 'text-blue-600 transform rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestione Prenotazioni</h2>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">Ricerca</label>
              <input
                type="text"
                id="search"
                placeholder="Nome ospite o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-2">Piattaforma</label>
              <select
                id="platform"
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tutte</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Airbnb">Airbnb</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
              <select
                id="status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tutti</option>
                <option value={Status.OK}>OK</option>
                <option value={Status.Cancelled}>Cancellata</option>
                <option value={Status.NoShow}>Mancata presentazione</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{filteredAndSortedReservations.length}</span> di <span className="font-medium">{reservations.length}</span> prenotazioni
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>ID</span>
                      <SortIcon field="id" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('platform')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Piattaforma</span>
                      <SortIcon field="platform" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('guestName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Ospite</span>
                      <SortIcon field="guestName" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('arrival')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Arrivo</span>
                      <SortIcon field="arrival" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('departure')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Partenza</span>
                      <SortIcon field="departure" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notti
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Prezzo</span>
                      <SortIcon field="price" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Stato</span>
                      <SortIcon field="status" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedReservations.map((reservation) => (
                  <tr key={`${reservation.platform}-${reservation.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {reservation.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        reservation.platform === 'Booking.com'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-pink-100 text-pink-800'
                      }`}>
                        {reservation.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{reservation.guestName}</div>
                      <div className="text-sm text-gray-500">{reservation.guestsDescription}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(reservation.arrival)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(reservation.departure)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {calculateNights(reservation.arrival, reservation.departure)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(reservation.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={reservation.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAndSortedReservations.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna prenotazione trovata</h3>
              <p className="mt-1 text-sm text-gray-500">Prova a modificare i filtri di ricerca.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationsList;