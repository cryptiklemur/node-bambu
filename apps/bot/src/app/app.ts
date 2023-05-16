import type { FastifyInstance } from 'fastify';

import Discord from './plugins/discord';
import Sensible from './plugins/sensible';
import Root from './routes/root';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppOptions {}

export async function app(fastify: FastifyInstance, options: AppOptions) {
  // Place here your custom code!

  // Do not touch the following lines

  fastify.register(Discord);
  fastify.register(Sensible);

  fastify.register(Root);
}
