// The 23 KRA OSCU scored test cases, in the certification runbook's state-machine order
// (kra-oscu-automated-testing-runbook.md §2 / §2a) — NOT the raw Postman collection folder
// order, which KRA's own sandbox rejects if followed literally (a device must exist before
// code lists mean anything, items must exist before stock/composition, etc). This is the
// single source of truth for step order; kra_oscu_test_suite.py's ORDER list is the same
// sequence expressed for the Python script — kept in sync by hand since the two can't share
// code across the Go/Python boundary.
//
// kind:
//  - 'lookup'      : a GET with no required input — a single Run button, pass/fail from resultCd.
//  - 'lookupInput' : a GET needing one small value (a TIN, an itemCd, an invoice number).
//  - 'action'      : a POST this wizard can safely fire with sensible defaults (device init,
//                    code-list refresh) — a single Run button.
//  - 'manual'      : requires real business data entered through an existing feature page (item
//                    registration, a real sale, a real stock movement) — this wizard deliberately
//                    does NOT duplicate those forms (they already exist and are the source of
//                    truth); it links to the real page and, where a read endpoint exists, offers
//                    a Check button to verify KRA actually received it.
export type StepKind = 'lookup' | 'lookupInput' | 'action' | 'manual';

export interface WizardStep {
  id: string;
  title: string;
  kraEndpoint: string;
  kind: StepKind;
  hint: string;
  deepLinkHref?: string;
  deepLinkLabel?: string;
  /** For manual steps with no read endpoint to verify against — self-reported only, clearly labeled as such. */
  unverifiable?: boolean;
}

