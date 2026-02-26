import * as fetchUrl from './fetchUrl.js';

const tools = [fetchUrl];

export const toolDefinitions = tools.map((t) => t.definition);

export const toolExecutors = Object.fromEntries(
  tools.map((t) => [t.definition.name, t.execute]),
);
