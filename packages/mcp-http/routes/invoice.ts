import { readConfig } from '../src/config';
import { downloadInvoice } from '../src/download-invoice';

const config = readConfig(process.env);

export const GET = (request: Request) => downloadInvoice(request, config);
