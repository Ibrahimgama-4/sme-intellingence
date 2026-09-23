'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload as UploadIcon, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parseUploadedFile, type ParsedFile } from '@/lib/analytics/fileParsing';
import { suggestColumnMapping, missingRequiredFields } from '@/lib/analytics/columnMapping';
import { validateRows } from '@/lib/analytics/validation';
import type { DataMapping, DataQualityReport, TargetField } from '@/types/domain';

type Step = 'upload' | 'mapping' | 'validation' | 'saving' | 'done';

const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  transaction_date: 'Transaction Date', product: 'Product', product_id: 'Product ID',
  category: 'Category', quantity: 'Quantity', unit_price: 'Unit Price', revenue: 'Revenue',
  cost_price: 'Cost Price', profit: 'Profit', expense_category: 'Expense Category',
  expense_amount: 'Expense Amount', customer: 'Customer', supplier: 'Supplier',
  location: 'Location', ignore: 'Ignore this column'
};

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>('upload');
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<DataMapping[]>([]);
  const [quality, setQuality] = useState<DataQualityReport | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setFileError(null);
    try {
      const result = await parseUploadedFile(file);
      setParsed(result);
      setMapping(suggestColumnMapping(result.headers));
      setStep('mapping');
    } catch (err: any) {
      setFileError(err.message ?? 'Could not read this file. Please check the format and try again.');
    }
  }

  function updateMapping(sourceColumn: string, target: TargetField) {
    setMapping((prev) => prev.map((m) => (m.source_column === sourceColumn ? { ...m, target_field: target } : m)));
  }

  function proceedToValidation() {
    if (!parsed) return;
    const missing = missingRequiredFields(mapping);
    if (missing.length > 0) {
      setFileError(`Please map a column for: ${missing.map((f) => TARGET_FIELD_LABELS[f]).join(', ')}.`);
      return;
    }
    setFileError(null);
    const report = validateRows(parsed.rows, mapping);
    setQuality(report);
    setStep('validation');
  }

  async function confirmAndSave() {
    if (!parsed || !quality) return;
    setStep('saving');
    setSaveError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push('/login'); return; }

    const { data: businesses } = await supabase.from('businesses').select('id').eq('owner_id', userData.user.id).limit(1);
    const businessId = businesses?.[0]?.id;
    if (!businessId) { setSaveError('No business found — please complete onboarding first.'); setStep('validation'); return; }

    const { data: upload, error: uploadError } = await supabase.from('uploads').insert({
      business_id: businessId,
      file_name: 'uploaded-file',
      file_type: parsed.fileType,
      row_count: parsed.rows.length,
      status: 'processed',
      data_quality_score: quality.score
    }).select().single();

    if (uploadError || !upload) { setSaveError(uploadError?.message ?? 'Failed to save upload record.'); setStep('validation'); return; }

    const get = (row: Record<string, any>, field: TargetField) => {
      const col = mapping.find((m) => m.target_field === field)?.source_column;
      return col ? row[col] : undefined;
    };

    const isExpenseFile = mapping.some((m) => m.target_field === 'expense_amount');

    if (isExpenseFile) {
      const expenseRows = parsed.rows.map((row) => {
        const amount = Number(get(row, 'expense_amount'));
        const dateVal = get(row, 'transaction_date');
        if (!dateVal || isNaN(amount)) return null;
        return {
          business_id: businessId,
          upload_id: upload.id,
          expense_date: new Date(dateVal).toISOString().slice(0, 10),
          category: (String(get(row, 'expense_category') ?? 'other').toLowerCase() as any) || 'other',
          amount
        };
      }).filter(Boolean);
      if (expenseRows.length > 0) await supabase.from('expenses').insert(expenseRows as any);
    } else {
      const salesRows = parsed.rows.map((row) => {
        const dateVal = get(row, 'transaction_date');
        const revenueVal = get(row, 'revenue');
        if (!dateVal || revenueVal === undefined || revenueVal === null) return null;
        const quantity = Number(get(row, 'quantity') ?? 1) || 1;
        const unitPrice = Number(get(row, 'unit_price') ?? (Number(revenueVal) / quantity)) || 0;
        return {
          business_id: businessId,
          upload_id: upload.id,
          transaction_date: new Date(dateVal).toISOString().slice(0, 10),
          product_name: get(row, 'product') ? String(get(row, 'product')) : null,
          category: get(row, 'category') ? String(get(row, 'category')) : null,
          quantity,
          unit_price: unitPrice,
          cost_price: get(row, 'cost_price') ? Number(get(row, 'cost_price')) : null,
          revenue: Number(revenueVal),
          location: get(row, 'location') ? String(get(row, 'location')) : null
        };
      }).filter(Boolean);

      // Insert in batches of 500 to stay well under typical request size limits.
      for (let i = 0; i < salesRows.length; i += 500) {
        const batch = salesRows.slice(i, i + 500);
        const { error } = await supabase.from('sales').insert(batch as any);
        if (error) { setSaveError(error.message); setStep('validation'); return; }
      }
    }

    // Clear cached dashboard metrics so the very next dashboard load
    // recomputes from the data we just imported, rather than waiting on
    // the created_at freshness check to catch up.
    try {
      await fetch('/api/analytics/invalidate', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Non-fatal — the freshness check in /api/analytics/dashboard will
      // still catch this on the next load, just with one extra query.
    }

    setStep('done');
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Upload your business data</h1>
      <p className="text-sm text-ink/60 mt-1">CSV or Excel (.xlsx). We'll detect your columns automatically — you can correct anything before it's saved.</p>

      <StepIndicator step={step} />

      {step === 'upload' && (
        <label className="mt-8 flex flex-col items-center justify-center border-2 border-dashed border-forest-900/20 rounded-xl2 p-12 cursor-pointer hover:border-forest-500 transition-colors bg-white">
          <UploadIcon className="text-forest-500" size={32} />
          <span className="mt-3 font-medium text-forest-900">Click to select a file, or drag it here</span>
          <span className="text-xs text-ink/50 mt-1">.csv or .xlsx, up to 50,000 rows</span>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      )}
      {fileError && step === 'upload' && <p className="text-sm text-risk mt-3">{fileError}</p>}

      {step === 'mapping' && parsed && (
        <div className="mt-8 bg-white rounded-xl2 border border-forest-900/8 p-5">
          <h2 className="font-display font-semibold text-forest-900">Confirm your column mapping</h2>
          <p className="text-sm text-ink/60 mt-1">We matched these automatically. Adjust any that look wrong.</p>
          <div className="mt-5 space-y-3">
            {mapping.map((m) => (
              <div key={m.source_column} className="flex items-center gap-4">
                <div className="w-1/2 text-sm text-ink/80 truncate">{m.source_column}</div>
                <span className="text-ink/30">→</span>
                <select
                  value={m.target_field}
                  onChange={(e) => updateMapping(m.source_column, e.target.value as TargetField)}
                  className="flex-1 rounded-lg border border-forest-900/15 px-3 py-2 text-sm bg-white outline-none focus:border-forest-500"
                >
                  {(Object.keys(TARGET_FIELD_LABELS) as TargetField[]).map((f) => (
                    <option key={f} value={f}>{TARGET_FIELD_LABELS[f]}</option>
                  ))}
                </select>
                {m.confidence !== undefined && m.confidence < 0.5 && (
                  <span title="Low-confidence match — please check" className="text-amber-500"><AlertTriangle size={16} /></span>
                )}
              </div>
            ))}
          </div>
          {fileError && <p className="text-sm text-risk mt-4">{fileError}</p>}
          <button onClick={proceedToValidation} className="mt-6 bg-forest-500 text-paper px-5 py-2.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">
            Continue to validation
          </button>
        </div>
      )}

      {step === 'validation' && quality && (
        <div className="mt-8 bg-white rounded-xl2 border border-forest-900/8 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-forest-900">Data quality report</h2>
            <div className={`font-display text-2xl font-semibold ${quality.score >= 80 ? 'text-forest-600' : quality.score >= 50 ? 'text-amber-500' : 'text-risk'}`}>
              {quality.score}%
            </div>
          </div>
          <p className="text-sm text-ink/60 mt-1">{quality.totalRows.toLocaleString()} rows found.</p>

          <div className="mt-5 space-y-2">
            {quality.issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-forest-600"><CheckCircle2 size={16} /> No issues detected.</div>
            ) : quality.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {issue.severity === 'high' ? <XCircle size={16} className="text-risk mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />}
                <span className="text-ink/70">{issue.message}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-ink/50 mt-5">
            We never silently modify your financial data. Rows with issues will still be imported as-is — review and clean the source file if needed, then re-upload.
          </p>

          {saveError && <p className="text-sm text-risk mt-3">{saveError}</p>}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep('mapping')} className="px-5 py-2.5 rounded-lg font-medium border border-forest-900/15 hover:bg-forest-50 transition-colors">
              Back
            </button>
            <button onClick={confirmAndSave} className="bg-forest-500 text-paper px-5 py-2.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">
              Import {quality.totalRows.toLocaleString()} rows
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div className="mt-8 text-center text-ink/60">Importing your data…</div>
      )}

      {step === 'done' && (
        <div className="mt-8 bg-white rounded-xl2 border border-forest-900/8 p-8 text-center">
          <CheckCircle2 className="text-forest-500 mx-auto" size={36} />
          <h2 className="font-display font-semibold text-forest-900 mt-3">Your data has been imported</h2>
          <p className="text-sm text-ink/60 mt-1">Your dashboard is ready.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-5 bg-forest-500 text-paper px-5 py-2.5 rounded-lg font-medium hover:bg-forest-600 transition-colors">
            Go to dashboard
          </button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload' }, { key: 'mapping', label: 'Map columns' },
    { key: 'validation', label: 'Validate' }, { key: 'done', label: 'Done' }
  ];
  const activeIndex = steps.findIndex((s) => s.key === step || (step === 'saving' && s.key === 'validation'));
  return (
    <div className="flex items-center gap-2 mt-6 text-xs">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${i <= activeIndex ? 'bg-forest-500 text-paper' : 'bg-forest-900/10 text-ink/40'}`}>
            {i + 1}
          </span>
          <span className={i <= activeIndex ? 'text-forest-900' : 'text-ink/40'}>{s.label}</span>
          {i < steps.length - 1 && <span className="w-6 h-px bg-forest-900/15 mx-1" />}
        </div>
      ))}
    </div>
  );
}
