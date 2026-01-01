import React, { useRef, useState, useMemo } from 'react';
import { Reservation, MonthlyBreakdown, Forecast, Status } from '../types';
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

  // Filtra le prenotazioni cancellate - mostra solo OK e NoShow (come la dashboard)
  const activeReservations = useMemo(() =>
    reservations.filter(r => r.status === Status.OK || r.status === Status.NoShow),
    [reservations]
  );

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
      let currentY = 20;
      const pageHeight = doc.internal.pageSize.height; // 297mm
      const pageWidth = doc.internal.pageSize.width;   // 210mm
      const margin = 15;
      const maxTextWidth = pageWidth - (2 * margin);  // 180mm
      const safeBottomMargin = 20; // Margine di sicurezza dal fondo

      // === COPERTINA ===
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      const title = 'Report Completo Host Reservation Panel';
      const titleSplit = doc.splitTextToSize(title, maxTextWidth);
      doc.text(titleSplit, margin, currentY);

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

      // Verifica spazio prima delle statistiche
      if (currentY + 80 > pageHeight - safeBottomMargin) {
        doc.addPage();
        currentY = 20;
      }

      // Statistiche generali
      currentY += 20;
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Riepilogo Generale', margin, currentY);

      const totalRevenue = activeReservations.reduce((acc, r) => acc + r.price, 0);
      const totalCommission = activeReservations.reduce((acc, r) => acc + r.commission, 0);
      const totalNetPreTax = totalRevenue - totalCommission;
      const totalCedolareSecca = totalNetPreTax * 0.21;
      const totalNetPostTax = totalNetPreTax - totalCedolareSecca;

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

      currentY += 12;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);

      // Box statistiche con sfondo - aumentato per cedolare secca
      const statsHeight = 72;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, currentY, maxTextWidth, statsHeight, 3, 3, 'F');

      const textPadding = 4;
      currentY += 10;
      doc.text(`• Prenotazioni Totali: ${activeReservations.length}`, margin + textPadding, currentY);
      currentY += 8;
      doc.text(`• Notti Vendute: ${totalNights}`, margin + textPadding, currentY);
      currentY += 8;
      doc.text(`• Revenue Lordo: ${formatCurrency(totalRevenue)}`, margin + textPadding, currentY);
      currentY += 8;
      doc.text(`• Commissioni Totali: ${formatCurrency(totalCommission)}`, margin + textPadding, currentY);
      currentY += 8;
      doc.text(`• Netto (pre-tasse): ${formatCurrency(totalNetPreTax)}`, margin + textPadding, currentY);
      currentY += 8;
      doc.text(`• Cedolare Secca (21%): ${formatCurrency(totalCedolareSecca)}`, margin + textPadding, currentY);
      currentY += 8;
      doc.text(`• Netto Finale: ${formatCurrency(totalNetPostTax)}`, margin + textPadding, currentY);
      currentY += 8;
      doc.text(`• Tariffa Media: ${formatCurrency(totalRevenue / totalNights)}/notte`, margin + textPadding, currentY);

      currentY += 20;

      // === SEZIONE COMMISSIONI PER PIATTAFORMA ===
      // Verifica spazio
      if (currentY + 90 > pageHeight - safeBottomMargin) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Commissioni per Piattaforma', margin, currentY);

      currentY += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      // Calcola commissioni per piattaforma
      const airbnbRes = activeReservations.filter(r => r.platform === 'Airbnb');
      const bookingRes = activeReservations.filter(r => r.platform === 'Booking.com');

      const airbnbRevenue = airbnbRes.reduce((acc, r) => acc + r.price, 0);
      const airbnbCommission = airbnbRes.reduce((acc, r) => acc + r.commission, 0);
      const bookingRevenue = bookingRes.reduce((acc, r) => acc + r.price, 0);
      const bookingCommission = bookingRes.reduce((acc, r) => acc + r.commission, 0);

      // Tabella commissioni
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Piattaforma', 'Prenotazioni', 'Lordo', 'Commissione', '% Comm.', 'Netto']],
        body: [
          [
            'Airbnb',
            airbnbRes.length.toString(),
            formatCurrencyForPDF(airbnbRevenue),
            formatCurrencyForPDF(airbnbCommission),
            airbnbRevenue > 0 ? ((airbnbCommission / airbnbRevenue) * 100).toFixed(1) + '%' : '0%',
            formatCurrencyForPDF(airbnbRevenue - airbnbCommission)
          ],
          [
            'Booking.com',
            bookingRes.length.toString(),
            formatCurrencyForPDF(bookingRevenue),
            formatCurrencyForPDF(bookingCommission),
            bookingRevenue > 0 ? ((bookingCommission / bookingRevenue) * 100).toFixed(1) + '%' : '0%',
            formatCurrencyForPDF(bookingRevenue - bookingCommission)
          ],
          [
            'TOTALE',
            activeReservations.length.toString(),
            formatCurrencyForPDF(totalRevenue),
            formatCurrencyForPDF(totalCommission),
            totalRevenue > 0 ? ((totalCommission / totalRevenue) * 100).toFixed(1) + '%' : '0%',
            formatCurrencyForPDF(totalNetPreTax)
          ]
        ],
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 28, halign: 'right' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Nota esplicativa commissioni
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const notaCommissioni = 'Nota: Airbnb usa il modello "split-fee" (host 3.66%, ospite 14-16%). Booking.com addebita tutto all\'host (15-18%).';
      doc.text(notaCommissioni, margin, currentY);

      currentY += 15;

      // === PAGINA NUOVA: GRAFICI ===
      if (chartsRef.current) {
        doc.addPage();
        currentY = 20;

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
          const maxImgWidth = maxTextWidth;
          const imgWidth = Math.min(maxImgWidth, 160);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const maxImgHeight = pageHeight - currentY - safeBottomMargin - 15;

          // Verifica se l'immagine rientra nella pagina
          if (imgHeight > maxImgHeight) {
            doc.addPage();
            currentY = 20;
          } else {
            currentY += 15;
          }

          const finalImgHeight = Math.min(imgHeight, pageHeight - currentY - safeBottomMargin);
          doc.addImage(imgData, 'PNG', margin, currentY, imgWidth, finalImgHeight);
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
      currentY = 20;
      const landscapeWidth = doc.internal.pageSize.width;  // 297mm in landscape
      const landscapeHeight = doc.internal.pageSize.height; // 210mm in landscape
      const landscapeMargin = 15;
      const landscapeMaxWidth = landscapeWidth - (2 * landscapeMargin);

      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Dettaglio Prenotazioni', landscapeMargin, currentY);

      // Linea separatrice
      currentY += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(landscapeMargin, currentY, landscapeWidth - landscapeMargin, currentY);

      const reservationRows = activeReservations.map(res => [
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
          0: { cellWidth: 28 },  // ID
          1: { cellWidth: 26 },  // Piattaforma
          2: { cellWidth: 36 },  // Ospite (più spazio per nomi lunghi)
          3: { cellWidth: 22 },  // Arrivo
          4: { cellWidth: 22 },  // Partenza
          5: { cellWidth: 16, halign: 'center' },  // Notti
          6: { cellWidth: 30, halign: 'right' },   // Prezzo
          7: { cellWidth: 30 }   // Stato
        },
        margin: { left: landscapeMargin, right: landscapeMargin, top: 20, bottom: 20 },
        tableWidth: 'auto',
        halign: 'center',
        showHead: 'everyPage',
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
        },
        didDrawPage: function(data) {
          // Header su ogni pagina della tabella
          if (data.pageNumber > 1) {
            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            doc.text('Dettaglio Prenotazioni (continua)', landscapeMargin, 15);
          }
        }
      });

      // === PAGINA NUOVA: RIEPILOGO MENSILE ===
      doc.addPage('landscape');
      currentY = 20;

      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Riepilogo Mensile per Piattaforma', landscapeMargin, currentY);

      // Linea separatrice
      currentY += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(landscapeMargin, currentY, landscapeWidth - landscapeMargin, currentY);

      const tableBody: any[] = [];

      // Calcola totali generali
      const grandTotals = monthlyBreakdowns.reduce((acc, summary) => {
        acc.activeBookings += summary.total.activeBookings;
        acc.totalNights += summary.total.totalNights;
        acc.totalGross += summary.total.totalGross;
        acc.totalCommission += summary.total.totalCommission;
        acc.totalNetPreTax += summary.total.totalNetPreTax;
        acc.totalCedolareSecca += summary.total.totalCedolareSecca;
        acc.totalNetPostTax += summary.total.totalNetPostTax;
        return acc;
      }, {
        activeBookings: 0, totalNights: 0, totalGross: 0,
        totalCommission: 0, totalNetPreTax: 0, totalCedolareSecca: 0, totalNetPostTax: 0
      });

      monthlyBreakdowns.forEach(summary => {
        tableBody.push([{ content: summary.monthYear, colSpan: 8, styles: { fontStyle: 'bold', fillColor: '#e5e7eb', textColor: '#1f2937' } }]);

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
            formatCurrencyForPDF(p.data.totalCedolareSecca),
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
          { content: formatCurrencyForPDF(summary.total.totalCedolareSecca), styles: { fontStyle: 'bold' } },
          { content: formatCurrencyForPDF(summary.total.totalNetPostTax), styles: { fontStyle: 'bold' } }
        ]);
      });

      // Totali generali
      if (monthlyBreakdowns.length > 1) {
        tableBody.push([{ content: '', colSpan: 8, styles: { fillColor: '#ffffff', minCellHeight: 8 } }]);
        tableBody.push([
          { content: 'TOTALI GENERALI', styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: grandTotals.activeBookings.toString(), styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: grandTotals.totalNights.toString(), styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: formatCurrencyForPDF(grandTotals.totalGross), styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: formatCurrencyForPDF(grandTotals.totalCommission), styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#ef4444' } },
          { content: formatCurrencyForPDF(grandTotals.totalNetPreTax), styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#ffffff' } },
          { content: formatCurrencyForPDF(grandTotals.totalCedolareSecca), styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#fbbf24' } },
          { content: formatCurrencyForPDF(grandTotals.totalNetPostTax), styles: { fontStyle: 'bold', fontSize: 11, fillColor: '#1f2937', textColor: '#22c55e' } }
        ]);
      }

      autoTable(doc, {
        head: [['Piattaforma', 'Prenot.', 'Notti', 'Lordo', 'Comm.', 'Netto (pre-tasse)', 'Ced. Secca', 'Netto Finale']],
        body: tableBody,
        startY: currentY + 10,
        theme: 'striped',
        headStyles: {
          fillColor: [55, 65, 81],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 30 },  // Piattaforma
          1: { cellWidth: 18, halign: 'center' },  // Prenot.
          2: { cellWidth: 16, halign: 'center' },  // Notti
          3: { cellWidth: 30, halign: 'right' },   // Lordo
          4: { cellWidth: 26, halign: 'right' },   // Commissione
          5: { cellWidth: 32, halign: 'right' },   // Netto (pre-tasse)
          6: { cellWidth: 28, halign: 'right' },   // Cedolare Secca
          7: { cellWidth: 32, halign: 'right' }    // Netto Finale
        },
        margin: { left: landscapeMargin, right: landscapeMargin, top: 20, bottom: 20 },
        tableWidth: 'auto',
        halign: 'center',
        showHead: 'everyPage',
        didParseCell: function(data) {
          if (data.cell.section === 'body') {
            if (data.column.index === 4) data.cell.styles.textColor = [220, 38, 38]; // Commissione: rosso
            if (data.column.index === 6) data.cell.styles.textColor = [245, 158, 11]; // Cedolare: arancione
            if (data.column.index === 7) data.cell.styles.textColor = [34, 197, 94]; // Netto Finale: verde
          }
        },
        didDrawPage: function(data) {
          // Header su ogni pagina della tabella
          if (data.pageNumber > 1) {
            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            doc.text('Riepilogo Mensile per Piattaforma (continua)', landscapeMargin, 15);
          }
        }
      });

      // === PAGINA PREVISIONI (se disponibili) ===
      if (forecast) {
        doc.addPage();
        currentY = 20;
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Previsioni e Strategie', margin, currentY);

        // Linea separatrice
        currentY += 8;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, margin + maxTextWidth, currentY);

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
        const splitText = doc.splitTextToSize(forecast.demandOutlook, maxTextWidth);

        // Verifica se c'è spazio per tutto il testo
        if (currentY + splitText.length * 5 + 15 > pageHeight - safeBottomMargin) {
          doc.addPage();
          currentY = 20;
        }

        doc.text(splitText, margin, currentY);
        currentY += splitText.length * 5 + 15;

        // === 2. EVENTI CHIAVE ===
        if (forecast.keyEvents && forecast.keyEvents.length > 0) {
          // Verifica spazio
          if (currentY + 30 > pageHeight - safeBottomMargin) {
            doc.addPage();
            currentY = 20;
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
            if (currentY + 25 > pageHeight - safeBottomMargin) {
              doc.addPage();
              currentY = 20;
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
          if (currentY + 45 > pageHeight - safeBottomMargin) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(14);
          doc.setTextColor(60, 60, 60);
          doc.text('PREVISIONI QUANTITATIVE', margin, currentY);

          // Linea sotto il titolo
          currentY += 3;
          doc.setDrawColor(180, 180, 180);
          doc.line(margin, currentY, margin + 75, currentY);

          // Box previsioni con sfondo - aumentato altezza
          const forecastHeight = 50;
          doc.setFillColor(240, 248, 255);
          doc.roundedRect(margin, currentY + 8, maxTextWidth, forecastHeight, 3, 3, 'F');

          currentY += 18; // Più spazio dall'alto
          doc.setFontSize(10);
          doc.setTextColor(40, 40, 40);
          doc.text(`Tasso Occupazione: ${forecast.quantitativeForecast.occupancyRate}`, margin + 8, currentY);
          currentY += 10; // Più spazio tra le righe
          doc.text(`Tariffa Media Giornaliera: ${forecast.quantitativeForecast.averageDailyRate}`, margin + 8, currentY);
          currentY += 10;
          doc.text(`Revenue Previsto: ${forecast.quantitativeForecast.projectedGrossRevenue}`, margin + 8, currentY);
          currentY += 20; // Più spazio dopo il box
        }

        // === 4. AZIONI DI PREZZO ===
        if (forecast.pricingActions && forecast.pricingActions.length > 0) {
          // Verifica spazio
          if (currentY + 35 > pageHeight - safeBottomMargin) {
            doc.addPage();
            currentY = 20;
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
            // Calcola spazio necessario per questa azione
            const eventTitleSplit = doc.splitTextToSize(`${index + 1}. ${action.eventName}`, maxTextWidth - 10);
            const targetSplit = action.targetAudience ? doc.splitTextToSize(`   Target: ${action.targetAudience}`, maxTextWidth - 10) : [];

            let neededSpace = 30; // Base space
            neededSpace += eventTitleSplit.length * 6;
            if (action.minimumStay) neededSpace += 6;
            if (targetSplit.length > 0) neededSpace += targetSplit.length * 6;

            // Verifica spazio per azione
            if (currentY + neededSpace > pageHeight - safeBottomMargin) {
              doc.addPage();
              currentY = 20;
            }

            // Titolo evento con più spazio
            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            doc.text(eventTitleSplit, margin + 5, currentY);
            currentY += eventTitleSplit.length * 6;

            // Dettagli con spacing migliorato
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`   Periodo: ${action.dateRange}`, margin + 10, currentY);
            currentY += 6;
            doc.text(`   Prezzo Consigliato: ${action.suggestedADR}`, margin + 10, currentY);
            currentY += 6;
            if (action.minimumStay) {
              doc.text(`   Soggiorno Minimo: ${action.minimumStay}`, margin + 10, currentY);
              currentY += 6;
            }
            if (action.targetAudience) {
              doc.text(targetSplit, margin + 10, currentY);
              currentY += targetSplit.length * 6;
            }
            currentY += 12; // Più spazio tra le azioni
          });
        }

        // === 5. RACCOMANDAZIONI STRATEGICHE ===
        if (forecast.strategicRecommendations && forecast.strategicRecommendations.length > 0) {
          // Verifica spazio per il titolo
          if (currentY + 25 > pageHeight - safeBottomMargin) {
            doc.addPage();
            currentY = 20;
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
            // Calcola spazio necessario per questa raccomandazione
            const reasoningSplit = doc.splitTextToSize(rec.reasoning, maxTextWidth - 10);
            const neededSpace = 20 + reasoningSplit.length * 4;

            // Verifica spazio per la raccomandazione
            if (currentY + neededSpace > pageHeight - safeBottomMargin) {
              doc.addPage();
              currentY = 20;
            }

            // Titolo raccomandazione
            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            const recTitle = `${index + 1}. ${rec.recommendation}`;
            const recTitleSplit = doc.splitTextToSize(recTitle, maxTextWidth - 10);
            doc.text(recTitleSplit, margin + 5, currentY);
            currentY += recTitleSplit.length * 6 + 2;

            // Reasoning con spacing migliorato
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(reasoningSplit, margin + 10, currentY);
            currentY += reasoningSplit.length * 4.5 + 15;
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
        <ChartsForPDF reservations={activeReservations} />
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