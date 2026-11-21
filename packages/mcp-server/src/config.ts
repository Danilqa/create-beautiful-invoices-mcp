import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { InvoiceDefaults } from './defaults';
import { EMPTY_DEFAULTS, readDefaults } from './defaults';

export interface ServerConfig {
  invoicesDir: string;
  defaults: InvoiceDefaults;
}

const readVariable = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name];
  return value === '' ? undefined : value;
};

export const readConfig = async (env: NodeJS.ProcessEnv): Promise<ServerConfig> => {
  const defaultsPath = readVariable(env, 'INVOICE_DEFAULTS');
  return {
    invoicesDir: resolve(readVariable(env, 'INVOICES_DIR') ?? join(homedir(), 'Invoices')),
    defaults: defaultsPath === undefined ? EMPTY_DEFAULTS : await readDefaults(defaultsPath),
  };
};
