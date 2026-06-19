/**
 * Tenant API (auth-api). Used for tenant-by-slug lookup and platform admin listing.
 * Auth-api: GET /api/v1/tenants/by-slug/{slug} (public).
 * Auth-api: GET /api/v1/admin/tenants (platform admin, JWT required).
 */

import { useAuthStore } from '@/store/auth';

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  process.env.NEXT_PUBLIC_SSO_URL ||
  'https://sso.codevertexitsolutions.com';

export interface TenantBrandMetadata {
  logo_url?: string;
  logoUrl?: string;
  primary_color?: string;
  primaryColor?: string;
  secondary_color?: string;
  secondaryColor?: string;
  org_name?: string;
  orgName?: string;
}

export interface TenantBrandColors {
  primary?: string;
  secondary?: string;
  accent?: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  status?: string;
  use_case?: string;
  // Top-level fields (auth-api v2 response shape — preferred)
  logo_url?: string;
  brand_colors?: TenantBrandColors;
  contact_email?: string;
  website?: string;
  // Legacy metadata fallback (older auth-api versions)
  metadata?: Record<string, unknown>;
}

export interface TenantBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  orgName: string;
  useCase: string;
}

export function parseBrandFromTenant(t: TenantResponse): TenantBrand {
  // Prefer top-level fields (auth-api v2); fall back to metadata
  const meta = (t.metadata || {}) as TenantBrandMetadata;
  const logoUrl = t.logo_url ?? meta.logo_url ?? meta.logoUrl ?? null;
  const primaryColor = t.brand_colors?.primary ?? (meta.primary_color ?? meta.primaryColor) ?? null;
  const secondaryColor = t.brand_colors?.secondary ?? (meta.secondary_color ?? meta.secondaryColor) ?? null;
  const orgName = (meta.org_name ?? meta.orgName) ?? t.name ?? '';

  return {
    id: t.id,
    name: t.name ?? '',
    slug: t.slug ?? '',
    logoUrl: typeof logoUrl === 'string' ? logoUrl : null,
    primaryColor: typeof primaryColor === 'string' ? primaryColor : null,
    secondaryColor: typeof secondaryColor === 'string' ? secondaryColor : null,
    orgName: typeof orgName === 'string' ? orgName : (t.name ?? ''),
    useCase: t.use_case ?? 'other',
  };
}

/**
 * List all active tenants (platform admin only).
 * Calls auth-api GET /api/v1/admin/tenants with the current JWT.
 */
export class TenantFetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'TenantFetchError';
    this.status = status;
  }
}

/**
 * List all active tenants (platform admin only).
 *
 * auth-api `GET /api/v1/admin/tenants` returns a paginated envelope
 * (`@Bengo-Hub/pagination` → `{ data: [], total, limit, page, hasMore }`).
 * Older/alternate shapes (`[]` or `{ tenants: [] }`) are also tolerated.
 * Throws TenantFetchError on auth/transport failures so callers can surface
 * an error state instead of rendering a silent "No tenants available".
 */
export async function listPlatformTenants(search?: string): Promise<TenantResponse[]> {
  const token = useAuthStore.getState().session?.accessToken;
  if (!token) throw new TenantFetchError('Not authenticated', 401);
  const url = new URL(`${AUTH_API_URL}/api/v1/admin/tenants`);
  if (search) url.searchParams.set('search', search);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error('[listPlatformTenants] network error', err);
    throw new TenantFetchError('Network error while loading tenants', 0);
  }
  if (!res.ok) {
    console.error('[listPlatformTenants] auth-api returned', res.status, url.toString());
    throw new TenantFetchError(`Failed to load tenants (HTTP ${res.status})`, res.status);
  }
  const data = await res.json();
  // Paginated envelope (preferred) → { data: [] }; tolerate [] and { tenants: [] }.
  if (Array.isArray(data)) return data;
  return (data?.data ?? data?.tenants ?? data?.items ?? []) as TenantResponse[];
}

export interface TenantDefaults {
  name: string;
  tagline: string;
  address: string;
  country: string;
  email: string;
  phone: string;
  taxPin: string;
  vatRegistered: boolean;
  vatRegisteredOn: string;
}

/** Fetch a tenant's identity defaults (name, slogan/tagline, address, …) from auth-api
 *  by-slug — used to pre-fill the platform payment-details form for the logged-in tenant. */
export async function fetchTenantDefaults(slug: string): Promise<TenantDefaults | null> {
  if (!slug) return null;
  try {
    const res = await fetch(`${AUTH_API_URL}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const t = (await res.json()) as TenantResponse & {
      country?: string;
      contact_phone?: string;
      tax_pin?: string;
      vat_registered?: boolean;
      vat_registered_on?: string;
    };
    const m = (t.metadata ?? {}) as Record<string, unknown>;
    const s = (...keys: string[]): string => {
      for (const k of keys) { const v = m[k]; if (typeof v === 'string' && v) return v; }
      return '';
    };
    return {
      name: t.name ?? '',
      tagline: s('tagline', 'company_tagline', 'slogan'),
      address: s('address', 'physical_address', 'postal_address', 'street_address'),
      country: t.country ?? s('country'),
      email: t.contact_email ?? '',
      phone: t.contact_phone ?? '',
      // tax_pin / VAT are first-class auth-api fields now; fall back to metadata for older tenants.
      taxPin: t.tax_pin ?? s('tax_pin', 'kra_pin'),
      vatRegistered: !!t.vat_registered,
      vatRegisteredOn: (t.vat_registered_on ?? '').slice(0, 10),
    };
  } catch {
    return null;
  }
}

export async function fetchTenantBySlug(slug: string): Promise<TenantBrand | null> {
  if (!slug) return null;
  const url = `${AUTH_API_URL}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TenantResponse;
    return parseBrandFromTenant(data);
  } catch {
    return null;
  }
}
