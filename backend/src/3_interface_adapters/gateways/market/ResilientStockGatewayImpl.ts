// src/3_interface_adapters/gateways/market/ResilientStockGatewayImpl.ts
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';

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

  public async getQuote(symbol: string): Promise<StockQuote> {
    if (symbol.toUpperCase().endsWith('.MX')) {
      try {
        return await this.dataBursatil.getQuote(symbol);
      } catch {
        console.warn(
          `[Gateway] DataBursatil falló para ${symbol}. Buscando en motores internacionales...`,
        );
      }
    }

    for (const gateway of this.fallbacks) {
      try {
        return await gateway.getQuote(symbol);
      } catch {
        const gatewayName = gateway.constructor.name;
        console.warn(
          `[Gateway Fallback] ${gatewayName} falló para ${symbol}. Saltando al siguiente...`,
        );
        continue;
      }
    }

    throw new Error(
      `[Gateway Fatal] All market APIs failed for symbol: ${symbol}`,
    );
  }
}
