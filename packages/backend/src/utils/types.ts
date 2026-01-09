import type { Request } from 'express';
import type { CryptoKey } from 'jose';
import type { DrizzleClient } from '@invoice-management-system/db';

export type Maybe<T> = NonNullable<T> | undefined;

export type RoleScopes = 'admin' | 'staff' | 'owner' | 'tenant' | 'other';

type QueryParameter = Record<string, string>;

export type TypedRequestQuery<T = QueryParameter> = Request & {
  query: T;
};

export type GetUpdateType<T> = {
  id: string;
} & Partial<T>;

// Parameters globally available in the request context
export type GlobalContext = {
  dbClient: DrizzleClient;
};

// Parameters that will be decoded from JWT and injected into request context
export type RequestContext = {
  role: RoleScopes;
  userId: string;
  complexId: string;
  permissions: string[];
};

export type JWKS = {
  publicKey: CryptoKey | Uint8Array;
  privateKey: CryptoKey | Uint8Array;
};

export type PhotoUploadSuccessResponse = {
  uploadKey: string;
};
