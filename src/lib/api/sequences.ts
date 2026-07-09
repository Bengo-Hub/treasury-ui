/**
 * Document sequence configuration API (treasury-api).
 */

import { apiClient } from './client';

const BASE = '/api/v1';

export interface SequenceConfig {
  prefix: string;
  separator: string;
  date_format: string;
  padding: number;
  reset_freq: string;
  current_val: number;
  last_reset?: string;
}

export interface UpdateSequenceConfigRequest {
  prefix?: string;
  separator: string;
  date_format?: string;
  padding: number;
  reset_freq: string;
}

export const DOC_TYPES = [
  'quotation',
  'invoice',
  'proforma_invoice',
  'credit_note',
  'debit_note',
  'sales_order',
  'payment_receipt',
  'delivery_challan',
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export function listSequenceConfigs(tenant: string): Promise<{ configs: SequenceConfig[] }> {
  return apiClient.get<{ configs: SequenceConfig[] }>(`${BASE}/${tenant}/document-sequences`);
}

export function getSequenceConfig(tenant: string, docType: DocType): Promise<SequenceConfig> {
  return apiClient.get<SequenceConfig>(`${BASE}/${tenant}/document-sequences/${docType}`);
}

export function updateSequenceConfig(tenant: string, docType: DocType, body: UpdateSequenceConfigRequest): Promise<SequenceConfig> {
  return apiClient.put<SequenceConfig>(`${BASE}/${tenant}/document-sequences/${docType}`, body);
}

export function resetSequenceCounter(tenant: string, docType: DocType): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenant}/document-sequences/${docType}/reset`, {});
}

// setSequenceCounter sets the current counter to an explicit value so a tenant migrating in
// mid-series can continue their existing numbering: the next document issued will be
// current_val + 1. Returns the updated config.
export function setSequenceCounter(tenant: string, docType: DocType, currentVal: number): Promise<SequenceConfig> {
  return apiClient.post<SequenceConfig>(`${BASE}/${tenant}/document-sequences/${docType}/set-counter`, {
    current_val: currentVal,
  });
}

export function previewNextNumber(tenant: string, docType: DocType): Promise<{ next_number: string; doc_type: string }> {
  return apiClient.get<{ next_number: string; doc_type: string }>(`${BASE}/${tenant}/document-sequences/${docType}/preview`);
}
