'use client';

// KRA Branch & Compliance Tools — UI for the 9 previously-missing OSCU endpoints
// (branch admin, taxpayer info, notices, item composition, imported items). These are
// one-time/occasional admin operations, not everyday transactions, so this is a compact
// utility panel rather than a full wizard — reuses the same FormField/Card/Button
// primitives and mutation-hook pattern as the rest of the Tax & Compliance page.

import { Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { FormField } from '@/components/ui/form-field';
import {
  useEtimsBranchList,
  useEtimsNoticeList,
  useEtimsTaxpayerInfo,
  useRegisterEtimsBranchCustomer,
  useRegisterEtimsBranchUser,
  useRegisterEtimsBranchInsurance,
  useRegisterEtimsItemComposition,
  useEtimsImportedItems,
  useUpdateEtimsImportedItem,
} from '@/hooks/use-tax-etims-branch';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const inputClass = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm';

function LookupCard({
  title,
  description,
  query,
}: {
  title: string;
  description: string;
  query: { data: any; isFetching: boolean; refetch: () => void };
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setExpanded(true);
            query.refetch();
          }}
          disabled={query.isFetching}
        >
          {query.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Fetch from KRA</span>
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent>
          <pre className="max-h-64 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
            {query.isFetching ? 'Loading…' : JSON.stringify(query.data ?? {}, null, 2)}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}

export function KraBranchToolsTab({ tenantSlug }: { tenantSlug: string }) {
  const branchList = useEtimsBranchList(tenantSlug, false);
  const noticeList = useEtimsNoticeList(tenantSlug, false);
  const taxpayerInfo = useEtimsTaxpayerInfo(tenantSlug, false);

  const registerCustomer = useRegisterEtimsBranchCustomer();
  const registerUser = useRegisterEtimsBranchUser();
  const registerInsurance = useRegisterEtimsBranchInsurance();
  const registerComposition = useRegisterEtimsItemComposition();

  const [custTin, setCustTin] = useState('');
  const [custNm, setCustNm] = useState('');
  const [userId, setUserId] = useState('');
  const [userPwd, setUserPwd] = useState('');
  const [isrccCd, setIsrccCd] = useState('');
  const [isrccNm, setIsrccNm] = useState('');
  const [isrcRt, setIsrcRt] = useState('');
  const [itemCd, setItemCd] = useState('');
  const [cpstItemCd, setCpstItemCd] = useState('');
  const [cpstQty, setCpstQty] = useState('');

  const [importedExpanded, setImportedExpanded] = useState(false);
  const importedItems = useEtimsImportedItems(tenantSlug, importedExpanded);
  const updateImported = useUpdateEtimsImportedItem();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">KRA Branch &amp; Compliance Tools</h2>
        <p className="text-sm text-muted-foreground">
          One-time / occasional KRA OSCU admin operations — branch registration, taxpayer
          lookups, item composition, and imported-item processing. Everyday transactions
          (items, sales, stock) stay on the eTIMS Devices / eTIMS Items tabs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <LookupCard title="Branch List" description="Registered branches for this taxpayer at KRA." query={branchList} />
        <LookupCard title="Notices" description="Outstanding KRA notices for this taxpayer." query={noticeList} />
        <LookupCard title="Taxpayer Info" description="This taxpayer's own registration record at KRA." query={taxpayerInfo} />
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Register Branch Customer</h3>
          <p className="text-xs text-muted-foreground">Registers a known B2B customer's KRA PIN at branch level.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Customer KRA PIN">
              <input className={inputClass} value={custTin} onChange={(e) => setCustTin(e.target.value)} placeholder="A123456789Z" />
            </FormField>
            <FormField label="Customer Name">
              <input className={inputClass} value={custNm} onChange={(e) => setCustNm(e.target.value)} />
            </FormField>
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              disabled={!custTin.trim() || !custNm.trim() || registerCustomer.isPending}
              onClick={() =>
                registerCustomer.mutate(
                  { tenantSlug, body: { cust_tin: custTin.trim(), cust_nm: custNm.trim() } },
                  { onSuccess: () => { setCustTin(''); setCustNm(''); } },
                )
              }
            >
              {registerCustomer.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Register
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Register Branch User Account</h3>
          <p className="text-xs text-muted-foreground">Registers a branch operator's user account with KRA.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="User ID"><input className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)} /></FormField>
            <FormField label="Password"><input type="password" className={inputClass} value={userPwd} onChange={(e) => setUserPwd(e.target.value)} /></FormField>
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              disabled={!userId.trim() || !userPwd.trim() || registerUser.isPending}
              onClick={() =>
                registerUser.mutate(
                  { tenantSlug, body: { user_id: userId.trim(), user_nm: userId.trim(), pwd: userPwd } },
                  { onSuccess: () => { setUserId(''); setUserPwd(''); } },
                )
              }
            >
              {registerUser.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Register
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Register Branch Insurance</h3>
          <p className="text-xs text-muted-foreground">Registers the branch's insurance provider details with KRA.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Insurance Code"><input className={inputClass} value={isrccCd} onChange={(e) => setIsrccCd(e.target.value)} /></FormField>
            <FormField label="Insurance Name"><input className={inputClass} value={isrccNm} onChange={(e) => setIsrccNm(e.target.value)} /></FormField>
            <FormField label="Rate (%)"><input type="number" className={inputClass} value={isrcRt} onChange={(e) => setIsrcRt(e.target.value)} /></FormField>
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              disabled={!isrccCd.trim() || registerInsurance.isPending}
              onClick={() =>
                registerInsurance.mutate(
                  { tenantSlug, body: { isrcc_cd: isrccCd.trim(), isrcc_nm: isrccNm.trim(), isrc_rt: Number(isrcRt) || 0 } },
                  { onSuccess: () => { setIsrccCd(''); setIsrccNm(''); setIsrcRt(''); } },
                )
              }
            >
              {registerInsurance.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Register
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Item Composition</h3>
          <p className="text-xs text-muted-foreground">
            Declares a finished good's raw-material component. The component item must
            already carry KRA stock (an adjustment-in stock movement) before this call.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Finished Good itemCd"><input className={inputClass} value={itemCd} onChange={(e) => setItemCd(e.target.value)} /></FormField>
            <FormField label="Component itemCd"><input className={inputClass} value={cpstItemCd} onChange={(e) => setCpstItemCd(e.target.value)} /></FormField>
            <FormField label="Quantity"><input type="number" className={inputClass} value={cpstQty} onChange={(e) => setCpstQty(e.target.value)} /></FormField>
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              disabled={!itemCd.trim() || !cpstItemCd.trim() || !cpstQty || registerComposition.isPending}
              onClick={() =>
                registerComposition.mutate(
                  { tenantSlug, body: { item_cd: itemCd.trim(), cpst_item_cd: cpstItemCd.trim(), cpst_qty: Number(cpstQty) } },
                  { onSuccess: () => { setItemCd(''); setCpstItemCd(''); setCpstQty(''); } },
                )
              }
            >
              {registerComposition.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save Composition
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Imported Items</h3>
            <p className="text-xs text-muted-foreground">Pending customs import declarations awaiting approval.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setImportedExpanded(true); importedItems.refetch(); }}
            disabled={importedItems.isFetching}
          >
            {importedItems.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1.5">Fetch from KRA</span>
          </Button>
        </CardHeader>
        {importedExpanded && (
          <CardContent>
            <ImportedItemsList
              data={importedItems.data}
              loading={importedItems.isFetching}
              onApprove={(row) =>
                updateImported.mutate({
                  tenantSlug,
                  body: {
                    task_cd: row.taskCd, dcl_de: row.dclDe, item_seq: row.itemSeq ?? 1,
                    hs_cd: row.hsCd, item_cls_cd: row.itemClsCd, item_cd: row.itemCd,
                  },
                })
              }
              approving={updateImported.isPending}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function ImportedItemsList({
  data,
  loading,
  onApprove,
  approving,
}: {
  data: any;
  loading: boolean;
  onApprove: (row: any) => void;
  approving: boolean;
}) {
  if (loading) return <p className="text-xs text-muted-foreground">Loading…</p>;
  const rows: any[] = data?.data ?? [];
  const list = Array.isArray(rows) ? rows : (rows as any)?.itemList ?? (rows as any)?.list ?? [];
  if (!Array.isArray(list) || list.length === 0) {
    return <p className="text-xs text-muted-foreground">No pending imported items.</p>;
  }
  return (
    <div className="space-y-2">
      {list.map((row: any, i: number) => (
        <div key={row.taskCd ?? i} className="flex items-center justify-between rounded-lg border border-border/60 p-2.5 text-xs">
          <div className="space-y-0.5">
            <div className="font-mono font-medium">{row.taskCd}</div>
            <div className="text-muted-foreground">{row.itemNm ?? row.itemCd ?? 'Unnamed item'}</div>
          </div>
          <Button size="sm" variant="outline" disabled={approving} onClick={() => onApprove(row)}>
            {approving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Approve
          </Button>
        </div>
      ))}
    </div>
  );
}
