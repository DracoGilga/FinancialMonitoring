// test/market-gateways.spec.ts
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AlphaVantageGatewayImpl } from '../src/3_interface_adapters/gateways/market/AlphaVantageGatewayImpl';
import { DataBursatilGatewayImpl } from '../src/3_interface_adapters/gateways/market/DataBursatilGatewayImpl';
import { FinnhubGatewayImpl } from '../src/3_interface_adapters/gateways/market/FinnhubGatewayImpl';
import { MarketstackGatewayImpl } from '../src/3_interface_adapters/gateways/market/MarketstackGatewayImpl';
import { MassiveGatewayImpl } from '../src/3_interface_adapters/gateways/market/MassiveGatewayImpl';

const jsonResponse = (body: unknown, ok = true, statusText = 'OK'): Response =>
  new Response(JSON.stringify(body), {
    status: ok ? 200 : 400,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });

describe('HTTP market gateways', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.restoreAllMocks();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  it.each([
    [() => new FinnhubGatewayImpl(''), 'FINNHUB_API_KEY is required'],
    [
      () => new AlphaVantageGatewayImpl(''),
      'ALPHA_VANTAGE_API_KEY is required',
    ],
    [() => new MarketstackGatewayImpl(''), 'MARKETSTACK_API_KEY is required'],
    [() => new MassiveGatewayImpl(''), 'MASSIVE_API_KEY is required'],
    [() => new DataBursatilGatewayImpl(''), 'DATABURSATIL_API_KEY is required'],
  ])('requires an API key', (createGateway, message) => {
    expect(createGateway).toThrow(message);
  });

  it('maps Finnhub responses and handles provider failures', async () => {
    const gateway = new FinnhubGatewayImpl('key');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ c: 110, d: 1, o: 100, pc: 98, t: 1_700_000_000 }),
    );
    await expect(gateway.getQuote('aapl')).resolves.toMatchObject({
      symbol: 'AAPL',
      currentPrice: 110,
      openPrice: 100,
      closePrice: 98,
      marketTimestamp: new Date(1_700_000_000_000),
    });

    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ c: 0, d: null, o: 0, pc: 0, t: 0 }),
    );
    await expect(gateway.getQuote('NONE')).rejects.toThrow(
      'not found on Finnhub',
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, false, 'Unauthorized'));
    await expect(gateway.getQuote('AAPL')).rejects.toThrow(
      'Finnhub HTTP Error: Unauthorized',
    );
  });

  it('maps Alpha Vantage responses and handles provider failures', async () => {
    const gateway = new AlphaVantageGatewayImpl('key');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        'Global Quote': {
          '02. open': '100.25',
          '05. price': '110.50',
          '08. previous close': '99.75',
        },
      }),
    );
    await expect(gateway.getQuote('aapl')).resolves.toMatchObject({
      symbol: 'AAPL',
      currentPrice: 110.5,
      openPrice: 100.25,
      closePrice: 99.75,
    });

    fetchSpy.mockResolvedValueOnce(jsonResponse({ 'Global Quote': {} }));
    await expect(gateway.getQuote('NONE')).rejects.toThrow(
      'rate limit reached',
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, false, 'Forbidden'));
    await expect(gateway.getQuote('AAPL')).rejects.toThrow(
      'Alpha Vantage HTTP Error: Forbidden',
    );
  });

  it('maps DataBursatil responses and handles provider failures', async () => {
    const gateway = new DataBursatilGatewayImpl('key');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        WALMEX: {
          precio_actual: '70.5',
          precio_apertura: '69.5',
          precio_cierre_anterior: '68.5',
        },
      }),
    );
    await expect(gateway.getQuote('WALMEX.MX')).resolves.toMatchObject({
      symbol: 'WALMEX.MX',
      currentPrice: 70.5,
      openPrice: 69.5,
      closePrice: 68.5,
    });
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('WALMEX'));

    fetchSpy.mockResolvedValueOnce(jsonResponse({}));
    await expect(gateway.getQuote('NONE.MX')).rejects.toThrow(
      'not found on DataBursatil',
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, false, 'Forbidden'));
    await expect(gateway.getQuote('WALMEX.MX')).rejects.toThrow(
      'DataBursatil HTTP Error: Forbidden',
    );
  });

  it('maps Marketstack responses and handles provider failures', async () => {
    const gateway = new MarketstackGatewayImpl('key');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        data: [{ close: 110, open: 100, date: '2026-01-02T00:00:00.000Z' }],
      }),
    );
    await expect(gateway.getQuote('aapl')).resolves.toMatchObject({
      symbol: 'AAPL',
      currentPrice: 110,
      openPrice: 100,
      closePrice: 110,
      marketTimestamp: new Date('2026-01-02T00:00:00.000Z'),
    });

    fetchSpy.mockResolvedValueOnce(jsonResponse({ data: [] }));
    await expect(gateway.getQuote('NONE')).rejects.toThrow(
      'not found on Marketstack',
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, false, 'Bad Request'));
    await expect(gateway.getQuote('AAPL')).rejects.toThrow(
      'Marketstack HTTP Error: Bad Request',
    );
  });

  it('maps Massive responses with and without fallback prices', async () => {
    const gateway = new MassiveGatewayImpl('key');
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ price: 110, open: 100, previousClose: 98 }),
    );
    await expect(gateway.getQuote('aapl')).resolves.toMatchObject({
      symbol: 'AAPL',
      currentPrice: 110,
      openPrice: 100,
      closePrice: 98,
    });

    fetchSpy.mockResolvedValueOnce(jsonResponse({ price: 110 }));
    await expect(gateway.getQuote('AAPL')).resolves.toMatchObject({
      openPrice: 110,
      closePrice: 110,
    });
    fetchSpy.mockResolvedValueOnce(jsonResponse({ price: 0 }));
    await expect(gateway.getQuote('NONE')).rejects.toThrow(
      'not found on Massive',
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse({}, false, 'Unauthorized'));
    await expect(gateway.getQuote('AAPL')).rejects.toThrow(
      'Massive HTTP Error: Unauthorized',
    );
  });
});
