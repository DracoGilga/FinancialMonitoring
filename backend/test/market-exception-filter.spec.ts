import { describe, expect, it, jest } from '@jest/globals';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import {
  MarketServiceUnavailableException,
  ProviderRateLimitException,
  SymbolNotFoundException,
} from '../src/1_entities/market/MarketExceptions';
import { MarketExceptionFilter } from '../src/3_interface_adapters/controllers/market/filters/MarketExceptionFilter';

const createHost = () => {
  const json = jest.fn<(body: object) => void>();
  const status = jest.fn<(statusCode: number) => { json: typeof json }>(() => ({
    json,
  }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe('MarketExceptionFilter', () => {
  it.each([
    [new SymbolNotFoundException('NONE'), HttpStatus.NOT_FOUND],
    [new ProviderRateLimitException('Yahoo'), HttpStatus.TOO_MANY_REQUESTS],
    [new MarketServiceUnavailableException(), HttpStatus.SERVICE_UNAVAILABLE],
  ])('maps %s to HTTP %s', (exception, expectedStatus) => {
    const { host, status, json } = createHost();

    new MarketExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith({
      statusCode: expectedStatus,
      error: HttpStatus[expectedStatus],
      message: exception.message,
    });
  });
});
