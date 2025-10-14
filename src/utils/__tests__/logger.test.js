import { logger, LOG_CATEGORIES } from '../logger';

describe('Logger Utility', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should log info messages', () => {
    logger.info(LOG_CATEGORIES.GENERAL, 'Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  test('should log warning messages', () => {
    logger.warn(LOG_CATEGORIES.GENERAL, 'Test warning');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  test('should log error messages', () => {
    logger.error(LOG_CATEGORIES.ERROR, 'Test error', {}, new Error('Test'));
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('should handle metadata', () => {
    const metadata = { userId: '123', action: 'test' };
    logger.info(LOG_CATEGORIES.GENERAL, 'Test with metadata', metadata);
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});

