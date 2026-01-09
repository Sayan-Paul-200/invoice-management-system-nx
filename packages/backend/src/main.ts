import express from 'express';
import { GlobalContext, JWKS, RequestContext } from './utils/types';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// Type augmentation for Express
declare module 'express-serve-static-core' {
  interface Request {
    globalContext: GlobalContext;
    context: RequestContext;
    jwks: JWKS;
  }
}

const app = express();

app.get('/', (req, res) => {
  res.send({ message: 'Hello API' });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
