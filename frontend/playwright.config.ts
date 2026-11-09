import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
    },
    {
      command:
        "..\\backend\\venv\\Scripts\\python.exe ..\\backend\\manage.py runserver 127.0.0.1:8000 --noreload",
      url: "http://127.0.0.1:8000/api/v1/health/",
      reuseExistingServer: true,
    },
  ],
});
