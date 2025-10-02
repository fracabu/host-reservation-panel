import React from 'react';

const Calendar: React.FC = () => {
  const openCalendar = () => {
    // Codifica base64 dell'email per il parametro cid
    const calendarId = btoa('romacaputmundiguesthouse@gmail.com');
    window.open(`https://calendar.google.com/calendar/r?cid=${calendarId}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto mb-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Calendario</h1>
          <p className="text-gray-600 mb-6">
            Visualizza e gestisci le prenotazioni di Booking.com e Airbnb su Google Calendar
          </p>
        </div>

        <button
          onClick={openCalendar}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Apri Google Calendar
        </button>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Il calendario si aprirà in una nuova finestra con tutti i calendari sincronizzati
          </p>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
