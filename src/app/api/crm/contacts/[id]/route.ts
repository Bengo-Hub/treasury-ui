import { NextRequest, NextResponse } from 'next/server';

const MARKETFLOW_API_URL =
  process.env.MARKETFLOW_API_URL || 'https://marketflowapi.codevertexafrica.com';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mirrors the guard in the parent /contacts route — see its doc comment. */
function invalidTenant(tenantId: string): NextResponse | null {
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }
  if (!UUID_REGEX.test(tenantId)) {
    return NextResponse.json(
      { error: 'tenant_id must be a tenant UUID, not a slug', code: 'invalid_tenant' },
      { status: 400 },
    );
  }
  return null;
}

/**
 * GET /api/crm/contacts/{id}?tenant_id=
 * Server-side proxy to marketflow-api's single-contact lookup — backs the "Edit Client" form
 * (see CreateClientModal) so it hydrates from the contact's live/full record, including
 * metadata keys the document form itself doesn't track (e.g. notes), rather than a
 * document's own possibly-partial metadata snapshot.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenantId = req.nextUrl.searchParams.get('tenant_id') ?? '';

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const bad = invalidTenant(tenantId);
  if (bad) return bad;

  try {
    const res = await fetch(`${MARKETFLOW_API_URL}/api/v1/contacts/${encodeURIComponent(id)}`, {
      headers: {
        'Authorization': auth,
        'X-Tenant-ID':   tenantId,
        'Accept':        'application/json',
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}

/**
 * PUT /api/crm/contacts/{id}?tenant_id=
 * Update a marketflow CRM contact (the customer source of truth) via the local Next.js proxy
 * route. Mirrors the POST proxy in the parent route: forwards the caller's Bearer token +
 * X-Tenant-ID to marketflow-api server-side.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenantId = req.nextUrl.searchParams.get('tenant_id') ?? '';

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const bad = invalidTenant(tenantId);
  if (bad) return bad;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${MARKETFLOW_API_URL}/api/v1/contacts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Authorization':  auth,
        'X-Tenant-ID':    tenantId,
        'Accept':         'application/json',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}
