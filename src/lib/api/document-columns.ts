import { apiClient } from './client';

const BASE = '/api/v1';

export interface ColumnDef {
  key: string;
  label: string;
  default_table: boolean;
  default_csv: boolean;
  default_pdf: boolean;
}

export interface ColumnPrefs {
  table: string[];
  csv: string[];
  pdf: string[];
}

export interface DocumentColumnsResponse {
  columns: ColumnDef[];
  user_prefs: ColumnPrefs;
}

export function getDocumentColumns(tenant: string, docType: string) {
  return apiClient.get<DocumentColumnsResponse>(
    `${BASE}/${tenant}/document-columns/${docType}`,
  );
}

export function saveDocumentColumnPrefs(tenant: string, docType: string, prefs: ColumnPrefs) {
  return apiClient.put<{ status: string }>(
    `${BASE}/${tenant}/document-columns/${docType}`,
    prefs,
  );
}
