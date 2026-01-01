# Guida Commissioni Piattaforme

Documento di riferimento per le commissioni applicate da Airbnb e Booking.com agli host.

---

## Airbnb

**Fonte ufficiale:** [airbnb.it/help/article/1857](https://www.airbnb.it/help/article/1857)

### Modello "Costi Condivisi" (default in Italia)

Questo è il modello più comune, dove i costi vengono suddivisi tra host e ospite.

| Chi paga | Percentuale | Note |
|----------|-------------|------|
| **Host** | **3%** | Calcolato sul subtotale (prezzo + costi extra, escluse tasse) |
| Ospite | 14,1% - 16,5% | Varia in base alla prenotazione |

**Con IVA italiana (22%):** 3% × 1,22 = **3,66%** effettivo

#### Calcolo pratico (esempio prenotazione Ian):
```
Lordo host (stanze + pulizia):     487,00 €
Commissione Airbnb (3% + IVA):     -17,82 € (3,66%)
= "Guadagni" nel CSV:              469,18 €
```

### Modello "Costi Singoli" (opzionale)

L'intero costo viene detratto dal compenso dell'host.

| Chi paga | Percentuale | Note |
|----------|-------------|------|
| **Host** | **14-16%** | Diventerà 15,5% da ottobre 2025 |
| Ospite | 0% | Nessun costo servizio visibile |

**Obbligatorio per:**
- Strutture di ospitalità tradizionali (hotel, B&B)
- Host che usano software di gestione immobiliare (dal 2025)

### Note importanti

- La cedolare secca (21%) è trattenuta separatamente da Airbnb per gli affitti brevi in Italia
- Il CSV "vecchio formato" di Airbnb mostra solo i "Guadagni" (già al netto della commissione)
- Il CSV "nuovo formato" (2025) mostra "Guadagni lordi" e "Costi del servizio" separati

---

## Booking.com

**Fonte ufficiale:** [partner.booking.com - Come funziona la nostra commissione](https://partner.booking.com/it/aiuto/commissioni-fatture-e-tasse/commissioni/come-funziona-la-nostra-commissione)

### Commissione Base

| Tipo struttura | Commissione tipica |
|----------------|-------------------|
| Case vacanza / Appartamenti | 15% |
| Hotel standard | 15-18% |
| Con programmi marketing | fino a 20%+ |

**La percentuale varia in base a:**
- Paese
- Tipologia di alloggio
- Zona geografica
- Partecipazione a programmi (Genius, Partner Preferiti, Visibility Booster)

### La tua commissione attuale

Analisi del file `Arrivo_ 2025-01-01 - 2025-12-31.xls`:

| Parametro | Valore |
|-----------|--------|
| **% Commissione** | **18%** |
| Motivo probabile | Programmi Genius/Preferiti attivi |

#### Esempio dal tuo file:
```
Prezzo prenotazione:        144,00 EUR
Commissione (18%):          -25,92 EUR
= Netto host:               118,08 EUR
```

### Quando si paga la commissione

**SI paga:**
- Soggiorno confermato e completato
- Prenotazione non rimborsabile addebitata
- Mancata presentazione addebitata
- Cancellazione oltre il periodo gratuito

**NON si paga:**
- Rinuncia alla penale di cancellazione
- Carta di credito non valida segnalata
- Mancata presentazione senza addebito

### Cosa include la commissione

- Prezzo della prenotazione
- Costi extra (pulizia, servizi)
- **NON** include: tassa di soggiorno

---

## Perché le commissioni sembrano così diverse?

**La risposta:** I due modelli di business sono completamente diversi!

### Airbnb: Modello "Split-Fee" (costi divisi)

Airbnb divide i costi tra host e ospite. L'host paga poco, ma l'ospite vede aggiunti i "costi del servizio".

```
Prezzo che imposti:                 100,00 €
├─ Tu paghi (host):                  -3,66 € (3% + IVA)
└─ Ospite paga in più:              +14-16 € (costi servizio)

➜ Tu ricevi:                         96,34 €
➜ Ospite paga totale:              114-116 €
➜ Airbnb incassa totale:           ~17-20 €
```

### Booking.com: Modello "Host-Only" (tutto all'host)

Booking fa pagare tutto all'host. L'ospite vede il prezzo finale senza sorprese.

```
Prezzo che imposti:                 100,00 €
├─ Tu paghi (host):                 -18,00 € (18%)
└─ Ospite paga in più:                0,00 €

➜ Tu ricevi:                         82,00 €
➜ Ospite paga totale:               100,00 €
➜ Booking incassa totale:            18,00 €
```

### La verità: incassano circa uguale!

| | Airbnb | Booking.com |
|---|--------|-------------|
| **Tu paghi** | 3,66% | 18% |
| **Ospite paga extra** | 14-16% | 0% |
| **Totale piattaforma** | **~17-20%** | **~18%** |
| **Prezzo visibile ospite** | Più basso + fees | Tutto incluso |

---

## Confronto Economico per l'Host

| | Airbnb | Booking.com |
|---|--------|-------------|
| **Commissione Host** | 3,66% (con IVA) | 18% (tuo caso) |
| **Visibilità inclusa** | Base | Programmi premium |
| **Chi paga di più** | Ospite (14-16%) | Host |
| **Cedolare secca** | Trattenuta automaticamente | Da versare autonomamente |

### Impatto economico (su 1.000€ di prenotazioni)

| Piattaforma | Commissione Host | Netto Host | Costo Ospite Extra |
|-------------|------------------|------------|-------------------|
| Airbnb | 36,60 € | 963,40 € | +140-160 € |
| Booking.com | 180,00 € | 820,00 € | 0 € |
| **Differenza** | **143,40 €** | - | - |

**Conclusione:** Su Airbnb guadagni ~143€ in più ogni 1.000€, ma l'ospite paga di più in totale.

---

## Formule per l'App

### Airbnb (formato CSV vecchio)
Il campo "Guadagni" è già al netto della commissione.

```javascript
// Ricostruire il lordo dal netto
const nettoCSV = 469.18;  // "Guadagni" dal CSV
const lordo = nettoCSV / 0.9634;  // ÷ (1 - 3.66%)
const commissione = lordo - nettoCSV;

// Risultato:
// lordo = 487.00 €
// commissione = 17.82 €
```

### Booking.com (formato XLS)
Il file include già prezzo lordo e commissione separati.

```javascript
// Dal file Excel
const prezzo = 144.00;  // "Prezzo"
const percCommissione = 18;  // "% commissione"
const commissione = 25.92;  // "Importo commissione"

// Verifica: prezzo × 18% = 25.92 ✓
```

---

## Fonti e Aggiornamenti

| Data | Fonte | Note |
|------|-------|------|
| Gennaio 2025 | Airbnb Help Center | Documentazione ufficiale italiana |
| Gennaio 2025 | Booking.com Partner Hub | Documentazione ufficiale italiana |
| Gennaio 2025 | File XLS proprietario | Verifica commissione reale 18% |

**Ultimo aggiornamento:** 1 Gennaio 2026

---

## Note per lo Sviluppo

L'app Host Reservation Panel gestisce le commissioni così:

1. **CSV Airbnb (vecchio formato):** Calcola commissione stimata 3,66% dal netto
2. **CSV Airbnb (nuovo formato):** Usa "Costi del servizio" direttamente
3. **XLS/CSV Booking.com:** Usa "Importo commissione" dal file

Riferimenti nel codice:
- Parser CSV Airbnb: `App.tsx:369-399`
- Parser Excel Booking: `App.tsx:413-556`
- Calcoli finanziari: `App.tsx:56-77`
