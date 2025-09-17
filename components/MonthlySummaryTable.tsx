import React from 'react';
import { MonthlyBreakdown, MonthlyStats } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlySummaryTableProps {
  summaries: MonthlyBreakdown[];
}

const MonthlySummaryTable: React.FC<MonthlySummaryTableProps> = ({ summaries }) => {
  
  const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return 'N/A';
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  const handleDownloadCSV = () => {
    if (summaries.length === 0) return;

    const headers = ['Mese/Anno', 'Piattaforma', 'Prenotazioni', 'Notti', 'Lordo', 'Commissione', 'Netto (pre-tasse)', 'Netto Finale (21%)'];
    
    const rows = summaries.flatMap(s => [
        [s.monthYear.replace(',', ''), 'Booking.com', s.booking.activeBookings, s.booking.totalNights, s.booking.totalGross, s.booking.totalCommission, s.booking.totalNetPreTax, s.booking.totalNetPostTax],
        ['', 'Airbnb', s.airbnb.activeBookings, s.airbnb.totalNights, s.airbnb.totalGross, s.airbnb.totalCommission, s.airbnb.totalNetPreTax, s.airbnb.totalNetPostTax],
        ['', 'Totale', s.total.activeBookings, s.total.totalNights, s.total.totalGross, s.total.totalCommission, s.total.totalNetPreTax, s.total.totalNetPostTax]
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'riepilogo_mensile_piattaforme.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (summaries.length === 0) return;
  
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableBody: any[] = [];
  
    const formatCurrencyForPDF = (value: number) => value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' E';
  
    // Calcola i totali generali
    const grandTotals = summaries.reduce((acc, summary) => {
      acc.activeBookings += summary.total.activeBookings;
      acc.totalNights += summary.total.totalNights;
      acc.totalGross += summary.total.totalGross;
      acc.totalCommission += summary.total.totalCommission;
      acc.totalNetPreTax += summary.total.totalNetPreTax;
      acc.totalNetPostTax += summary.total.totalNetPostTax;
      return acc;
    }, {
      activeBookings: 0,
      totalNights: 0,
      totalGross: 0,
      totalCommission: 0,
      totalNetPreTax: 0,
      totalNetPostTax: 0
    });

    summaries.forEach(summary => {
      // Month Header
      tableBody.push([{ content: summary.monthYear, colSpan: 7, styles: { fontStyle: 'bold', fillColor: '#e5e7eb', textColor: '#1f2937' } }]);

      // Platform Rows
      const platforms: Array<{ name: string, data: MonthlyStats }> = [
        { name: '  Booking.com', data: summary.booking },
        { name: '  Airbnb', data: summary.airbnb }
      ];

      platforms.forEach(p => {
        tableBody.push([
            { content: p.name, styles: { cellPadding: { left: 8 } } },
            p.data.activeBookings > 0 ? p.data.activeBookings : '-',
            p.data.totalNights > 0 ? p.data.totalNights : '-',
            formatCurrencyForPDF(p.data.totalGross),
            formatCurrencyForPDF(p.data.totalCommission),
            formatCurrencyForPDF(p.data.totalNetPreTax),
            formatCurrencyForPDF(p.data.totalNetPostTax)
        ]);
      });

      // Total Mese row
      tableBody.push([
        { content: 'Totale Mese', styles: { fontStyle: 'bold', cellPadding: { left: 4 } } },
        { content: summary.total.activeBookings > 0 ? summary.total.activeBookings : '-', styles: { fontStyle: 'bold' } },
        { content: summary.total.totalNights > 0 ? summary.total.totalNights : '-', styles: { fontStyle: 'bold' } },
        { content: formatCurrencyForPDF(summary.total.totalGross), styles: { fontStyle: 'bold' } },
        { content: formatCurrencyForPDF(summary.total.totalCommission), styles: { fontStyle: 'bold' } },
        { content: formatCurrencyForPDF(summary.total.totalNetPreTax), styles: { fontStyle: 'bold' } },
        { content: formatCurrencyForPDF(summary.total.totalNetPostTax), styles: { fontStyle: 'bold' } }
      ]);
    });

    // Aggiungi riga vuota e totali generali
    if (summaries.length > 1) {
      tableBody.push([
        { content: '', colSpan: 7, styles: { fillColor: '#ffffff', minCellHeight: 8 } }
      ]);

      tableBody.push([
        { content: 'TOTALI GENERALI', styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff', cellPadding: { left: 4 } } },
        { content: grandTotals.activeBookings.toString(), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
        { content: grandTotals.totalNights.toString(), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
        { content: formatCurrencyForPDF(grandTotals.totalGross), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
        { content: formatCurrencyForPDF(grandTotals.totalCommission), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff', textColor: '#ef4444' } },
        { content: formatCurrencyForPDF(grandTotals.totalNetPreTax), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
        { content: formatCurrencyForPDF(grandTotals.totalNetPostTax), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#22c55e' } }
      ]);
    }
  
    autoTable(doc, {
      head: [['Piattaforma', 'Prenot.', 'Notti', 'Lordo', 'Commissione', 'Netto (pre-tasse)', 'Netto Finale (21%)']],
      body: tableBody,
      startY: 35,
      theme: 'grid',
      margin: { top: 35, left: 14, right: 14, bottom: 20 },
      headStyles: { fillColor: '#374151', textColor: '#ffffff', fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 18, halign: 'right' }, 2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }, 4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 40, halign: 'right' }, 6: { cellWidth: 40, halign: 'right' },
      },
      didParseCell: function(data) {
        if (data.cell.section === 'body') {
          if (data.column.index === 4) data.cell.styles.textColor = '#dc2626'; // Commission: red
          if (data.column.index === 6) data.cell.styles.textColor = '#16a34a'; // Final Net: green
          if (data.row.raw[0].content === 'Totale Mese') data.cell.styles.fillColor = '#f3f4f6';
        }
      },
      didDrawPage: function (data) {
        // Header - sempre nella stessa posizione su ogni pagina
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text('Riepilogo Mensile per Piattaforma', 14, 20);

        // Footer - numero pagina
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Pagina ${data.pageNumber} di ${pageCount}`, 14, doc.internal.pageSize.height - 10);

        // Data generazione
        const today = new Date().toLocaleDateString('it-IT');
        doc.text(`Generato il ${today}`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
      }
    });
  
    doc.save('riepilogo_mensile_piattaforme.pdf');
  };
  
  const DataRow: React.FC<{ platform: string, data: MonthlyStats, isTotal?: boolean }> = ({ platform, data, isTotal = false }) => (
    <tr className={isTotal ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}>
      <td className={`pl-6 pr-3 py-4 whitespace-nowrap text-sm ${isTotal ? 'text-gray-900' : 'text-gray-500'}`}>{platform}</td>
      <td className={`px-3 py-4 whitespace-nowrap text-sm text-right ${isTotal ? 'text-gray-700' : 'text-gray-800'}`}>{data.activeBookings > 0 ? data.activeBookings : '-'}</td>
      <td className={`px-3 py-4 whitespace-nowrap text-sm text-right ${isTotal ? 'text-gray-700' : 'text-gray-800'}`}>{data.totalNights > 0 ? data.totalNights : '-'}</td>
      <td className={`px-3 py-4 whitespace-nowrap text-sm font-medium text-right ${isTotal ? 'text-gray-900' : 'text-gray-800'}`}>{formatCurrency(data.totalGross)}</td>
      <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-red-600">{formatCurrency(data.totalCommission)}</td>
      <td className={`px-3 py-4 whitespace-nowrap text-sm font-semibold text-right ${isTotal ? 'text-gray-800' : 'text-gray-700'}`}>{formatCurrency(data.totalNetPreTax)}</td>
      <td className={`pl-3 pr-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${isTotal ? 'text-indigo-700' : 'text-green-600'}`}>{formatCurrency(data.totalNetPostTax)}</td>
    </tr>
  );

  return (
     <>
      <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Riepilogo Mensile per Piattaforma
        </h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadPDF}
            disabled={summaries.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Download PDF
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={summaries.length === 0}
            className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Download CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="pl-6 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mese / Piattaforma</th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prenot.</th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Notti</th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lordo</th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commissione</th>
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Netto (pre-tasse)</th>
              <th scope="col" className="pl-3 pr-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Netto Finale (21%)</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {summaries.map((summary) => (
              <React.Fragment key={summary.monthYear}>
                <tr className="bg-gray-200">
                   <td colSpan={7} className="px-6 py-2 whitespace-nowrap text-sm font-bold text-gray-800">{summary.monthYear}</td>
                </tr>
                <DataRow platform="Booking.com" data={summary.booking} />
                <DataRow platform="Airbnb" data={summary.airbnb} />
                <DataRow platform="Totale Mese" data={summary.total} isTotal={true}/>
              </React.Fragment>
            ))}
             {summaries.length === 0 && (
                <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">Nessun dato disponibile per il riepilogo.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default MonthlySummaryTable;