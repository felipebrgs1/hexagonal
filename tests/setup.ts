// Global test setup
import { config } from 'dotenv';
import { vi } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// Global test timeout
//vi.setTimeout(10000);

// Mock console in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to hide logs during tests
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};
