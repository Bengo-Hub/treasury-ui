import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://booksapi.codevertexitsolutions.com';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ApiClient {
  private instance: AxiosInstance;
  private accessToken: string | null = null;
  private tenantId: string | null = null;
  private tenantSlug: string | null = null;
  private platformOwner = false;

  constructor() {
    this.instance = axios.create({
      baseURL: apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.instance.interceptors.request.use(this.handleRequest);
    this.instance.interceptors.response.use(this.handleResponse, this.handleError);
  }

  private handleRequest = (config: InternalAxiosRequestConfig) => {
    if (this.accessToken) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }
    // Platform owners have global access — skip tenant headers so backend
    // does not filter by tenant. Scope is resolved from JWT claims instead.
    if (!this.platformOwner) {
      if (this.tenantSlug) {
        config.headers['X-Tenant-Slug'] = this.tenantSlug;
      }
      if (this.tenantId && UUID_REGEX.test(this.tenantId)) {
        config.headers['X-Tenant-ID'] = this.tenantId;
      }
    }
    return config;
  };

  public setTenantContext(tenantId: string | null, tenantSlug: string | null) {
    this.tenantId = tenantId;
    this.tenantSlug = tenantSlug;
  }

  public setPlatformOwner(isPlatformOwner: boolean) {
    this.platformOwner = isPlatformOwner;
  }

  private handleResponse = (response: AxiosResponse) => response;

  private on401Callback: (() => void) | null = null;
  private onSubscription403Callback: ((data: any) => void) | null = null;

  /** Register a callback to run when any API response is 401 (e.g. clear session / redirect to auth). */
  public setOn401(callback: (() => void) | null) {
    this.on401Callback = callback;
  }

  /** Register a callback for subscription-related 403 errors (code=subscription_inactive, upgrade=true). */
  public setOnSubscription403(callback: ((data: any) => void) | null) {
    this.onSubscription403Callback = callback;
  }

  private handleError = async (error: any) => {
    if (error.response?.status === 401) {
      const url: string = error.config?.url ?? '';
      if (!url.includes('/auth/me') && !error.config?._retried) {
        // Attempt token refresh before triggering logout
        const { refreshAccessToken } = await import('@/lib/auth/token-refresh');
        const newToken = await refreshAccessToken();

        if (newToken) {
          this.accessToken = newToken;
          error.config._retried = true;
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return this.instance.request(error.config);
        }

        // Refresh failed — fire logout callback
        this.on401Callback?.();
      }
    }
    if (error.response?.status === 403 && this.onSubscription403Callback) {
      const data = error.response?.data;
      if (data?.code === 'subscription_inactive' || data?.upgrade === true) {
        this.onSubscription403Callback(data);
      }
    }
    return Promise.reject(error);
  };

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  public get<T>(url: string, params?: any): Promise<T> {
    return this.instance.get<T>(url, { params }).then((res: AxiosResponse<T>) => res.data);
  }

  public post<T>(url: string, data?: any): Promise<T> {
    return this.instance.post<T>(url, data).then((res: AxiosResponse<T>) => res.data);
  }

  public put<T>(url: string, data?: any): Promise<T> {
    return this.instance.put<T>(url, data).then((res: AxiosResponse<T>) => res.data);
  }

  public patch<T>(url: string, data?: any): Promise<T> {
    return this.instance.patch<T>(url, data).then((res: AxiosResponse<T>) => res.data);
  }

  public delete<T>(url: string): Promise<T> {
    return this.instance.delete<T>(url).then((res: AxiosResponse<T>) => res.data);
  }
}

export const apiClient = new ApiClient();
