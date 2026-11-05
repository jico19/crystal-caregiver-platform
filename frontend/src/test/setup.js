import { vi } from 'vitest';

// Keep existing network mocks while exercising real Axios behavior. Omitting
// Request makes the fetch boundary receive URL/options in both Node and jsdom.
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal();
  const axios = actual.default;
  return {
    ...actual,
    default: {
      ...axios,
      create(config) {
        return axios.create({
          ...config,
          adapter: 'fetch',
          env: { Request: null, fetch: (...args) => globalThis.fetch(...args) },
        });
      },
    },
  };
});
