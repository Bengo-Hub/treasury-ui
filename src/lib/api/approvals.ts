/**
 * Centralized Approvals API (rules + requests) for treasury documents.
 *
 * Mirrors inventory-ui's approval contract one-for-one, but treasury-namespaced:
 *   /api/v1/{tenant}/treasury/approval-rules        (CRUD)
 *   /api/v1/{tenant}/treasury/approval-requests      (list/get + approve/reject)
 *   /api/v1/{tenant}/treasury/{module}/{id}/submit-for-approval
 *
 * The backend mirrors inventory's JSON DTO shapes, so the types here match
 * inventory-ui's `ApprovalRule` / `ApprovalRequest` / `ApprovalAction` exactly.
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// Treasury document families that can require approval.
export type ApprovalModule =
  | 'invoice'
  | 'expense'
  | 'bill'
  | 'credit_note'
  | 'debit_note'
  | 'payment'
  | 'quotation'
  | 'proforma_invoice'
  | 'sales_order'
  | 'journal_entry';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalActionStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface ApprovalStep {
  id?: string;
  sequence: number;
  name: string;
  approver_role: string;
}

export interface ApprovalRule {
  id: string;
  module: ApprovalModule;
  name: string;
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
  steps: ApprovalStep[];
}

export interface ApprovalRuleInput {
  module: ApprovalModule;
  name: string;
  min_amount: number;
  max_amount?: number | null;
  is_active?: boolean;
  steps: ApprovalStep[];
}

export interface ApprovalAction {
  id: string;
  sequence: number;
  name: string;
  approver_role: string;
  status: ApprovalActionStatus;
  acted_by?: string;
  acted_at?: string;
  comment?: string;
}

export interface ApprovalRequest {
  id: string;
  module: ApprovalModule;
  object_id: string;
  object_reference: string;
  amount: number;
  status: ApprovalRequestStatus;
  current_sequence: number;
  current_step?: ApprovalAction;
  actions?: ApprovalAction[];
  created_at: string;
  decided_at?: string;
}

export interface ApprovalRequestListParams {
  status?: ApprovalRequestStatus;
  module?: ApprovalModule;
  object_id?: string;
  inbox?: boolean;
}

export interface SubmitForApprovalResult {
  approval_required: boolean;
  request?: ApprovalRequest;
  message?: string;
}

const base = (tenant: string) => `${BASE}/${tenant}/treasury`;

export const approvalsApi = {
  // ── Rules ─────────────────────────────────────────────────────────────────
  listRules: (tenant: string, module?: ApprovalModule) =>
    apiClient.get<ApprovalRule[]>(`${base(tenant)}/approval-rules`, module ? { module } : undefined),
  getRule: (tenant: string, id: string) =>
    apiClient.get<ApprovalRule>(`${base(tenant)}/approval-rules/${id}`),
  createRule: (tenant: string, data: ApprovalRuleInput) =>
    apiClient.post<ApprovalRule>(`${base(tenant)}/approval-rules`, data),
  updateRule: (tenant: string, id: string, data: ApprovalRuleInput) =>
    apiClient.put<ApprovalRule>(`${base(tenant)}/approval-rules/${id}`, data),
  deleteRule: (tenant: string, id: string) =>
    apiClient.delete<{ deleted: boolean; id: string }>(`${base(tenant)}/approval-rules/${id}`),

  // ── Requests ──────────────────────────────────────────────────────────────
  listRequests: (tenant: string, params?: ApprovalRequestListParams) =>
    apiClient.get<ApprovalRequest[]>(`${base(tenant)}/approval-requests`, params),
  getRequest: (tenant: string, id: string) =>
    apiClient.get<ApprovalRequest>(`${base(tenant)}/approval-requests/${id}`),
  approve: (tenant: string, id: string, comment?: string) =>
    apiClient.post<ApprovalRequest>(`${base(tenant)}/approval-requests/${id}/approve`, { comment }),
  reject: (tenant: string, id: string, comment?: string) =>
    apiClient.post<ApprovalRequest>(`${base(tenant)}/approval-requests/${id}/reject`, { comment }),

  // Submit any document for approval (creates a request if a matching active rule exists).
  submitForApproval: (tenant: string, module: ApprovalModule, objectId: string) =>
    apiClient.post<SubmitForApprovalResult>(
      `${base(tenant)}/${MODULE_PATH[module]}/${objectId}/submit-for-approval`,
      {},
    ),
};

/**
 * URL segment per module for the submit-for-approval endpoint. Mirrors the
 * treasury document route families.
 */
const MODULE_PATH: Record<ApprovalModule, string> = {
  invoice: 'invoices',
  expense: 'expenses',
  bill: 'ap/bills',
  credit_note: 'credit-notes',
  debit_note: 'debit-notes',
  payment: 'payments',
  quotation: 'quotations',
  proforma_invoice: 'proforma-invoices',
  sales_order: 'sales-orders',
  journal_entry: 'ledger/journals',
};
