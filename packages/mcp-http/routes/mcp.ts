import { readConfig } from '../src/config';
import { createInvoiceMcpHandler } from '../src/mcp-handler';

const handler = createInvoiceMcpHandler(readConfig(process.env));

export { handler as DELETE, handler as GET, handler as POST };
