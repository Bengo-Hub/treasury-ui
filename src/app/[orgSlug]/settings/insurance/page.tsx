'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, Badge } from '@/components/ui/base';
import { Input, Select, Textarea } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import {
  useInsuranceProviders,
  useCreateInsuranceProvider,
  useConnectorConfig,
  useUpsertConnectorConfig,
  useTestConnection,
} from '@/hooks/use-insurance';
import type { InsuranceProvider, ConnectorOperationPaths } from '@/lib/api/insurance';
import { toast } from 'sonner';
import { Loader2, Plus, Plug, PlayCircle, ShieldCheck } from 'lucide-react';

const OPERATION_FIELDS: { key: keyof ConnectorOperationPaths; label: string }[] = [
  { key: 'token_path', label: 'Token Endpoint' },
  { key: 'patient_registry_path', label: 'Patient Registry' },
  { key: 'facility_registry_path', label: 'Facility Registry' },
  { key: 'practitioner_registry_path', label: 'Practitioner Registry' },
  { key: 'eligibility_path', label: 'Eligibility' },
  { key: 'preauth_path', label: 'Pre-Authorization' },
  { key: 'claim_submit_path', label: 'Claim Submit' },
  { key: 'claim_status_path', label: 'Claim Status' },
  { key: 'remittance_path', label: 'Remittance' },
];

const TEST_OPERATIONS = ['eligibility', 'patient_registry', 'facility_registry', 'practitioner_registry', 'claim_submit', 'claim_status'];

function NewProviderForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [payerCode, setPayerCode] = useState('');
  const create = useCreateInsuranceProvider();

  const submit = async () => {
    if (!name.trim()) return;
    try {
      const p = await create.mutateAsync({ name, payer_id_code: payerCode || undefined });
      toast.success(`Provider "${p.name}" created`);
      setName('');
      setPayerCode('');
      onCreated(p.id);
    } catch (e) {
      toast.error('Failed to create provider');
    }
  };

  return (
    <div className="flex items-end gap-2">
      <FormField label="Provider name" className="flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SHA, AAR, Jubilee" />
      </FormField>
      <FormField label="Payer code" className="w-32">
        <Input value={payerCode} onChange={(e) => setPayerCode(e.target.value)} placeholder="optional" />
      </FormField>
      <Button onClick={submit} disabled={create.isPending || !name.trim()}>
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add
      </Button>
    </div>
  );
}

