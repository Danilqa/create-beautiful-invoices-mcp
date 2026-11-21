import { createMcpHandler } from 'mcp-handler';
import packageJson from '../package.json' with { type: 'json' };
import type { HttpConfig } from './config';
import { registerCreateInvoice } from './create-invoice';

export const createInvoiceMcpHandler = (config: HttpConfig) =>
  createMcpHandler(
    server => {
      registerCreateInvoice(server, config);
    },
    { serverInfo: { name: 'create-beautiful-invoices-mcp', version: packageJson.version } },
  );
