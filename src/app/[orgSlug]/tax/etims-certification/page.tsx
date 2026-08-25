'use client';

// KRA eTIMS OSCU certification wizard — steps a tenant admin through all 23 scored test cases
// in the runbook's state-machine order (steps.ts), auto-advancing once the active step passes.
// Every step calls a REAL business endpoint (the same ones the rest of Tax & Compliance already
// uses) — this page never duplicates a form that exists elsewhere; steps needing real business
// data (item registration, a real sale, a real stock movement) link to that existing feature and
// verify against a read endpoint where one exists, per kra-etims-status-and-history.md §8b.

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import { useResolvedTenant } from '@/hooks/use-resolved-tenant';
import { useEtimsDevices, useInitEtimsDevice, useRefreshCodeLists } from '@/hooks/use-tax';
import { useEtimsBranchList, useEtimsNoticeList, useEtimsTaxpayerInfo } from '@/hooks/use-tax-etims-branch';
import {
  useEtimsCustomerPinInfo,
  useEtimsItemClassList,
  useEtimsItemInfo,
  useEtimsSalesTransactionsCheck,
  useEtimsStockMoveList,
} from '@/hooks/use-tax-etims-wizard';
import * as taxApi from '@/lib/api/tax';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { WIZARD_STEPS } from './steps';

type StepStatus = 'idle' | 'running' | 'pass' | 'fail';

function isPassResultCd(code: string | undefined): boolean {
  return code === '000' || code === '0000' || code === '001';
}

const jsonBoxClass = 'max-h-56 overflow-auto rounded-lg bg-muted/40 p-3 text-xs';
const inputClass = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm';

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'fail') return <XCircle className="h-4 w-4 text-destructive" />;
  return <span className="h-4 w-4 rounded-full border border-border" />;
}

