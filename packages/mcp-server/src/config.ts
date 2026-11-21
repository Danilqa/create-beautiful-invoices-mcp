import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export interface ServerConfig {
  invoicesDir: string;
}

export const readConfig = (env: NodeJS.ProcessEnv): ServerConfig => {
  const invoicesDir = env['INVOICES_DIR'];
  return {
    invoicesDir: resolve(
      invoicesDir === undefined || invoicesDir === '' ? join(homedir(), 'Invoices') : invoicesDir,
    ),
  };
};
