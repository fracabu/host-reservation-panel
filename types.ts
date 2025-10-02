export enum Status {
  OK = 'OK',
  Cancelled = 'Cancellata',
  NoShow = 'Mancata presentazione'
}

export type Platform = 'Booking.com' | 'Airbnb';

export interface Reservation {
  id: string;
  platform: Platform;
  guestName: string;
  guestsDescription: string;
  arrival: string;
  departure: string;
  bookingDate: string;
  status: Status;
  price: number;
  commission: number;
}

export interface MonthlyStats {
  activeBookings: number;
  totalNights: number;
  totalGross: number;
  totalCommission: number;
  totalNetPreTax: number;
  totalCedolareSecca: number;
  totalNetPostTax: number;
}

export interface MonthlyBreakdown {
  monthYear: string;
  booking: MonthlyStats;
  airbnb: MonthlyStats;
  total: MonthlyStats;
}

// Types for Forecasting Assistant
export interface KeyEvent {
  dateRange: string;
  eventName: string;
  impact: string;
  eventType: string;
}

export interface QuantitativeForecast {
  occupancyRate: string;
  averageDailyRate: string;
  projectedGrossRevenue: string;
}

export interface StrategicRecommendation {
  recommendation: string;
  reasoning: string;
}

export interface PricingAction {
  eventName: string;
  dateRange: string;
  suggestedADR?: string; // e.g., "€250-€300/notte"
  minimumStay?: string; // e.g., "3 notti"
  targetAudience?: string; // e.g., "Viaggiatori d'affari"
}


export interface Forecast {
  demandOutlook: string;
  keyEvents: KeyEvent[];
  quantitativeForecast: QuantitativeForecast;
  strategicRecommendations: StrategicRecommendation[];
  pricingActions: PricingAction[];
  groundingSources?: { uri: string; title: string; }[];
}