export interface HttpConfig {
  linkSecret: string | undefined;
  now: () => Date;
}

export const readConfig = (env: NodeJS.ProcessEnv): HttpConfig => ({
  linkSecret: env['INVOICE_LINK_SECRET'] === '' ? undefined : env['INVOICE_LINK_SECRET'],
  now: () => new Date(),
});

// Fails the call rather than the deployment, so the error reaches whoever can set the variable.
export const requireLinkSecret = ({ linkSecret }: HttpConfig) => {
  if (linkSecret === undefined) throw new Error('INVOICE_LINK_SECRET is not set on the server.');
  return linkSecret;
};
