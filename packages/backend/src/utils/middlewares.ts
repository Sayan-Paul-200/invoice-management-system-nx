import { RequestHandler } from 'express';
import { parseAccessToken } from '@my-society/iam';
import type { Request, Response, NextFunction } from 'express';
import type { DrizzleClient } from '@invoice-management-system/db';
import type { S3Client } from '@aws-sdk/client-s3';
import type { SQSClient } from '@aws-sdk/client-sqs';
import { JWKS } from '@utils/types';

type AddGlobalContextInput = {
  dbClient: DrizzleClient;
  s3Client: S3Client;
  sqsClient: SQSClient;
  jwks: JWKS;
};

export const addGlobalContext = ({ dbClient, s3Client, sqsClient, jwks }: AddGlobalContextInput): RequestHandler => {
  return (req, _res, next) => {
    req.globalContext = {
      dbClient,
      s3Client,
      sqsClient,
    };
    req.jwks = jwks;
    next();
  };
};

export const addContext: RequestHandler = async (req, res, next) => {
  let authorizationHeader = req.header('Authorization') ?? '';

  if (!authorizationHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  authorizationHeader = authorizationHeader.slice(7);

  const accessToken = await parseAccessToken({
    token: authorizationHeader,
    publicKey: req.jwks.publicKey,
  });

  req.context = {
    role: accessToken.account.role,
    userId: accessToken.userId,
    complexId: accessToken.account.complexId,
    permissions: accessToken.account.permissions,
  };
  next();
};

// Delay middleware to simulate processing time
export const addDelay =
  (delay: number): RequestHandler =>
  (_req, _res, next) => {
    setTimeout(next, delay);
  };

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
};
