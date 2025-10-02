import { GoogleGenAI, GenerateContentResponse, Part, Type } from "@google/genai";
import { Reservation, Status } from '../types';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("API_KEY is required for GeminiService");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private cleanJsonResponse(text: string): string {
    try {
      // Remove markdown code blocks if present
      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Remove any text before the first [
      const jsonStart = text.indexOf('[');
      if (jsonStart >= 0) {
        text = text.substring(jsonStart);
      }

      // Remove any text after the last ]
      const jsonEnd = text.lastIndexOf(']');
      if (jsonEnd >= 0) {
        text = text.substring(0, jsonEnd + 1);
      }

      // Fix common JSON issues
      text = text.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
      text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'); // Quote unquoted keys
      text = text.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g, ':"$1"$2'); // Quote unquoted string values

      // Fix malformed strings with newlines
      text = text.replace(/"\s*\n\s*"/g, '""');
      text = text.replace(/"\s*\n\s*([^"])/g, '" $1');

      // Remove extra commas and fix array structure
      text = text.replace(/,\s*,/g, ',');
      text = text.replace(/,\s*]/g, ']');

      return text.trim();
    } catch (e) {
      console.error('Error cleaning JSON:', e);
      return text;
    }
  }

  private async fileToGenerativePart(file: File): Promise<Part> {
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
  }

  private validateAndNormalizeReservation(item: any): Reservation | null {
    console.log('🔍 Validating item:', item);

    if (!item || typeof item !== 'object') {
      console.log('❌ Item is not an object');
      return null;
    }

    const platformIsValid = item.platform === 'Booking.com' || item.platform === 'Airbnb';
    if (!platformIsValid) {
      console.warn('❌ Invalid platform received from AI:', item.platform);
      return null;
    }

    // Normalizza lo status per gestire varianti
    const originalStatus = item.status;
    let normalizedStatus = item.status;
    console.log('🏷️ Original status:', originalStatus);

    const statusLower = item.status?.toLowerCase().trim() || '';

    // No-show variations
    if (statusLower.includes('mancata') ||
        statusLower.includes('no show') ||
        statusLower.includes('no-show') ||
        statusLower.includes('noshow') ||
        statusLower.includes('non presentato') ||
        statusLower.includes('non si è presentato') ||
        statusLower.includes('assente') ||
        statusLower === 'no show' ||
        statusLower === 'no-show') {
      normalizedStatus = Status.NoShow;
      console.log('✅ Normalized to NoShow:', normalizedStatus);
    }
    // Cancelled variations
    else if (statusLower.includes('cancel') ||
             statusLower.includes('annul') ||
             statusLower.includes('cancellata') ||
             statusLower.includes('cancelled')) {
      normalizedStatus = Status.Cancelled;
      console.log('✅ Normalized to Cancelled:', normalizedStatus);
    }
    // OK variations (default for most cases)
    else if (statusLower === 'ok' ||
             statusLower.includes('conferm') ||
             statusLower.includes('attiva') ||
             statusLower.includes('completed') ||
             statusLower.includes('checked') ||
             statusLower === '' || // Empty status defaults to OK
             statusLower.includes('valid')) {
      normalizedStatus = Status.OK;
      console.log('✅ Normalized to OK:', normalizedStatus);
    }

    const statusIsValid = Object.values(Status).includes(normalizedStatus as Status);
    if (!statusIsValid) {
      console.warn('❌ Invalid status after normalization:', originalStatus, '->', normalizedStatus);
      return null;
    }

    const result = {
      ...item,
      status: normalizedStatus
    } as Reservation;

    console.log('✅ Valid reservation created:', { id: result.id, status: result.status, price: result.price });
    return result;
  }

  async extractReservationsFromFiles(files: File[]): Promise<Reservation[]> {
    const allReservations: Reservation[] = [];

    const prompt = `ANALIZZA COMPLETAMENTE questo documento e trova TUTTE le prenotazioni presenti.

IMPORTANTE - TIPOLOGIE DI DOCUMENTO:

1. **BOOKING.COM - Lista Prenotazioni** (pagina web/PDF con tabella prenotazioni):
   - Contiene una TABELLA con molte righe, ogni riga è una prenotazione
   - Colonne tipiche: Nome ospite, Arrivo, Partenza, Stato, Prezzo, Commissione, Numero prenotazione
   - DEVI LEGGERE OGNI RIGA DELLA TABELLA, non solo le prime!
   - Stati possibili: "OK", "Mancata presentazione", "Cancellata"
   - Cerca campi: "Nome dell'ospite", "Data di prenotazione", "Stato", "Prezzo", "Commissione e costi", "Numero prenotazione"

2. **AIRBNB - Report dei guadagni** (PDF mensile aggregato):
   - È un RIEPILOGO mensile, NON contiene le singole prenotazioni dettagliate
   - Mostra solo: notti totali, guadagni aggregati, statistiche generali
   - NON ha nomi ospiti, date specifiche di arrivo/partenza per ogni prenotazione
   - SE vedi questo tipo di documento, ritorna array VUOTO: []
   - Questi dati NON sono utilizzabili per creare prenotazioni singole

3. **Screenshot/Immagini di prenotazioni**:
   - Screenshot da app/siti di Airbnb o Booking.com
   - Cerca tutti i dettagli visibili nella schermata

REGOLE DI ESTRAZIONE:
- Leggi TUTTO il documento dall'inizio alla fine
- Non fermarti alle prime prenotazioni
- Cerca in OGNI pagina, OGNI tabella, OGNI lista
- Estrai OGNI SINGOLA prenotazione che vedi
- PRESTA ATTENZIONE ALLO STATO di ogni prenotazione

Per ogni prenotazione trovata, estrai questi dati esatti:

{
  "id": "codice/numero prenotazione (es: 4915138809, HM12345, etc)",
  "platform": "Booking.com" (se da Booking.com) oppure "Airbnb" (se da Airbnb) - SOLO questi due valori",
  "guestName": "nome completo dell'ospite (es: Fabio Minella, Alessandra nardiello)",
  "guestsDescription": "dettagli ospiti (es: 2 ospiti, 3 adulti, 2 adulti 1 bambino)",
  "arrival": "data arrivo in formato YYYY-MM-DD (es: 2025-03-15)",
  "departure": "data partenza in formato YYYY-MM-DD (es: 2025-03-16)",
  "bookingDate": "data prenotazione in formato YYYY-MM-DD (es: 2025-02-14)",
  "status": "GUARDA ATTENTAMENTE lo stato della prenotazione:
    - 'OK' se vedi: OK, Pagata online, Confermata, normale, senza indicazioni di problemi
    - 'Mancata presentazione' se vedi: Mancata presentazione, no-show, non si è presentato
    - 'Cancellata' se vedi: Cancellata, Cancelled, Annullata",
  "price": importo TOTALE/PREZZO come numero (es: 144 per €144, 264.96 per €264,96) - CERCA le colonne "Prezzo" o "Prezzo totale",
  "commission": commissione come numero (es: 28.08 per €28,08) - CERCA le colonne "Commissione e costi" o "Costi del servizio", usa 0 se non specificato
}

CONVERSIONE DATE:
- Se vedi "15 mar 2025" → converti in "2025-03-15"
- Se vedi "17 apr 2025" → converti in "2025-04-17"
- Se vedi "21 lug 2025" → converti in "2025-07-21"
- Formato FINALE sempre: YYYY-MM-DD

STATI DA RICONOSCERE:
- "OK" / "Pagata online" / "Confermata" → usa "OK"
- "Mancata presentazione" / "no show" / "no-show" → usa "Mancata presentazione"
- "Cancellata" / "Cancelled" → usa "Cancellata"

VALIDAZIONE FINALE:
- Se il documento è un "Report dei guadagni" Airbnb (senza liste dettagliate) → ritorna []
- Se trovi prenotazioni dettagliate → ritorna TUTTE in un array JSON
- Non lasciare fuori nessuna prenotazione
- Controlla di aver letto tutto il documento fino in fondo

ESEMPIO OUTPUT per Booking.com:
[
  {
    "id": "4915138809",
    "platform": "Booking.com",
    "guestName": "Fabio Minella",
    "guestsDescription": "2 ospiti",
    "arrival": "2025-03-15",
    "departure": "2025-03-16",
    "bookingDate": "2025-02-14",
    "status": "OK",
    "price": 144,
    "commission": 28.08
  }
]`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            platform: { type: Type.STRING },
            guestName: { type: Type.STRING },
            guestsDescription: { type: Type.STRING },
            arrival: { type: Type.STRING },
            departure: { type: Type.STRING },
            bookingDate: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["OK", "Mancata presentazione", "Cancellata"] },
            price: { type: Type.NUMBER },
            commission: { type: Type.NUMBER }
          },
          required: ['id', 'platform', 'guestName', 'arrival', 'departure', 'status', 'price', 'commission']
        }
    };

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);
        const filePart = await this.fileToGenerativePart(file);

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: { parts: [{ text: prompt }, filePart] },
          config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            maxOutputTokens: 8192, // Increased to allow more data
            temperature: 0
          }
        });

        let jsonText = response.text?.trim();
        console.log(`AI Response for ${file.name} (length: ${jsonText?.length} chars)`);
        console.log(`🔍 FULL AI RESPONSE:`, jsonText); // Show everything to debug missing reservations

        if (jsonText && jsonText.length > 1000) {
          console.log(`Last 500 chars:`, jsonText.substring(jsonText.length - 500));
        }

        if (!jsonText) {
          console.warn(`Empty response for file: ${file.name}`);
          continue;
        }

        // Clean and validate JSON
        let parsedData;
        try {
          jsonText = this.cleanJsonResponse(jsonText);

          if (jsonText === '[]' || jsonText === '{}') {
            console.log(`No reservations found in file: ${file.name}`);
            continue;
          }

          parsedData = JSON.parse(jsonText);
        } catch (parseError: any) {
          console.error(`JSON parsing failed for ${file.name}:`, parseError.message);

          // Try fallback: extract individual objects manually
          try {
            const objectMatches = jsonText.match(/{[^{}]*}/g);
            if (objectMatches) {
              parsedData = [];
              for (const match of objectMatches) {
                try {
                  const obj = JSON.parse(match);
                  parsedData.push(obj);
                } catch {
                  console.warn(`Skipping malformed object in ${file.name}:`, match.substring(0, 100));
                }
              }
              console.log(`Recovered ${parsedData.length} objects from ${file.name} via fallback parsing`);
            } else {
              console.error(`Could not recover data from ${file.name}`);
              continue;
            }
          } catch {
            console.error(`Fallback parsing also failed for ${file.name}`);
            continue;
          }
        }

        if (Array.isArray(parsedData)) {
          console.log(`📊 Raw data from AI for ${file.name}:`, parsedData.length, 'items');

          // Calculate totals BEFORE validation to see if we're losing data
          const rawTotal = parsedData.reduce((sum, item) => sum + (item.price || 0), 0);
          console.log(`💰 Raw total from AI (before validation): €${rawTotal.toFixed(2)}`);

          // Check status distribution in raw data
          const rawStatusBreakdown = parsedData.reduce((acc, item) => {
            const status = item.status || 'undefined';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log(`📋 Raw status breakdown:`, rawStatusBreakdown);

          const validatedData = parsedData
            .map(item => this.validateAndNormalizeReservation(item))
            .filter((item): item is Reservation => item !== null);

          console.log(`✅ Valid reservations after filtering:`, validatedData.length);

          if (validatedData.length > 0) {
            console.log(`Sample reservation:`, validatedData[0]);
            const totalPrice = validatedData.reduce((sum, r) => sum + r.price, 0);
            console.log(`Total value extracted: €${totalPrice.toFixed(2)}`);
          }

          allReservations.push(...validatedData);
          console.log(`Successfully extracted ${validatedData.length} reservations from ${file.name}`);
        } else {
          console.warn(`AI returned non-array data for ${file.name}:`, parsedData);
        }

        // Add delay between files to avoid API overload
        if (files.indexOf(file) < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error: any) {
        console.error(`Failed to process file ${file.name}:`, error.message);
        // Continue with other files
      }
    }

    return allReservations;
  }
}