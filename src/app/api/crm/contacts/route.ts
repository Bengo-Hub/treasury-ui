import { NextRequest, NextResponse } from 'next/server';

const MARKETFLOW_API_URL =
  process.env.MARKETFLOW_API_URL || 'https://marketflowapi.codevertexitsolutions.com';

/**
 * GET /api/crm/contacts?q=&limit=&tenant_id=
 * Server-side proxy to marketflow-api contacts list — avoids CORS and keeps JWT server-side.
 * Forwards the caller's Bearer token + X-Tenant-ID to marketflow-api.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q       = searchParams.get('q') ?? '';
  const limit   = searchParams.get('limit') ?? '20';
  const tenantId = searchParams.get('tenant_id') ?? '';

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const upstream = new URL(`${MARKETFLOW_API_URL}/api/v1/contacts`);
  if (q)     upstream.searchParams.set('q', q);
  upstream.searchParams.set('limit', limit);

  try {
    const res = await fetch(upstream.toString(), {
      headers: {
        'Authorization':  auth,
        'X-Tenant-ID':    tenantId,
        'Accept':         'application/json',
        'Content-Type':   'application/json',
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
 * POST /api/crm/contacts?tenant_id=
 * Create a marketflow CRM contact (the customer source of truth). Mirrors the GET proxy:
 * forwards the caller's Bearer token + X-Tenant-ID to marketflow-api server-side.
 */
export async function POST(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant_id') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${MARKETFLOW_API_URL}/api/v1/contacts`, {
      method: 'POST',
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
