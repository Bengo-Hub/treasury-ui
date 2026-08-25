'use client';

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { BankAccountVerify } from '@/components/payments/bank-account-verify';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@bengo-hub/shared-ui-lib/data-table';
import {
  buildBankAccountColumns,
  buildStatementPreviewColumns,
  buildUnreconciledColumns,
} from './reconciliation-columns';
import { cn } from '@/lib/utils';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import {
  useBankAccounts,
  useCreateBankAccount,
  useImportStatement,
  useAutoReconcile,
  useManualMatch,
  useUnreconciled,
  useLedgerTransactions,
} from '@/hooks/use-reconciliation';
import type { StatementLine } from '@/lib/api/reconciliation';
import type { BankAccount } from '@/lib/api/bank-accounts';
import {
  buildTemplateWorkbook,
  detectFormat,
  parseStatementFile,
  type ParsedStatementLine,
} from '@/lib/statement-parser';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

const inputClasses =
  'w-full bg-accent/30 border border-border rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none';

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState('bank-accounts');
  const { tenantPathId, tenantQueryParam, isPlatformOwner, orgSlug } = useResolvedTenant();
  // Default to the platform owner's own tenant (codevertex); drill-down overrides.
  const tenant = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
        <p className="text-muted-foreground mt-1">
          Connect bank accounts, import statements, and reconcile transactions.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="reconcile">Reconcile</TabsTrigger>
        </TabsList>

        <TabsContent value="bank-accounts" className="mt-6">
          <BankAccountsTab tenantSlug={tenant} />
        </TabsContent>
        <TabsContent value="statements" className="mt-6">
          <StatementsTab tenantSlug={tenant} />
        </TabsContent>
        <TabsContent value="reconcile" className="mt-6">
          <ReconcileTab tenantSlug={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Bank Accounts
// ---------------------------------------------------------------------------

function BankAccountsTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading, isError } = useBankAccounts(tenantSlug);
  const createMutation = useCreateBankAccount(tenantSlug);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    account_name: '',
    bank_name: '',
    bank_code: '',
    account_number: '',
    currency: 'KES',
  });

  const accounts = data?.bank_accounts ?? [];
  const columns = useMemo(() => buildBankAccountColumns(), []);

  function handleCreate() {
    createMutation.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ account_name: '', bank_name: '', bank_code: '', account_number: '', currency: 'KES' });
      },
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Bank Accounts</h2>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Add Bank Account
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable<BankAccount>
              columns={columns}
              rows={accounts}
              rowKey={(a) => a.id}
              loading={isLoading}
              loadingRows={8}
              error={isError}
              storageKey="reconciliation-bank-accounts-table"
              emptyText="No bank accounts yet. Add one to start reconciling."
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Bank Account Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title="Add Bank Account"
          description="Link a bank account for reconciliation."
          onClose={() => setDialogOpen(false)}
        >
          <div className="space-y-4">
            {/* Verify the account against Paystack to auto-fill the account holder name. */}
            <BankAccountVerify
              tenantSlug={tenantSlug}
              value={{
                bank_name: form.bank_name,
                bank_code: form.bank_code,
                account_number: form.account_number,
                account_name: form.account_name,
              }}
              onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
            />
            <FormField label="Currency">
              {/* Only KES is supported today — the backend rejects other currencies outright since
                  GL aggregation (this account's balance, the balance sheet, cash flow) does no FX
                  conversion. Multi-currency accounts are a tracked future item, not built yet. */}
              <select className={inputClasses} value={form.currency} disabled>
                <option value="KES">KES</option>
              </select>
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !form.account_name || !form.bank_name || !form.account_number || createMutation.isPending
                }
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab: Statements
// ---------------------------------------------------------------------------

