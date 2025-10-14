import logger, { LOG_CATEGORIES } from '../logger';

describe('Logger Utility', () => {
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('should log info messages', () => {
    logger.info(LOG_CATEGORIES.DATA, 'Test message');
    expect(consoleInfoSpy).toHaveBeenCalled();
  });

  test('should log warning messages', () => {
    logger.warn(LOG_CATEGORIES.DATA, 'Test warning');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  test('should log error messages', () => {
    logger.error(LOG_CATEGORIES.ERROR, 'Test error', {}, new Error('Test'));
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  test('should handle metadata', () => {
    const metadata = { userId: '123', action: 'test' };
    logger.info(LOG_CATEGORIES.DATA, 'Test with metadata', metadata);
    expect(consoleInfoSpy).toHaveBeenCalled();
  });
});

