import React, { useRef, useState } from 'react';
import { Reservation, MonthlyBreakdown, Forecast } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import ChartsForPDF from './ChartsForPDF';

interface ComprehensiveReportProps {
  reservations: Reservation[];
  monthlyBreakdowns: MonthlyBreakdown[];
  forecast?: Forecast;
}

const ComprehensiveReport: React.FC<ComprehensiveReportProps> = ({
  reservations,
  monthlyBreakdowns,
  forecast
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const chartsRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  };

  const formatCurrencyForPDF = (value: number) =>
    value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' E';

  const generateComprehensiveReport = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        format: 'a4',
        unit: 'mm'
      });
      let currentY = 25;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;

      // === COPERTINA ===
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('Report Completo Host Reservation Panel', margin, currentY);

      currentY += 15;
      doc.setFontSize(12);
      doc.setTextColor(120, 120, 120);
      const today = new Date().toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Generato il ${today}`, margin, currentY);

      // Linea separatrice
      currentY += 10;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      // Statistiche generali
      currentY += 20;
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Riepilogo Generale', margin, currentY);

      const totalRevenue = reservations.reduce((acc, r) => acc + r.price, 0);
      const totalCommission = reservations.reduce((acc, r) => acc + r.commission, 0);
      const totalNetPreTax = totalRevenue - totalCommission;
      const totalNetPostTax = totalNetPreTax * 0.79; // Apply 21% tax

      const totalNights = reservations.reduce((acc, res) => {
        try {
          const arrival = new Date(res.arrival);
          const departure = new Date(res.departure);
          const diffTime = Math.abs(departure.getTime() - arrival.getTime());
          return acc + Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        } catch {
          return acc;
        }
      }, 0);

      currentY += 12;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);

      // Box statistiche con sfondo
      const statsHeight = 56;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, currentY, pageWidth - 2 * margin, statsHeight, 3, 3, 'F');

      currentY += 8;
      doc.text(`• Prenotazioni Totali: ${reservations.length}`, margin + 5, currentY);
      currentY += 8;
      doc.text(`• Notti Vendute: ${totalNights}`, margin + 5, currentY);
      currentY += 8;
      doc.text(`• Revenue Lordo: ${formatCurrency(totalRevenue)}`, margin + 5, currentY);
      currentY += 8;
      doc.text(`• Commissioni Totali: ${formatCurrency(totalCommission)}`, margin + 5, currentY);
      currentY += 8;
      doc.text(`• Netto (pre-tasse): ${formatCurrency(totalNetPreTax)}`, margin + 5, currentY);
      currentY += 8;
      doc.text(`• Netto Finale (post-tasse 21%): ${formatCurrency(totalNetPostTax)}`, margin + 5, currentY);
      currentY += 8;
      doc.text(`• Tariffa Media: ${formatCurrency(totalRevenue / totalNights)}/notte`, margin + 5, currentY);

      currentY += 15;

      // === PAGINA NUOVA: GRAFICI ===
      if (chartsRef.current) {
        doc.addPage();
        currentY = 25;

        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Analytics e Grafici', margin, currentY);

        // Linea separatrice
        currentY += 8;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, pageWidth - margin, currentY);

        try {
          const canvas = await html2canvas(chartsRef.current, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
          });

          const imgData = canvas.toDataURL('image/png', 0.9);
          const maxWidth = pageWidth - 2 * margin;
          const imgWidth = Math.min(maxWidth, 170);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Verifica se l'immagine rientra nella pagina
          if (currentY + imgHeight + 20 > pageHeight - margin) {
            doc.addPage();
            currentY = 25;
          } else {
            currentY += 15;
          }

          doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, Math.min(imgHeight, pageHeight - currentY - margin));
        } catch (error) {
          console.error('Error capturing charts:', error);
          currentY += 20;
          doc.setFontSize(12);
          doc.setTextColor(150, 150, 150);
          doc.text('Errore nella cattura dei grafici', margin, currentY);
        }
      }

      // === PAGINA NUOVA: TABELLA PRENOTAZIONI ===
      doc.addPage('landscape');
      currentY = 25;
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Dettaglio Prenotazioni', 20, currentY);

      // Linea separatrice
      currentY += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, currentY, 277, currentY); // 277 = landscape width - margin

      const reservationRows = reservations.map(res => [
        res.id.substring(0, 10) + (res.id.length > 10 ? '...' : ''),
        res.platform,
        res.guestName.substring(0, 15) + (res.guestName.length > 15 ? '...' : ''),
        new Date(res.arrival).toLocaleDateString('it-IT'),
        new Date(res.departure).toLocaleDateString('it-IT'),
        Math.max(1, Math.ceil((new Date(res.departure).getTime() - new Date(res.arrival).getTime()) / (1000 * 60 * 60 * 24))),
        formatCurrencyForPDF(res.price),
        res.status
      ]);

      autoTable(doc, {
        head: [['ID', 'Piattaforma', 'Ospite', 'Arrivo', 'Partenza', 'Notti', 'Prezzo', 'Stato']],
        body: reservationRows,
        startY: currentY + 10,
        theme: 'striped',
        headStyles: {
          fillColor: [55, 65, 81],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 22 },
          2: { cellWidth: 28 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 26 }
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
        didParseCell: function(data) {
          if (data.cell.section === 'body' && data.column.index === 7) {
            const status = data.cell.text[0];
            if (status === 'OK') {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (status === 'Cancellata') {
              data.cell.styles.textColor = [220, 38, 38];
            } else if (status?.includes('Mancata')) {
              data.cell.styles.textColor = [234, 88, 12];
            }
          }
        }
      });

      // === PAGINA NUOVA: RIEPILOGO MENSILE ===
      doc.addPage('landscape');
      currentY = 25;
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Riepilogo Mensile per Piattaforma', 20, currentY);

      // Linea separatrice
      currentY += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, currentY, 277, currentY);

      const tableBody: any[] = [];

      // Calcola totali generali
      const grandTotals = monthlyBreakdowns.reduce((acc, summary) => {
        acc.activeBookings += summary.total.activeBookings;
        acc.totalNights += summary.total.totalNights;
        acc.totalGross += summary.total.totalGross;
        acc.totalCommission += summary.total.totalCommission;
        acc.totalNetPreTax += summary.total.totalNetPreTax;
        acc.totalNetPostTax += summary.total.totalNetPostTax;
        return acc;
      }, {
        activeBookings: 0, totalNights: 0, totalGross: 0,
        totalCommission: 0, totalNetPreTax: 0, totalNetPostTax: 0
      });

      monthlyBreakdowns.forEach(summary => {
        tableBody.push([{ content: summary.monthYear, colSpan: 7, styles: { fontStyle: 'bold', fillColor: '#e5e7eb', textColor: '#1f2937' } }]);

        [
          { name: '  Booking.com', data: summary.booking },
          { name: '  Airbnb', data: summary.airbnb }
        ].forEach(p => {
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

      // Totali generali
      if (monthlyBreakdowns.length > 1) {
        tableBody.push([{ content: '', colSpan: 7, styles: { fillColor: '#ffffff', minCellHeight: 8 } }]);
        tableBody.push([
          { content: 'TOTALI GENERALI', styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: grandTotals.activeBookings.toString(), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: grandTotals.totalNights.toString(), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: formatCurrencyForPDF(grandTotals.totalGross), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: formatCurrencyForPDF(grandTotals.totalCommission), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: formatCurrencyForPDF(grandTotals.totalNetPreTax), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: formatCurrencyForPDF(grandTotals.totalNetPostTax), styles: { fontStyle: 'bold', fontSize: 12, fillColor: '#1f2937', textColor: '#ffffff' } }
        ]);
      }

      autoTable(doc, {
        head: [['Piattaforma', 'Prenot.', 'Notti', 'Lordo', 'Commissione', 'Netto (pre-tasse)', 'Netto Finale (21%)']],
        body: tableBody,
        startY: currentY + 10,
        theme: 'striped',
        headStyles: {
          fillColor: [55, 65, 81],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 16, halign: 'right' },
          2: { cellWidth: 16, halign: 'right' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 30, halign: 'right' },
          6: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto'
      });

      // === PAGINA PREVISIONI (se disponibili) ===
      if (forecast) {
        doc.addPage();
        currentY = 25;
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Previsioni e Strategie', margin, currentY);

        // Linea separatrice
        currentY += 8;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, pageWidth - margin, currentY);

        // === 1. ANALISI DI MERCATO ===
        currentY += 15;
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text('ANALISI DI MERCATO', margin, currentY);

        // Linea sotto il titolo
        currentY += 3;
        doc.setDrawColor(180, 180, 180);
        doc.line(margin, currentY, margin + 60, currentY);

        currentY += 10;
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const splitText = doc.splitTextToSize(forecast.demandOutlook, pageWidth - 2 * margin);
        doc.text(splitText, margin, currentY);
        currentY += splitText.length * 4 + 15;

        // === 2. EVENTI CHIAVE ===
        if (forecast.keyEvents && forecast.keyEvents.length > 0) {
          // Verifica spazio
          if (currentY + 30 > pageHeight - margin) {
            doc.addPage();
            currentY = 25;
          }

          doc.setFontSize(14);
          doc.setTextColor(60, 60, 60);
          doc.text('EVENTI CHIAVE IDENTIFICATI', margin, currentY);

          // Linea sotto il titolo
          currentY += 3;
          doc.setDrawColor(180, 180, 180);
          doc.line(margin, currentY, margin + 80, currentY);
          currentY += 10;

          forecast.keyEvents.forEach((event, index) => {
            // Verifica spazio per evento
            if (currentY + 20 > pageHeight - margin) {
              doc.addPage();
              currentY = 25;
            }

            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            doc.text(`${index + 1}. ${event.eventName}`, margin + 5, currentY);
            currentY += 6;

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`   Date: ${event.dateRange}`, margin + 10, currentY);
            currentY += 5;
            doc.text(`   Impatto: ${event.impact}`, margin + 10, currentY);
            currentY += 5;
            doc.text(`   Tipo: ${event.eventType}`, margin + 10, currentY);
            currentY += 10;
          });
        }

        // === 3. PREVISIONI QUANTITATIVE ===
        if (forecast.quantitativeForecast) {
          // Verifica spazio
          if (currentY + 40 > pageHeight - margin) {
            doc.addPage();
            currentY = 25;
          }

          doc.setFontSize(14);
          doc.setTextColor(60, 60, 60);
          doc.text('PREVISIONI QUANTITATIVE', margin, currentY);

          // Linea sotto il titolo
          currentY += 3;
          doc.setDrawColor(180, 180, 180);
          doc.line(margin, currentY, margin + 75, currentY);

          // Box previsioni con sfondo
          const forecastHeight = 35;
          doc.setFillColor(240, 248, 255);
          doc.roundedRect(margin, currentY + 5, pageWidth - 2 * margin, forecastHeight, 3, 3, 'F');

          currentY += 15;
          doc.setFontSize(10);
          doc.setTextColor(40, 40, 40);
          doc.text(`Tasso Occupazione: ${forecast.quantitativeForecast.occupancyRate}`, margin + 5, currentY);
          currentY += 8;
          doc.text(`Tariffa Media Giornaliera: ${forecast.quantitativeForecast.averageDailyRate}`, margin + 5, currentY);
          currentY += 8;
          doc.text(`Revenue Previsto: ${forecast.quantitativeForecast.projectedGrossRevenue}`, margin + 5, currentY);
          currentY += 15;
        }

        // === 4. AZIONI DI PREZZO ===
        if (forecast.pricingActions && forecast.pricingActions.length > 0) {
          // Verifica spazio
          if (currentY + 30 > pageHeight - margin) {
            doc.addPage();
            currentY = 25;
          }

          doc.setFontSize(14);
          doc.setTextColor(60, 60, 60);
          doc.text('AZIONI DI PREZZO CONSIGLIATE', margin, currentY);

          // Linea sotto il titolo
          currentY += 3;
          doc.setDrawColor(180, 180, 180);
          doc.line(margin, currentY, margin + 90, currentY);
          currentY += 10;

          forecast.pricingActions.forEach((action, index) => {
            // Verifica spazio per azione
            if (currentY + 25 > pageHeight - margin) {
              doc.addPage();
              currentY = 25;
            }

            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            doc.text(`${index + 1}. ${action.eventName}`, margin + 5, currentY);
            currentY += 6;

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`   Periodo: ${action.dateRange}`, margin + 10, currentY);
            currentY += 5;
            doc.text(`   Prezzo Consigliato: ${action.suggestedADR}`, margin + 10, currentY);
            currentY += 5;
            if (action.minimumStay) {
              doc.text(`   Soggiorno Minimo: ${action.minimumStay}`, margin + 10, currentY);
              currentY += 5;
            }
            if (action.targetAudience) {
              doc.text(`   Target: ${action.targetAudience}`, margin + 10, currentY);
              currentY += 5;
            }
            currentY += 8;
          });
        }

        // === 5. RACCOMANDAZIONI STRATEGICHE ===
        if (forecast.strategicRecommendations && forecast.strategicRecommendations.length > 0) {
          // Verifica spazio per il titolo
          if (currentY + 20 > pageHeight - margin) {
            doc.addPage();
            currentY = 25;
          }

          doc.setFontSize(14);
          doc.setTextColor(60, 60, 60);
          doc.text('RACCOMANDAZIONI STRATEGICHE', margin, currentY);

          // Linea sotto il titolo
          currentY += 3;
          doc.setDrawColor(180, 180, 180);
          doc.line(margin, currentY, margin + 95, currentY);
          currentY += 10;

          forecast.strategicRecommendations.forEach((rec, index) => {
            // Verifica spazio per la raccomandazione
            if (currentY + 30 > pageHeight - margin) {
              doc.addPage();
              currentY = 25;
            }

            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            doc.text(`${index + 1}. ${rec.recommendation}`, margin + 5, currentY);
            currentY += 7;

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            const reasoningSplit = doc.splitTextToSize(rec.reasoning, pageWidth - 2 * margin - 10);
            doc.text(reasoningSplit, margin + 10, currentY);
            currentY += reasoningSplit.length * 3.5 + 15;
          });
        }
      }

      doc.save(`report-completo-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating comprehensive report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Hidden div per catturare i grafici */}
      <div ref={chartsRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px' }}>
        <ChartsForPDF reservations={reservations} />
      </div>

      <button
        onClick={generateComprehensiveReport}
        disabled={isGenerating || reservations.length === 0}
        className="px-6 py-3 text-base font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generando Report...
          </div>
        ) : (
          '📋 Report Completo PDF'
        )}
      </button>
    </>
  );
};

export default ComprehensiveReport;