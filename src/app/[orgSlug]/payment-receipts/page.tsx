'use client';

import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Paperclip,
  PenLine,
  Phone,
  Play,
  Plus,
  Receipt,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const DEMO_VIDEO_URL = 'https://youtu.be/R7Z8w1eXXXs?si=dL4yAC7MOtQji163';

type View = 'empty' | 'form';
type PaymentType = 'receipt' | 'advance';
type Section = 'client' | 'records' | 'invoices';

export default function PaymentReceiptsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? '';

  const [view, setView] = useState<View>('empty');
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PaymentType>('receipt');
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    client: true,
    records: true,
    invoices: true,
  });

  const toggleSection = (s: Section) =>
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));

  const handleOpenTypeModal = () => setTypeModalOpen(true);

  const handleSubmitType = () => {
    setTypeModalOpen(false);
    setView('form');
  };

  if (view === 'form') {
    return (
      <PaymentReceiptForm
        orgSlug={orgSlug}
        paymentType={selectedType}
        openSections={openSections}
        onToggleSection={toggleSection}
        onBack={() => setView('empty')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href={`/${orgSlug}`}
            className="hover:text-slate-900 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-900">Payment Receipts</span>
        </div>

        <div className="flex items-center justify-center py-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Payment Receipts
              </h2>
              <p className="mt-3 text-sm text-slate-500">
                Create, edit and share receipt for the payment received from
                the clients.
              </p>
            </div>

            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative mt-8 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 transition-shadow hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-slate-900/30 transition-colors group-hover:bg-slate-900/10" />
              <div className="relative flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110">
                  <Play
                    className="h-6 w-6 translate-x-0.5 fill-slate-900 text-slate-900"
                  />
                </div>
                <span className="text-sm font-semibold text-white">
                  Watch Demo Video
                </span>
              </div>
            </a>

            <button
              type="button"
              onClick={handleOpenTypeModal}
              className="mt-8 w-full rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Create First Payment Receipt
            </button>
          </div>
        </div>
      </div>

      {typeModalOpen && (
        <PaymentTypeModal
          selectedType={selectedType}
          onSelect={setSelectedType}
          onClose={() => setTypeModalOpen(false)}
          onSubmit={handleSubmitType}
        />
      )}
    </div>
  );
}

function PaymentTypeModal({
  selectedType,
  onSelect,
  onClose,
  onSubmit,
}: {
  selectedType: PaymentType;
  onSelect: (t: PaymentType) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900">Record New Payment</h3>

        <p className="mt-6 text-center text-sm font-medium text-slate-700">
          Which Payment would you like to record?
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelect('receipt')}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
              selectedType === 'receipt'
                ? 'border-slate-900 bg-slate-900/5'
                : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50',
            )}
          >
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
                selectedType === 'receipt'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700',
              )}
            >
              <Receipt className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              Payment Receipt
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect('advance')}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
              selectedType === 'advance'
                ? 'border-slate-900 bg-slate-900/5'
                : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50',
            )}
          >
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
                selectedType === 'advance'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700',
              )}
            >
              <User className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-900">
              Client Advance
            </span>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentReceiptForm({
  orgSlug,
  paymentType,
  openSections,
  onToggleSection,
  onBack,
}: {
  orgSlug: string;
  paymentType: PaymentType;
  openSections: Record<Section, boolean>;
  onToggleSection: (s: Section) => void;
  onBack: () => void;
}) {
  const [receiptNo, setReceiptNo] = useState('A00001');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [receiptDate, setReceiptDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [currency, setCurrency] = useState('KES');
  const [numberFormat, setNumberFormat] = useState('');

  const title = useMemo(
    () => (paymentType === 'advance' ? 'New Client Advance' : 'New Payment Receipt'),
    [paymentType],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href={`/${orgSlug}`}
            className="hover:text-slate-900 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <button
            type="button"
            onClick={onBack}
            className="hover:text-slate-900 transition-colors"
          >
            Payment Receipts
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-900">{title}</span>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        </div>

        <FormSection
          number={1}
          title="Select Client"
          open={openSections.client}
          onToggle={() => onToggleSection('client')}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field label="Payment Receipt No" required>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </Field>

            <Field label="Payment Received From" required>
              <div className="relative">
                <select
                  value={receivedFrom}
                  onChange={(e) => setReceivedFrom(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">Select...</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </Field>

            <Field label="Receipt Date" required>
              <div className="relative">
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </Field>

            <Field label="Currency" required>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </Field>

            <Field label="Number and Currency Format">
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-500">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  123
                </span>
                <input
                  type="text"
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value)}
                  placeholder="Number and Currency Format"
                  className="flex-1 border-none bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </Field>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="rounded-lg bg-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-300"
              disabled={!receivedFrom}
            >
              Continue
            </button>
          </div>
        </FormSection>

        <FormSection
          number={2}
          title="Add Payment Records"
          open={openSections.records}
          onToggle={() => onToggleSection('records')}
        >
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <Th>Deposited To</Th>
                  <Th>Payment Method</Th>
                  <Th>Ref. ID</Th>
                  <Th align="right">Amount Received</Th>
                  <Th align="right">Txn Charges</Th>
                  <Th>Tags</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm font-semibold text-slate-900">
                        Record Payments
                      </p>
                      <p className="text-xs text-slate-500">
                        Record multiple payments against multiple Invoices
                      </p>
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Payment Record
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="rounded-lg bg-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-300"
              disabled
            >
              Continue
            </button>
          </div>
        </FormSection>

        <FormSection
          number={3}
          title="Settle Unpaid Invoices"
          open={openSections.invoices}
          onToggle={() => onToggleSection('invoices')}
        >
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-sm">
                <FileText className="h-7 w-7 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                No unpaid Invoices found
              </p>
              <p className="max-w-md text-xs text-slate-500">
                There are no unpaid Invoices against this client. This payment
                will be recorded as advance payment.
              </p>
              <Link
                href={`/${orgSlug}/customers`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                See Client Statement
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-md">
            <AdditionalAction icon={FileText} label="Add Notes" />
            <AdditionalAction icon={Phone} label="Add Contact Details" />
            <AdditionalAction icon={FileText} label="Add Additional Info" />
            <AdditionalAction icon={PenLine} label="Add Signature" />
            <AdditionalAction icon={Paperclip} label="Add Attachments" />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Save & Continue
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-900 bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Save & Create New
            </button>
            <button
              type="button"
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Save as draft
            </button>
          </div>
        </FormSection>
      </div>
    </div>
  );
}

function FormSection({
  number,
  title,
  open,
  onToggle,
  children,
}: {
  number: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <h2 className="text-lg font-bold text-slate-900">
          {number}. {title}
        </h2>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        )}
      </button>
      {open && (
        <div className="border-t border-slate-200 px-6 py-6">{children}</div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={cn(
        'px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  );
}

function AdditionalAction({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-slate-700" />
      {label}
    </button>
  );
}
