export interface HttpConfig {
  linkSecret: string | undefined;
  // Where clients reach the server when a proxy serves it under a path, such as https://www.nothing-fancy.space/invoice.
  publicUrl: string | undefined;
  now: () => Date;
}

const readVariable = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name];
  return value === '' ? undefined : value;
};

export const readConfig = (env: NodeJS.ProcessEnv): HttpConfig => ({
  linkSecret: readVariable(env, 'INVOICE_LINK_SECRET'),
  publicUrl: readVariable(env, 'PUBLIC_URL')?.replace(/\/+$/, ''),
  now: () => new Date(),
});

// Fails the call rather than the deployment, so the error reaches whoever can set the variable.
export const requireLinkSecret = ({ linkSecret }: HttpConfig) => {
  if (linkSecret === undefined) throw new Error('INVOICE_LINK_SECRET is not set on the server.');
  return linkSecret;
};
