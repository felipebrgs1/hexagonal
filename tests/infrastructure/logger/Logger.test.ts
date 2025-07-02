import { logger } from '../../../src/infrastructure/logger/Logger';

describe('Logger', () => {
  it('should log messages without errors', () => {
    // This is a simple smoke test for the logger
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.warn('Test warn message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });

  it('should log with metadata', () => {
    expect(() => {
      logger.info('Test with metadata', { userId: '123', action: 'login' });
    }).not.toThrow();
  });
});
