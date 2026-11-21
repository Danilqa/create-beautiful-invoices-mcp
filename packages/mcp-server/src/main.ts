import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { readConfig } from './config';
import { createServer } from './server';

const config = await readConfig(process.env);

// stdout carries the protocol, so the server never logs to it.
serveStdio(() => createServer(config), {
  onerror: error => {
    console.error(error);
  },
});