// A step whose result is a plain KraOscuLookupResult — shared body for every 'lookup' /
// 'lookupInput' step so the pass/fail wiring (resultCd -> status callback) lives in one place.
function LookupStepBody({
  description,
  query,
  onResult,
  inputLabel,
  inputValue,
  onInputChange,
  inputPlaceholder,
}: {
  description: string;
  query: { data: any; isFetching: boolean; refetch: () => Promise<{ data?: any; isError: boolean }> };
  onResult: (status: StepStatus) => void;
  inputLabel?: string;
  inputValue?: string;
  onInputChange?: (v: string) => void;
  inputPlaceholder?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>
      {inputLabel && (
        <FormField label={inputLabel}>
          <input
            type="text"
            value={inputValue ?? ''}
            onChange={(e) => onInputChange?.(e.target.value)}
            placeholder={inputPlaceholder}
            className={inputClass}
          />
        </FormField>
      )}
      <Button
        onClick={async () => {
          onResult('running');
          const r = await query.refetch();
          const code = (r.data as any)?.resultCd ?? (r.data as any)?.result_cd;
          onResult(r.isError ? 'fail' : isPassResultCd(code) ? 'pass' : 'fail');
        }}
        disabled={query.isFetching || (inputLabel != null && !inputValue)}
      >
        {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Run
      </Button>
      {query.data != null && (
        <pre className={jsonBoxClass}>{JSON.stringify(query.data, null, 2)}</pre>
      )}
    </div>
  );
}

function ManualStepBody({
  hint,
  deepLinkHref,
  deepLinkLabel,
  orgSlug,
  unverifiable,
  onCheck,
  checkLabel,
  checkResult,
}: {
  hint: string;
  deepLinkHref?: string;
  deepLinkLabel?: string;
  orgSlug: string;
  unverifiable?: boolean;
  onCheck?: () => void;
  checkLabel?: string;
  checkResult?: { status: StepStatus; data?: any };
}) {
  const href = deepLinkHref?.startsWith('?') ? `/${orgSlug}/tax${deepLinkHref}` : deepLinkHref ? `/${orgSlug}${deepLinkHref}` : undefined;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap items-center gap-2">
        {href && (
          <Link href={href} target="_blank">
            <Button variant="outline">
              <ExternalLink className="h-4 w-4" />
              {deepLinkLabel ?? 'Open'}
            </Button>
          </Link>
        )}
        {onCheck && (
          <Button onClick={onCheck} disabled={checkResult?.status === 'running'}>
            {checkResult?.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {checkLabel ?? 'Check'}
          </Button>
        )}
      </div>
      {unverifiable && (
        <p className="text-xs text-muted-foreground">
          No KRA read endpoint exists to verify this one automatically — mark it done yourself once
          you&apos;ve completed it on the linked page.
        </p>
      )}
      {checkResult?.data != null && <pre className={jsonBoxClass}>{JSON.stringify(checkResult.data, null, 2)}</pre>}
    </div>
  );
}

export default function EtimsCertificationPage() {
  const { tenantPathId, isPlatformOwner, tenantQueryParam, orgSlug } = useResolvedTenant();
  const tenantSlug = isPlatformOwner ? (tenantQueryParam ?? orgSlug) : tenantPathId;

  const [current, setCurrent] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({});
  const [testPin, setTestPin] = useState('');
  const [custPinInput, setCustPinInput] = useState('');
  const [invcNoInput, setInvcNoInput] = useState('');

  const step = WIZARD_STEPS[current];
  const setStatus = (id: string, status: StepStatus) => {
    setStatuses((s) => ({ ...s, [id]: status }));
    if (status === 'pass' && current < WIZARD_STEPS.length - 1) {
      setTimeout(() => setCurrent((c) => (WIZARD_STEPS[c].id === id ? c + 1 : c)), 500);
    }
  };

  const devicesQuery = useEtimsDevices(tenantSlug);
  const devices = devicesQuery.data?.devices ?? [];
  const activeDevice = devices.find((d) => d.status === 'active') ?? devices[0];

  const initDevice = useInitEtimsDevice();
  const refreshCodeLists = useRefreshCodeLists();
  const itemClassList = useEtimsItemClassList(tenantSlug);
  const branchList = useEtimsBranchList(tenantSlug, false);
  const noticeList = useEtimsNoticeList(tenantSlug, false);
  const taxpayerInfo = useEtimsTaxpayerInfo(tenantSlug, false);
  const itemInfo = useEtimsItemInfo(tenantSlug);
  const stockMoveList = useEtimsStockMoveList(tenantSlug);
  const salesTransactions = useEtimsSalesTransactionsCheck(tenantSlug);
  const customerPinInfo = useEtimsCustomerPinInfo(tenantSlug, custPinInput);
  const importedItems = useQuery({
    queryKey: ['etims-imported-items-wizard', tenantSlug, testPin],
    queryFn: () => taxApi.getEtimsImportedItems(tenantSlug, testPin),
    enabled: false,
  });
  const invoiceDetail = useQuery({
    queryKey: ['etims-invoice-detail-wizard', tenantSlug, invcNoInput],
    queryFn: () => taxApi.getEtimsInvoiceDetail(tenantSlug, invcNoInput),
    enabled: false,
  });

  const passCount = WIZARD_STEPS.filter((s) => statuses[s.id] === 'pass').length;

  function renderStepBody() {
    switch (step.id) {
      case 'initialize':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Initializes {activeDevice ? <span className="font-mono">{activeDevice.device_serial}</span> : 'the active device'} against KRA. A
              <span className="font-mono"> 902</span> response ("already installed") is healthy, not a failure.
            </p>
            <Button
              onClick={() => {
                if (!activeDevice) return;
                setStatus('initialize', 'running');
                initDevice.mutate(
                  { tenantSlug, deviceId: activeDevice.id },
                  { onSuccess: () => setStatus('initialize', 'pass'), onError: () => setStatus('initialize', 'fail') },
                );
              }}
              disabled={!activeDevice || initDevice.isPending}
            >
              {initDevice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run
            </Button>
            {!activeDevice && <p className="text-xs text-destructive">No eTIMS device found — register one on the eTIMS Devices tab first.</p>}
          </div>
        );
      case 'selectCodeList':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Refreshes every KRA code list this tenant uses.</p>
            <Button
              onClick={() => {
                setStatus('selectCodeList', 'running');
                refreshCodeLists.mutate(
                  { tenantSlug },
                  { onSuccess: () => setStatus('selectCodeList', 'pass'), onError: () => setStatus('selectCodeList', 'fail') },
                );
              }}
              disabled={refreshCodeLists.isPending}
            >
              {refreshCodeLists.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run
            </Button>
          </div>
        );
      case 'selectItemClass':
        return <LookupStepBody description={step.hint} query={itemClassList} onResult={(s) => setStatus(step.id, s)} />;
      case 'branchList':
        return <LookupStepBody description={step.hint} query={branchList} onResult={(s) => setStatus(step.id, s)} />;
      case 'selectNoticeList':
        return <LookupStepBody description={step.hint} query={noticeList} onResult={(s) => setStatus(step.id, s)} />;
      case 'selectTaxpayerInfo':
        return <LookupStepBody description={step.hint} query={taxpayerInfo} onResult={(s) => setStatus(step.id, s)} />;
      case 'itemInfo':
        return <LookupStepBody description={step.hint} query={itemInfo} onResult={(s) => setStatus(step.id, s)} />;
      case 'selectStockMoveLists':
        return <LookupStepBody description={step.hint} query={stockMoveList} onResult={(s) => setStatus(step.id, s)} />;
      case 'selectSalesTransactions':
        return <LookupStepBody description={step.hint} query={salesTransactions} onResult={(s) => setStatus(step.id, s)} />;
      case 'customerPinInfo':
        return (
          <LookupStepBody
            description={step.hint}
            query={customerPinInfo}
            onResult={(s) => setStatus(step.id, s)}
            inputLabel="Customer KRA PIN"
            inputValue={custPinInput}
            onInputChange={setCustPinInput}
            inputPlaceholder="e.g. P051234567X"
          />
        );
      case 'selectInvoiceDetail':
        return (
          <LookupStepBody
            description={step.hint}
            query={invoiceDetail}
            onResult={(s) => setStatus(step.id, s)}
            inputLabel="eTIMS invoice number (invcNo)"
            inputValue={invcNoInput}
            onInputChange={setInvcNoInput}
            inputPlaceholder="e.g. 42"
          />
        );
      case 'importedItemInfo':
        return (
          <LookupStepBody
            description={step.hint}
            query={importedItems}
            onResult={(s) => setStatus(step.id, s)}
            inputLabel="Application Test Pin (from the GavaConnect session, not your own TIN)"
            inputValue={testPin}
            onInputChange={setTestPin}
            inputPlaceholder="e.g. P052543168K"
          />
        );
      case 'saveItem':
        return (
          <ManualStepBody
            hint={step.hint}
            deepLinkHref={step.deepLinkHref}
            deepLinkLabel={step.deepLinkLabel}
            orgSlug={orgSlug}
            onCheck={async () => {
              setStatus('saveItem', 'running');
              const r = await itemInfo.refetch();
              setStatus('saveItem', r.isError ? 'fail' : isPassResultCd((r.data as any)?.resultCd) ? 'pass' : 'fail');
            }}
            checkLabel="Check (Get Item Info)"
            checkResult={{ status: statuses.saveItem ?? 'idle', data: itemInfo.data }}
          />
        );
      case 'sendSalesTransaction':
        return (
          <ManualStepBody
            hint={step.hint}
            deepLinkHref={step.deepLinkHref}
            deepLinkLabel={step.deepLinkLabel}
            orgSlug={orgSlug}
            onCheck={async () => {
              setStatus('sendSalesTransaction', 'running');
              const r = await salesTransactions.refetch();
              setStatus('sendSalesTransaction', r.isError ? 'fail' : isPassResultCd((r.data as any)?.resultCd) ? 'pass' : 'fail');
            }}
            checkLabel="Check (Select sales transaction)"
            checkResult={{ status: statuses.sendSalesTransaction ?? 'idle', data: salesTransactions.data }}
          />
        );
      default:
        return (
          <ManualStepBody
            hint={step.hint}
            deepLinkHref={step.deepLinkHref}
            deepLinkLabel={step.deepLinkLabel}
            orgSlug={orgSlug}
            unverifiable={step.unverifiable}
          />
        );
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold">KRA eTIMS Certification Wizard</h1>
        <p className="text-sm text-muted-foreground">
          Steps through all 23 scored OSCU test cases in KRA&apos;s required order. {passCount}/{WIZARD_STEPS.length} passed this run.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Before you start</h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. On developer.go.ke, open <span className="font-medium text-foreground">My Apps → your OSCU app → Validation</span> and start a
            new Automated Testing session — note its <span className="font-medium text-foreground">Apigee App ID</span> and{' '}
            <span className="font-medium text-foreground">Application Test Pin</span>.
          </p>
          <p>
            2. Push the session&apos;s Apigee App ID into platform settings via{' '}
            <span className="font-medium text-foreground">Platform → Gateways &amp; Secrets</span> before running any step below — early
            calls won&apos;t attribute to the scored session otherwise.
          </p>
          <p>3. Enter the Application Test Pin where a step below asks for it (used for imported-item lookups, per KRA&apos;s own requirement).</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <div className="space-y-1">
          {WIZARD_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrent(i)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                i === current ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <StatusIcon status={statuses[s.id] ?? 'idle'} />
              <span className="truncate">{i + 1}. {s.title}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">
                {current + 1}. {step.title}
              </h2>
              <p className="font-mono text-xs text-muted-foreground">{step.kraEndpoint}</p>
            </div>
            <Badge variant={statuses[step.id] === 'pass' ? 'success' : statuses[step.id] === 'fail' ? 'error' : 'secondary'}>
              {statuses[step.id] ?? 'idle'}
            </Badge>
          </CardHeader>
          <CardContent>{renderStepBody()}</CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" onClick={() => setCurrent((c) => Math.min(WIZARD_STEPS.length - 1, c + 1))} disabled={current === WIZARD_STEPS.length - 1}>
          Skip
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
