import { McpServer } from '@modelcontextprotocol/server';
import packageJson from '../package.json' with { type: 'json' };
import type { ServerConfig } from './config';
import { registerCreateInvoice } from './tools/create-invoice';

export const createServer = (config: ServerConfig, now = () => new Date()) => {
  const server = new McpServer({ name: packageJson.name, version: packageJson.version });
  registerCreateInvoice(server, config, now);
  return server;
};
