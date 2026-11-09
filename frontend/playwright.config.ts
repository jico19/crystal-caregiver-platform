import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
  },
  webServer: [
    {
      command: "npm run dev -- --config vite.e2e.config.js",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: true,
    },
    {
      command:
        "..\\backend\\venv\\Scripts\\python.exe ..\\backend\\manage.py runserver 127.0.0.1:8001 --noreload --settings=config.settings.browser_tests",
      url: "http://127.0.0.1:8001/api/v1/health/",
      reuseExistingServer: false,
    },
  ],
});
