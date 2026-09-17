// src/3_interface_adapters/gateways/market/ResilientStockGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';
import {
  MarketServiceUnavailableException,
  ProviderRateLimitException,
  SymbolNotFoundException,
} from '../../../1_entities/market/MarketExceptions';

export class ResilientStockGatewayImpl implements IStockMarketQueryGateway {
  private fallbacks: IStockMarketQueryGateway[];

  constructor(
    private readonly yahoo: IStockMarketQueryGateway,
    private readonly finnhub: IStockMarketQueryGateway,
    private readonly alphaVantage: IStockMarketQueryGateway,
    private readonly marketstack: IStockMarketQueryGateway,
    private readonly massive: IStockMarketQueryGateway,
    private readonly dataBursatil: IStockMarketQueryGateway,
  ) {
    this.fallbacks = [yahoo, finnhub, alphaVantage, massive, marketstack];
  }

  public async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    try {
      return await this.yahoo.searchSymbols(query);
    } catch (error: unknown) {
      if (error instanceof ProviderRateLimitException) throw error;
      if (error instanceof SymbolNotFoundException) throw error;
      throw new MarketServiceUnavailableException(
        'Symbol search is temporarily unavailable',
      );
    }
  }

  public async getQuote(symbol: string): Promise<StockQuote> {
    const failures: unknown[] = [];

    if (symbol.toUpperCase().endsWith('.MX')) {
      try {
        return await this.dataBursatil.getQuote(symbol);
      } catch (error: unknown) {
        failures.push(error);
        console.warn(
          `[Gateway] DataBursatil falló para ${symbol}. Buscando en motores internacionales...`,
        );
      }
    }

    for (const gateway of this.fallbacks) {
      try {
        return await gateway.getQuote(symbol);
      } catch (error: unknown) {
        failures.push(error);
        const gatewayName = gateway.constructor.name;
        console.warn(
          `[Gateway Fallback] ${gatewayName} falló para ${symbol}. Saltando al siguiente...`,
        );
        continue;
      }
    }

    if (
      failures.length > 0 &&
      failures.every((error) => error instanceof SymbolNotFoundException)
    ) {
      throw new SymbolNotFoundException(symbol);
    }
    if (failures.some((error) => error instanceof ProviderRateLimitException)) {
      throw new ProviderRateLimitException();
    }
    throw new MarketServiceUnavailableException(
      `All market data providers are unavailable for ${symbol.toUpperCase()}`,
    );
  }
}