// kraEndpoint values use KRA's Standard-eTIMS naming - the ONLY path family the GavaConnect
// Validation Test Cases portal actually scores (runbook section 3.16.0), confirmed live: an
// identical, equally-real, but differently-named "OSCU Integrator" family exists on the same
// host and shares all backend state, but the portal's pass/fail tracking never moves for it.
// treasury-api's own kra_client.go was switched to call these same Standard-eTIMS paths
// 2026-09-17 so the real production code IS what the portal scores, not a parallel path.
export const WIZARD_STEPS: WizardStep[] = [
  { id: 'initialize', title: 'OSCU initialization', kraEndpoint: '/selectInitOsdcInfo', kind: 'action', hint: '902 "already installed" is healthy - the device stays bound to your TIN, this is not a failure.' },
  { id: 'selectCodeList', title: 'Get Code list', kraEndpoint: '/selectCodeList', kind: 'action', hint: 'Refreshes every KRA code list (classification codes, package/quantity units, tax types, etc).' },
  { id: 'selectItemClass', title: 'Get Item Classification List', kraEndpoint: '/selectItemClsList', kind: 'lookup', hint: 'The UNSPSC-style itemClsCd master list.' },
  { id: 'branchList', title: 'Branch List', kraEndpoint: '/selectBhfList', kind: 'lookup', hint: 'resultCd 001 ("no data") is a pass here, not a failure - a device may have no other registered branches.' },
  { id: 'selectNoticeList', title: 'Get notice list', kraEndpoint: '/selectNotices', kind: 'lookup', hint: 'KRA notices addressed to this taxpayer.' },
  { id: 'selectTaxpayerInfo', title: 'Get Taxpayer Info', kraEndpoint: '/selectTaxPayerInfo', kind: 'lookup', hint: "The taxpayer's own registration info as KRA has it on file." },
  {
    id: 'branchSendCustomerInfo', title: 'Send customer information', kraEndpoint: '/saveBhfCustomer', kind: 'manual',
    hint: 'Register a known customer at branch level.',
    deepLinkHref: '?tab=etims-branch-tools', deepLinkLabel: 'Go to KRA Branch Tools', unverifiable: true,
  },
  {
    id: 'branchUserAccount', title: 'Send branch user account', kraEndpoint: '/saveBhfUser', kind: 'manual',
    hint: "Register this branch's user account with KRA.",
    deepLinkHref: '?tab=etims-branch-tools', deepLinkLabel: 'Go to KRA Branch Tools', unverifiable: true,
  },
  {
    id: 'branchInsuranceInfo', title: 'Send branch insurance information', kraEndpoint: '/saveBhfInsurance', kind: 'manual',
    hint: "Register this branch's insurance details with KRA.",
    deepLinkHref: '?tab=etims-branch-tools', deepLinkLabel: 'Go to KRA Branch Tools', unverifiable: true,
  },
  {
    id: 'saveItem', title: 'Send/Save Item information', kraEndpoint: '/saveItem', kind: 'manual',
    hint: 'Register at least one finished-good item and one raw-material item (saveItemComposition below needs both) via the real Items feature.',
    deepLinkHref: '?tab=etims-items', deepLinkLabel: 'Go to eTIMS Items',
  },
  {
    id: 'insertStockIO', title: 'Send Stock Information', kraEndpoint: '/insertStockIO', kind: 'manual',
    hint: 'Record real stock-in for every item that will need stock (the raw material especially - saveItemComposition requires it to already carry stock).',
    deepLinkHref: '?tab=etims-sync', deepLinkLabel: 'Go to eTIMS Sync', unverifiable: true,
  },
  {
    id: 'saveItemComposition', title: 'Send Item Composition', kraEndpoint: '/saveItemComposition', kind: 'manual',
    hint: 'Declare the finished good’s raw-material component and quantity - the component must already carry KRA stock (previous step).',
    deepLinkHref: '?tab=etims-branch-tools', deepLinkLabel: 'Go to KRA Branch Tools', unverifiable: true,
  },
  {
    id: 'saveStockMaster', title: 'Stock Master Save Request', kraEndpoint: '/saveStockMaster', kind: 'manual',
    hint: 'Fires automatically as a side-effect right after Send Stock Information above - nothing separate to run here.',
    unverifiable: true,
  },
  {
    id: 'sendSalesTransaction', title: 'Save sales transaction information', kraEndpoint: '/saveTrnsSalesOsdc', kind: 'manual',
    hint: 'Create and transmit one real invoice for a registered item - strictly sequential invcNo, so this must be a genuine new sale.',
    deepLinkHref: '/invoices', deepLinkLabel: 'Go to Invoices',
  },
  {
    id: 'getPurchaseTransactionInfo', title: 'Get purchase transaction information', kraEndpoint: '/selectTrnsPurchaseSalesList', kind: 'manual',
    hint: 'Checks for a matching supplier sale KRA already knows about - fires automatically as part of the vendor-bill / purchase flow.',
    deepLinkHref: '/bills/new', deepLinkLabel: 'Go to Vendor Bills', unverifiable: true,
  },
  {
    id: 'sendPurchaseTransactionInfo', title: 'Send purchase transaction information', kraEndpoint: '/insertTrnsPurchase', kind: 'manual',
    hint: 'Transmit a real vendor bill / purchase as an eTIMS purchase record.',
    deepLinkHref: '/bills/new', deepLinkLabel: 'Go to Vendor Bills', unverifiable: true,
  },
  {
    id: 'importedItemInfo', title: 'Get imported item information', kraEndpoint: '/selectImportItemList', kind: 'lookupInput',
    hint: "Uses the GavaConnect session's Application Test Pin, not your own TIN (runbook section 3.7) - set it in the pre-flight box above.",
  },
  {
    id: 'importedItemConvertedInfo', title: 'Send (converted) imported item information', kraEndpoint: '/updateImportItem', kind: 'manual',
    hint: 'Approve a pending import declaration found by the previous step - needs its taskCd. Consumes the task: only run once per declaration.',
    deepLinkHref: '?tab=etims-branch-tools', deepLinkLabel: 'Go to KRA Branch Tools', unverifiable: true,
  },
  {
    id: 'itemInfo', title: 'Get Item Info', kraEndpoint: '/selectItemList', kind: 'lookup',
    hint: "The taxpayer's own items already registered at KRA.",
  },
  {
    id: 'selectInvoiceDetail', title: 'Select Invoice Details', kraEndpoint: '/selectInvoiceDetails', kind: 'lookupInput',
    hint: 'Looks up one transmitted invoice by its eTIMS invoice number (invcNo).',
  },
  {
    id: 'selectSalesTransactions', title: 'Select sales transaction', kraEndpoint: '/selectTrnsSalesList', kind: 'lookup',
    hint: 'Confirms the sale from Save sales transaction information above actually reached KRA.',
  },
  {
    id: 'customerPinInfo', title: 'Get Customer PIN Info', kraEndpoint: '/selectCustomerList', kind: 'lookupInput',
    hint: "Looks up a customer's KRA registration by PIN - KRA's own proven call for this case sends no separate PIN filter, so it may return the branch's whole customer list rather than one match.",
  },
  {
    id: 'selectStockMoveLists', title: 'get MoveList', kraEndpoint: '/selectStockMoveList', kind: 'lookup',
    hint: 'The stock movement list KRA has recorded for this branch.',
  },
];
