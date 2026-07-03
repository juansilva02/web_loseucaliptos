import { join } from 'node:path'
import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const e2eDbPath = join(process.cwd(), '.e2e', 'loseucaliptos.sqlite')
const sharedEnv = {
  ...process.env,
  DB_PATH: e2eDbPath,
  JWT_SECRET: 'e2e-secret-with-enough-entropy-for-tests',
  SEED_ADMIN_EMAIL: 'admin@e2e.local',
  SEED_ADMIN_PASSWORD: 'Admin-e2e-123',
  NODE_ENV: 'test',
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 8000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-375',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: [
    {
      command: 'node e2e/start-backend.mjs',
      url: 'http://127.0.0.1:3001/health/ready',
      env: sharedEnv,
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      env: sharedEnv,
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
})
