/**
 * Expenses & Categories API.
 * Base path: /api/v1/{tenantIdOrSlug}
 */

import { apiClient } from './client';

const BASE = '/api/v1';

// ---- Types ----

export interface Expense {
  id: string;
  tenant_id: string;
  expense_number: string;
  category_id?: string;
  category_name?: string;
  description: string;
  amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  expense_date: string;
  status: string; // draft, submitted, approved, rejected, reimbursed, cancelled
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  receipt_url?: string;
  vendor_id?: string;
  account_id?: string;
  payment_intent_id?: string;
  source_service?: string;
  source_reference_id?: string;
  is_recurring: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  parent_id?: string;
  default_account_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoriesResponse {
  categories: ExpenseCategory[];
  total: number;
}

export interface ExpensesParams {
  status?: string;
  category_id?: string;
  from?: string;
  to?: string;
  source_service?: string;
  limit?: number;
  offset?: number;
  tenantId?: string;
}

export interface CreateExpenseRequest {
  category_id?: string;
  description: string;
  amount: number;
  tax_amount?: number;
  currency?: string;
  expense_date?: string;
  receipt_url?: string;
  vendor_id?: string;
  account_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateCategoryRequest {
  code: string;
  name: string;
  parent_id?: string;
  default_account_id?: string;
}

// ---- API functions ----

export function getExpenses(tenantIdOrSlug: string, params?: ExpensesParams): Promise<ExpensesResponse> {
  return apiClient.get<ExpensesResponse>(`${BASE}/${tenantIdOrSlug}/expenses`, params);
}

export function getExpense(tenantIdOrSlug: string, id: string): Promise<Expense> {
  return apiClient.get<Expense>(`${BASE}/${tenantIdOrSlug}/expenses/${id}`);
}

export function createExpense(tenantIdOrSlug: string, data: CreateExpenseRequest): Promise<Expense> {
  return apiClient.post<Expense>(`${BASE}/${tenantIdOrSlug}/expenses`, data);
}

export function submitExpense(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/submit`);
}

export function approveExpense(tenantIdOrSlug: string, id: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/approve`);
}

export function rejectExpense(tenantIdOrSlug: string, id: string, reason?: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/reject`, { reason });
}

export function reimburseExpense(tenantIdOrSlug: string, id: string, paymentIntentId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`${BASE}/${tenantIdOrSlug}/expenses/${id}/reimburse`, { payment_intent_id: paymentIntentId });
}

export function getExpenseCategories(tenantIdOrSlug: string): Promise<CategoriesResponse> {
  return apiClient.get<CategoriesResponse>(`${BASE}/${tenantIdOrSlug}/expense-categories`);
}

export function createExpenseCategory(tenantIdOrSlug: string, data: CreateCategoryRequest): Promise<ExpenseCategory> {
  return apiClient.post<ExpenseCategory>(`${BASE}/${tenantIdOrSlug}/expense-categories`, data);
}
