import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  // Tests must never inherit a developer's API endpoint or credentials.
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8000/api/v1') },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx,mjs}'],
    restoreMocks: true,
    unstubGlobals: true,
  },
}));
