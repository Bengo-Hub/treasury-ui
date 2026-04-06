'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
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
  const { tenantPathId } = useResolvedTenant();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
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
          <BankAccountsTab tenantSlug={tenantPathId} />
        </TabsContent>
        <TabsContent value="statements" className="mt-6">
          <StatementsTab tenantSlug={tenantPathId} />
        </TabsContent>
        <TabsContent value="reconcile" className="mt-6">
          <ReconcileTab tenantSlug={tenantPathId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Bank Accounts
// ---------------------------------------------------------------------------

function BankAccountsTab({ tenantSlug }: { tenantSlug: string }) {
  const { data, isLoading } = useBankAccounts(tenantSlug);
  const createMutation = useCreateBankAccount(tenantSlug);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    currency: 'KES',
  });

  const accounts = data?.accounts ?? [];

  function handleCreate() {
    createMutation.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ account_name: '', bank_name: '', account_number: '', currency: 'KES' });
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
            <FormField label="Account Name" required>
              <input
                className={inputClasses}
                placeholder="e.g. Operating Account"
                value={form.account_name}
                onChange={(e) => setForm((p) => ({ ...p, account_name: e.target.value }))}
              />
            </FormField>
            <FormField label="Bank Name" required>
              <input
                className={inputClasses}
                placeholder="e.g. KCB Bank"
                value={form.bank_name}
                onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
              />
            </FormField>
            <FormField label="Account Number" required>
              <input
                className={inputClasses}
                placeholder="e.g. 1234567890"
                value={form.account_number}
                onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
              />
            </FormField>
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
  const { data: unreconciledData, isLoading } = useUnreconciled(tenantSlug);
  const autoReconcileMutation = useAutoReconcile(tenantSlug);
  const manualMatchMutation = useManualMatch(tenantSlug);

  const [selectedLine, setSelectedLine] = useState<StatementLine | null>(null);
  const [matchTransactionId, setMatchTransactionId] = useState('');
  const [statementIdForAuto, setStatementIdForAuto] = useState('');

  const lines = unreconciledData?.lines ?? [];

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
            <FormField label="Statement ID" className="flex-1">
              <input
                className={inputClasses}
                placeholder="Paste statement ID from import..."
                value={statementIdForAuto}
                onChange={(e) => setStatementIdForAuto(e.target.value)}
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

            <FormField label="Ledger Transaction ID" required>
              <input
                className={inputClasses}
                placeholder="Paste the ledger transaction UUID..."
                value={matchTransactionId}
                onChange={(e) => setMatchTransactionId(e.target.value)}
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
