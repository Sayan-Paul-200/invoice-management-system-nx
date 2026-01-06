import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { setupCache } from 'axios-cache-interceptor';

type TokenAPIResponse = {
  accessToken: string;
  accessTokenExpiry: string;
};

type Credentials = {
  complexId: string;
  role: string;
  accessToken: string;
  accessTokenExpiry: Date;
};

// Configuration
const CONFIG = {
  IAM_TOKEN_ENDPOINT: '/iam/v1/authenticate/token',
  CACHE_TTL: 1000 * 10, // 10 seconds
  TOKEN_STORAGE_KEY: 'auth_tokens',
  USE_MEMORY_ONLY: false,
  DEBUG_DISABLE_IAM_AUTH: false,
} as const;

// Token Storage with persistence
class TokenStorage {
  private static instance: TokenStorage;

  private credentials: Credentials = {
    complexId: '',
    role: '',
    accessToken: '',
    accessTokenExpiry: new Date(0),
  };

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): TokenStorage {
    if (!TokenStorage.instance) {
      TokenStorage.instance = new TokenStorage();
    }
    return TokenStorage.instance;
  }

  private loadFromStorage(): void {
    // Skip loading from storage if memory-only mode is enabled
    if (CONFIG.USE_MEMORY_ONLY) {
      return;
    }

    try {
      // Use sessionStorage instead of localStorage for better security
      const stored = sessionStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.credentials = {
          ...parsed,
          accessTokenExpiry: new Date(parsed.accessTokenExpiry),
        };
      }
    } catch {
      // Ignore parsing errors, use defaults
    }
  }

  private saveToStorage(): void {
    // Skip saving to storage if memory-only mode is enabled
    if (CONFIG.USE_MEMORY_ONLY) {
      return;
    }

    try {
      // Use sessionStorage instead of localStorage for better security
      sessionStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, JSON.stringify(this.credentials));
    } catch {
      // Ignore storage errors
    }
  }

  public getCredentials(): Credentials {
    return { ...this.credentials };
  }

  public setCredentials(credentials: Partial<Credentials>): void {
    this.credentials = { ...this.credentials, ...credentials };
    this.saveToStorage();
  }

  public isTokenValid(): boolean {
    return this.credentials.accessToken !== '' && this.credentials.accessTokenExpiry > new Date();
  }

  public clear(): void {
    this.credentials = {
      complexId: '',
      role: '',
      accessToken: '',
      accessTokenExpiry: new Date(0),
    };

    // Clear from both storage types to be safe
    if (!CONFIG.USE_MEMORY_ONLY) {
      sessionStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
      // Also clear localStorage if it was previously used
      localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
    }
  }
}

// Token manager
class TokenManager {
  private static instance: TokenManager;
  private storage = TokenStorage.getInstance();
  private refreshPromise: Promise<string> | null = null;

  private constructor(private internalClient: AxiosInstance) {}

  public static getInstance(internalClient: AxiosInstance): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager(internalClient);
    }
    return TokenManager.instance;
  }

  public async retrieveCurrentToken(): Promise<string> {
    // DEBUG: Bypass IAM if configured
    if (CONFIG.DEBUG_DISABLE_IAM_AUTH) {
      return 'debug-token';
    }

    if (this.storage.isTokenValid()) {
      return this.storage.getCredentials().accessToken;
    }

    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const { complexId, role } = this.storage.getCredentials();
    if (!complexId || !role) {
      throw new Error('No account selected');
    }

    this.refreshPromise = this.getAccessToken(complexId, role);

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  public async getAccessToken(complexId: string, role: string): Promise<string> {
    // DEBUG: Bypass IAM if configured
    if (CONFIG.DEBUG_DISABLE_IAM_AUTH) {
      return 'debug-token';
    }

    try {
      const response = await this.internalClient.post<TokenAPIResponse>(CONFIG.IAM_TOKEN_ENDPOINT, {
        complexId,
        role,
      });

      const { accessToken, accessTokenExpiry } = response.data;

      this.storage.setCredentials({
        complexId,
        role,
        accessToken,
        accessTokenExpiry: new Date(accessTokenExpiry),
      });

      return accessToken;
    } catch {
      this.storage.clear();
      throw new Error('Failed to refresh token');
    }
  }

  public setCredentials(credentials: Partial<Credentials>): void {
    this.storage.setCredentials(credentials);
  }

  public clearTokens(): void {
    this.storage.clear();
    this.refreshPromise = null;
  }

  public getCurrentRole(): string | undefined {
    return this.storage.getCredentials().role;
  }
}

// Axios client instances
const internalClient = axios.create();

const baseClientConfig = {
  withCredentials: true,
};

const standardClient = axios.create(baseClientConfig);
const cachedClient = axios.create(baseClientConfig);

// Interceptor functions
const createAuthInterceptor = (tokenManager: TokenManager) => {
  return async (request: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    // Skip if request is not to the API endpoint
    if (!request.url?.startsWith('/api')) {
      return request;
    }

    try {
      const accessToken = await tokenManager.retrieveCurrentToken();

      // Inject the access token into the request
      request.headers['Authorization'] = `Bearer ${accessToken}`;
      request.headers['X-Selected-Account'] = localStorage.getItem('selected-account');

      return request;
    } catch {
      // Token refresh failed, abort the request
      const controller = new AbortController();
      controller.abort();
      return {
        ...request,
        signal: controller.signal,
      };
    }
  };
};

const createErrorInterceptor = () => {
  return (error: unknown) => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number } };
      if (axiosError.response?.status === 412) {
        // CHANGED: Redirect to login instead of account-picker
        window.location.hash = '/login'; 
      }
    }
    return Promise.reject(error);
  };
};

// Token manager instance
const tokenManager = TokenManager.getInstance(internalClient);

// Apply interceptors to both clients
const setupInterceptors = (client: AxiosInstance, tokenManager: TokenManager): void => {
  // Request interceptor
  client.interceptors.request.use(createAuthInterceptor(tokenManager), (error) => Promise.reject(error));

  // Response interceptor
  client.interceptors.response.use((response) => response, createErrorInterceptor());
};

// Setup interceptors for both clients
setupInterceptors(standardClient, tokenManager);
setupInterceptors(cachedClient, tokenManager);

// Setup cache interceptor
const axiosCached = setupCache(cachedClient, {
  ttl: CONFIG.CACHE_TTL,
});

// Export clients and utilities
export { standardClient as axios };
export { axiosCached };
export { tokenManager };
export { isAxiosError } from 'axios';
export type { TokenAPIResponse, Credentials };
