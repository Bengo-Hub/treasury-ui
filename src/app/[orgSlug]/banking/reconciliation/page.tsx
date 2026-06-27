'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { BankAccountVerify } from '@/components/payments/bank-account-verify';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';

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

  const accounts = data?.accounts ?? [];

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
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to load bank accounts. Check your connection and try again.
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No bank accounts yet. Add one to start reconciling.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {accounts.map((acct) => (
                <div
                  key={acct.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{acct.account_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {acct.bank_name} &middot; {acct.account_number}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{acct.currency}</Badge>
                </div>
              ))}
            </div>
          )}
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
              <select
                className={inputClasses}
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              >
                {['KES', 'USD', 'EUR'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
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
  const [importResult, setImportResult] = useState<{ statement_id: string; lines_imported: number } | null>(null);

  const bankAccounts = bankData?.accounts ?? [];

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedBankAccount) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = parseCSV(text);
      if (lines.length === 0) return;

      importMutation.mutate(
        {
          bank_account_id: selectedBankAccount,
          statement_date: new Date().toISOString().slice(0, 10),
          lines,
        },
        {
          onSuccess: (result) => {
            setImportResult(result);
          },
        },
      );
    };
    reader.readAsText(file);
  }

  function parseCSV(text: string): { transaction_date: string; description: string; amount: number; reference: string }[] {
    const rows = text.trim().split('\n');
    if (rows.length < 2) return [];
    // skip header row
    return rows.slice(1).map((row) => {
      const cols = row.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      return {
        transaction_date: cols[0] || new Date().toISOString().slice(0, 10),
        description: cols[1] || '',
        amount: parseFloat(cols[2] || '0'),
        reference: cols[3] || '',
      };
    }).filter((l) => l.description && !isNaN(l.amount));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Import Statement</h2>
      </div>

      <Card>
        <CardContent>
          <div className="space-y-4">
            <FormField label="Bank Account" required>
              <select
                className={inputClasses}
                value={selectedBankAccount}
                onChange={(e) => setSelectedBankAccount(e.target.value)}
              >
                <option value="">Select bank account...</option>
                {bankAccounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>
                    {ba.account_name} ({ba.bank_name})
                  </option>
                ))}
              </select>
            </FormField>

            <div
              className={cn(
                'border-2 border-dashed border-border rounded-xl p-8 text-center transition-colors',
                selectedBankAccount
                  ? 'hover:border-primary/50 cursor-pointer'
                  : 'opacity-50 pointer-events-none',
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Click to upload CSV or OFX statement</p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV format: date, description, amount, reference
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.ofx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {importMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing statement...
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
              <Combobox
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
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Failed to load unreconciled items. Check your connection and try again.
            </div>
          ) : lines.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              All items are reconciled.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {lines.map((line) => {
                const isDebit = parseFloat(line.amount) < 0;
                return (
                  <div
                    key={line.id}
                    className={cn(
                      'px-6 py-4 flex items-center justify-between hover:bg-accent/5 transition-colors cursor-pointer',
                      selectedLine?.id === line.id && 'bg-primary/5 border-l-2 border-l-primary',
                    )}
                    onClick={() => setSelectedLine(selectedLine?.id === line.id ? null : line)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-accent/30 flex items-center justify-center border border-border">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{line.description}</h4>
                        <p className="text-xs text-muted-foreground">
                          {line.transaction_date} &middot; Ref: {line.reference || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'text-sm font-bold',
                          isDebit ? 'text-red-500' : 'text-green-500',
                        )}
                      >
                        {isDebit ? '' : '+'}{line.amount}
                      </p>
                      <Badge variant="warning">Unmatched</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              <Combobox
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