function StatementsTab({ tenantSlug }: { tenantSlug: string }) {
  const { data: bankData } = useBankAccounts(tenantSlug);
  const importMutation = useImportStatement(tenantSlug);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<'csv' | 'xls' | 'xlsx'>('csv');
  const [parsedLines, setParsedLines] = useState<ParsedStatementLine[] | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseError, setParseError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState<{ statement_id: string; lines_imported: number } | null>(null);

  const bankAccounts = bankData?.bank_accounts ?? [];
  const bankAccountOptions: ComboboxOption[] = bankAccounts.map((ba) => ({
    value: ba.id,
    label: ba.account_name,
    hint: ba.bank_name || ba.account_number || ba.account_type,
  }));

  async function handleFile(file: File) {
    setImportResult(null);
    setParseError('');
    setParsedLines(null);
    setParseWarnings([]);
    setFileName(file.name);
    setFormat(detectFormat(file.name));
    try {
      const result = await parseStatementFile(file);
      if (result.lines.length === 0) {
        setParseError(result.warnings[0] || 'No transaction rows were found in this file.');
        return;
      }
      setParsedLines(result.lines);
      setParseWarnings(result.warnings);
    } catch {
      setParseError('Could not read this file — is it a valid CSV, XLS, or XLSX statement export?');
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handleCommit() {
    if (!parsedLines || !selectedBankAccount) return;
    importMutation.mutate(
      {
        bank_account_id: selectedBankAccount,
        statement_date: statementDate,
        format,
        lines: parsedLines,
      },
      {
        onSuccess: (result) => {
          setImportResult(result);
          setParsedLines(null);
          setParseWarnings([]);
          setFileName('');
        },
      },
    );
  }

  function handleDownloadTemplate() {
    const blob = buildTemplateWorkbook();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank-statement-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
    if (!parsedLines) return null;
    let moneyIn = 0;
    let moneyOut = 0;
    for (const l of parsedLines) {
      if (l.amount > 0) moneyIn += l.amount;
      else moneyOut += -l.amount;
    }
    return { moneyIn, moneyOut };
  }, [parsedLines]);

  const previewColumns = useMemo(() => buildStatementPreviewColumns(), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Import Statement</h2>
        <Button variant="outline" className="gap-2" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4" /> Download Template
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Bank Account" required>
                <SearchableCombobox
                  options={bankAccountOptions}
                  value={selectedBankAccount}
                  onChange={setSelectedBankAccount}
                  placeholder="Select bank account…"
                  searchPlaceholder="Search accounts…"
                  emptyText="No bank accounts yet"
                />
              </FormField>
              <FormField label="Statement Date" required>
                <input
                  type="date"
                  className={inputClasses}
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                />
              </FormField>
            </div>

            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Click or drag a CSV, XLS, or XLSX statement here</p>
              <p className="text-xs text-muted-foreground mt-1">
                Any bank export with a date, description, and amount (or money-in/money-out) column is
                auto-detected — or use the template above.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {parsedLines && totals && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{fileName}</span>
                    <span className="text-muted-foreground">
                      · {parsedLines.length} line{parsedLines.length !== 1 ? 's' : ''} · Money in{' '}
                      <span className="text-green-500 font-semibold">
                        +{totals.moneyIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>{' '}
                      · Money out{' '}
                      <span className="text-red-500 font-semibold">
                        -{totals.moneyOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setParsedLines(null);
                      setParseWarnings([]);
                      setFileName('');
                    }}
                  >
                    <X className="h-3.5 w-3.5" /> Discard
                  </Button>
                </div>

                {parseWarnings.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                    {parseWarnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                )}

                <div className="border border-border rounded-lg overflow-hidden">
                  <DataTable<ParsedStatementLine>
                    columns={previewColumns}
                    rows={parsedLines}
                    rowKey={(l) => `${l.transaction_date}-${l.reference}-${l.amount}-${l.description}`}
                    storageKey="reconciliation-statement-preview-table"
                    emptyText="No rows parsed"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    onClick={handleCommit}
                    disabled={!selectedBankAccount || importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Import {parsedLines.length} line{parsedLines.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}

            {importResult && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>
                  Imported {importResult.lines_imported} lines. Statement ID:{' '}
                  <span className="font-mono text-xs">{importResult.statement_id}</span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Reconcile
// ---------------------------------------------------------------------------

function ReconcileTab({ tenantSlug }: { tenantSlug: string }) {
  const { data: unreconciledData, isLoading, isError } = useUnreconciled(tenantSlug);
  const autoReconcileMutation = useAutoReconcile(tenantSlug);
  const manualMatchMutation = useManualMatch(tenantSlug);

  const [selectedLine, setSelectedLine] = useState<StatementLine | null>(null);
  const [matchTransactionId, setMatchTransactionId] = useState('');
  const [statementIdForAuto, setStatementIdForAuto] = useState('');

  const lines = unreconciledData?.lines ?? [];

  const { data: ledgerTxnData, isLoading: loadingTxns } = useLedgerTransactions(tenantSlug);
  const ledgerTxnOptions: ComboboxOption[] = (ledgerTxnData?.transactions ?? []).map((t) => {
    const amt = Number(t.debit_amount) > 0 ? t.debit_amount : t.credit_amount;
    return {
      value: t.id,
      label: `${(t.transaction_date ?? '').slice(0, 10)} · ${t.description || t.reference_type || 'Transaction'} · ${t.currency} ${amt}`,
      hint: t.id.slice(0, 8),
    };
  });

  // Distinct statements present in the unmatched lines — so the user picks an imported
  // statement instead of pasting its UUID.
  const statementOptions: ComboboxOption[] = (() => {
    const byId = new Map<string, number>();
    for (const l of lines) byId.set(l.statement_id, (byId.get(l.statement_id) ?? 0) + 1);
    return Array.from(byId.entries()).map(([id, count]) => ({
      value: id,
      label: `Statement ${id.slice(0, 8)} — ${count} unmatched line${count !== 1 ? 's' : ''}`,
      hint: id.slice(0, 8),
    }));
  })();

  function handleAutoReconcile() {
    if (!statementIdForAuto) return;
    autoReconcileMutation.mutate(statementIdForAuto);
  }

  function handleManualMatch() {
    if (!selectedLine || !matchTransactionId) return;
    manualMatchMutation.mutate(
      { lineId: selectedLine.id, transactionId: matchTransactionId },
      {
        onSuccess: () => {
          setSelectedLine(null);
          setMatchTransactionId('');
        },
      },
    );
  }

  const unreconciledColumns = useMemo(() => buildUnreconciledColumns(), []);

  return (
    <div className="space-y-6">
      {/* Auto Reconcile Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <h3 className="text-sm font-bold">Auto Reconcile</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <FormField label="Statement" className="flex-1">
              <SearchableCombobox
                options={statementOptions}
                value={statementIdForAuto}
                onChange={setStatementIdForAuto}
                placeholder="Select an imported statement…"
                searchPlaceholder="Search statements…"
                emptyText="No statements with unmatched lines"
              />
            </FormField>
            <Button
              className="gap-2 shrink-0"
              onClick={handleAutoReconcile}
              disabled={!statementIdForAuto || autoReconcileMutation.isPending}
            >
              {autoReconcileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Auto Reconcile
            </Button>
          </div>
          {autoReconcileMutation.isSuccess && (
            <p className="text-sm text-green-500 mt-2">
              Matched {autoReconcileMutation.data.matched} transactions automatically.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Unreconciled Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <h3 className="text-sm font-bold">Unreconciled Items</h3>
            <p className="text-xs text-muted-foreground">
              {lines.length} unmatched statement line{lines.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-2 pb-2">
            <DataTable<StatementLine>
              columns={unreconciledColumns}
              rows={lines}
              rowKey={(l) => l.id}
              loading={isLoading}
              loadingRows={8}
              error={isError}
              onRowClick={(l) => setSelectedLine(selectedLine?.id === l.id ? null : l)}
              rowClassName={(l) => cn('cursor-pointer', selectedLine?.id === l.id && 'bg-primary/5')}
              storageKey="reconciliation-unreconciled-table"
              emptyState={
                <div className="text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  All items are reconciled.
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Match Dialog */}
      <Dialog open={!!selectedLine} onOpenChange={(open) => !open && setSelectedLine(null)}>
        <DialogContent
          title="Manual Match"
          description="Match this bank statement line to a ledger transaction."
          onClose={() => setSelectedLine(null)}
        >
          <div className="space-y-4">
            <div className="p-3 bg-accent/20 rounded-lg space-y-1">
              <p className="text-sm font-bold">{selectedLine?.description}</p>
              <p className="text-xs text-muted-foreground">
                Date: {selectedLine?.transaction_date} &middot; Ref: {selectedLine?.reference || 'N/A'}
              </p>
              <p className="text-sm font-bold">
                Amount: {selectedLine?.amount}
              </p>
            </div>

            <FormField label="Ledger Transaction" required>
              <SearchableCombobox
                options={ledgerTxnOptions}
                value={matchTransactionId}
                onChange={setMatchTransactionId}
                loading={loadingTxns}
                placeholder="Select a ledger transaction…"
                searchPlaceholder="Search by date, description or amount…"
                emptyText="No ledger transactions found"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setSelectedLine(null)}>
                Cancel
              </Button>
              <Button
                className="gap-2"
                onClick={handleManualMatch}
                disabled={!matchTransactionId || manualMatchMutation.isPending}
              >
                {manualMatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Match
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