function ConnectorEditor({ provider }: { provider: InsuranceProvider }) {
  const { data: cfg, isLoading } = useConnectorConfig(provider.id);
  const upsert = useUpsertConnectorConfig(provider.id);
  const test = useTestConnection(provider.id);

  const [authType, setAuthType] = useState('bearer_static');
  const [baseUrl, setBaseUrl] = useState('');
  const [agentId, setAgentId] = useState('');
  const [paths, setPaths] = useState<ConnectorOperationPaths>({});
  const [credentialsJSON, setCredentialsJSON] = useState('{}');
  const [requestTemplateJSON, setRequestTemplateJSON] = useState('{}');
  const [responseMappingJSON, setResponseMappingJSON] = useState('{}');
  const [testOperation, setTestOperation] = useState('eligibility');
  const [sampleJSON, setSampleJSON] = useState('{"coverage.member_id": "M12345"}');
  const [hydrated, setHydrated] = useState(false);

  if (cfg && !hydrated) {
    setAuthType(cfg.auth_type);
    setBaseUrl(cfg.base_url);
    setAgentId(cfg.agent_identifier ?? '');
    setPaths(cfg);
    setRequestTemplateJSON(JSON.stringify(cfg.request_template ?? {}, null, 2));
    setResponseMappingJSON(JSON.stringify(cfg.response_mapping ?? {}, null, 2));
    setHydrated(true);
  }

  const save = async () => {
    let credentials: Record<string, string> | undefined;
    let requestTemplate: Record<string, unknown>;
    let responseMapping: Record<string, unknown>;
    try {
      credentials = credentialsJSON.trim() && credentialsJSON.trim() !== '{}' ? JSON.parse(credentialsJSON) : undefined;
      requestTemplate = JSON.parse(requestTemplateJSON || '{}');
      responseMapping = JSON.parse(responseMappingJSON || '{}');
    } catch {
      toast.error('Credentials / request template / response mapping must be valid JSON');
      return;
    }
    try {
      await upsert.mutateAsync({
        auth_type: authType,
        base_url: baseUrl,
        agent_identifier: agentId || undefined,
        credentials,
        request_template: requestTemplate,
        response_mapping: responseMapping,
        ...paths,
      });
      toast.success('Connector configuration saved');
      setCredentialsJSON('{}'); // never re-display what was just written
    } catch {
      toast.error('Failed to save connector configuration');
    }
  };

  const runTest = async () => {
    let sample: Record<string, string>;
    try {
      sample = JSON.parse(sampleJSON || '{}');
    } catch {
      toast.error('Sample payload must be valid JSON');
      return;
    }
    try {
      await test.mutateAsync({ operation: testOperation, sample });
    } catch {
      // result still rendered from test.data/test.error below
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Auth type" required>
          <Select value={authType} onChange={(e) => setAuthType(e.target.value)}>
            <option value="bearer_static">Bearer (static token)</option>
            <option value="oauth2_client_credentials">OAuth2 / token endpoint</option>
            <option value="api_key">API Key header</option>
            <option value="basic">Basic auth</option>
            <option value="mtls">mTLS</option>
          </Select>
        </FormField>
        <FormField label="Base URL" required className="sm:col-span-2">
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://uat.dha.go.ke" />
        </FormField>
      </div>

      <FormField label="Agent identifier" description="Per-application ID some insurers require alongside the token (e.g. SHA's 'agent' param)">
        <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="e.g. MY-PHARMACY-PROD" />
      </FormField>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Operation Paths</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPERATION_FIELDS.map((f) => (
            <FormField key={f.key} label={f.label}>
              <Input
                value={paths[f.key] ?? ''}
                onChange={(e) => setPaths((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder="/v1/..."
              />
            </FormField>
          ))}
        </div>
      </div>

      <FormField
        label="Credentials (JSON)"
        description="Plaintext here, encrypted at rest. Leave as {} to keep the currently-stored secret unchanged."
      >
        <Textarea value={credentialsJSON} onChange={(e) => setCredentialsJSON(e.target.value)} className="font-mono text-xs" rows={4} />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Request Template (JSON)"
          description={'{{canonical.field}} placeholders resolve from the canonical claim fields — supports nested objects/arrays for FHIR-shaped payers'}
        >
          <Textarea value={requestTemplateJSON} onChange={(e) => setRequestTemplateJSON(e.target.value)} className="font-mono text-xs" rows={8} />
        </FormField>
        <FormField
          label="Response Mapping (JSON)"
          description="canonical-field -> response JSON path (dotted/indexed, e.g. message.result[0].id)"
        >
          <Textarea value={responseMappingJSON} onChange={(e) => setResponseMappingJSON(e.target.value)} className="font-mono text-xs" rows={8} />
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={upsert.isPending || !baseUrl}>
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save Connector
        </Button>
        {cfg?.last_tested_at && (
          <span className="text-xs text-muted-foreground">
            Last tested {new Date(cfg.last_tested_at).toLocaleString()} — {cfg.last_test_result}
          </span>
        )}
      </div>

      {/* Test Connection panel */}
      <Card className="border-dashed">
        <CardHeader>
          <p className="text-sm font-semibold flex items-center gap-2">
            <PlayCircle className="h-4 w-4" /> Test Connection
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Operation">
              <Select value={testOperation} onChange={(e) => setTestOperation(e.target.value)}>
                {TEST_OPERATIONS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Sample canonical payload (JSON)" className="sm:col-span-2">
              <Textarea value={sampleJSON} onChange={(e) => setSampleJSON(e.target.value)} className="font-mono text-xs" rows={2} />
            </FormField>
          </div>
          <Button onClick={runTest} disabled={test.isPending}>
            {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Run Test
          </Button>
          {test.data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">Rendered Request</p>
                <pre className="text-[11px] bg-muted/40 rounded-lg p-2 overflow-auto max-h-48">
                  {JSON.stringify(test.data.result?.RenderedRequest ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                  Raw Response {test.data.result?.StatusCode ? `(HTTP ${test.data.result.StatusCode})` : ''}
                </p>
                <pre className="text-[11px] bg-muted/40 rounded-lg p-2 overflow-auto max-h-48">
                  {JSON.stringify(test.data.result?.RawResponse ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">Extracted Canonical Fields</p>
                <pre className="text-[11px] bg-muted/40 rounded-lg p-2 overflow-auto max-h-48">
                  {JSON.stringify(test.data.result?.Extracted ?? {}, null, 2)}
                </pre>
                {test.data.error && <p className="text-[11px] text-destructive mt-1">{test.data.error}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InsuranceConnectorsPage() {
  const { data: providers, isLoading } = useInsuranceProviders();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = providers?.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Insurance Connectors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure any insurer&apos;s API — base URL, operation paths, credentials, and request/response field
          mapping — so pharmacy checkout can submit real-time or batch claims without a code change.
        </p>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-semibold">Providers</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <NewProviderForm onCreated={setSelectedId} />
          {isLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(providers ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedId === p.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                  }`}
                >
                  {p.name}
                  {!p.is_active && <Badge variant="outline">inactive</Badge>}
                </button>
              ))}
              {(providers ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No providers yet — add one above (e.g. &quot;SHA&quot;).</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold">Connector — {selected.name}</p>
          </CardHeader>
          <CardContent>
            <ConnectorEditor key={selected.id} provider={selected} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
