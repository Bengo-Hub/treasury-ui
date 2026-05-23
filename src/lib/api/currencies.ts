/**
 * Currency and exchange rate API (treasury-api).
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

export interface ExchangeRate {
  id: string;
  tenant_id?: string;
  base_currency: string;
  quote_currency: string;
  rate: string;
  effective_date: string;
  source: string;
}

export interface SetRateRequest {
  base_currency: string;
  quote_currency: string;
  rate: number | string;
  effective_date?: string;
}

export interface ConvertResponse {
  from: string;
  to: string;
  amount: string;
  converted: string;
}

export function listCurrencies(): Promise<{ currencies: CurrencyInfo[] }> {
  return apiClient.get<{ currencies: CurrencyInfo[] }>('/api/v1/public/currencies');
}

export function listExchangeRates(tenant: string): Promise<{ rates: ExchangeRate[] }> {
  return apiClient.get<{ rates: ExchangeRate[] }>(`${BASE}/${tenant}/exchange-rates`);
}

export function setExchangeRate(tenant: string, body: SetRateRequest): Promise<ExchangeRate> {
  return apiClient.post<ExchangeRate>(`${BASE}/${tenant}/exchange-rates`, body);
}

export function convertCurrency(tenant: string, from: string, to: string, amount: number | string): Promise<ConvertResponse> {
  return apiClient.get<ConvertResponse>(`${BASE}/${tenant}/exchange-rates/convert`, { from, to, amount: String(amount) });
}
