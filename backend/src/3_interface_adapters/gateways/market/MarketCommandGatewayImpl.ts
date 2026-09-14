import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IMarketCommandGateway } from '../../../2_use_cases/market/shared_ports/IMarketCommandGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { PrismaService } from '../db/PrismaService';
import { IHistoricalMarketDataRepository } from '../../../2_use_cases/market/get_batch_market_data/IBatchMarketDataGateway';

@Injectable()
export class MarketCommandGatewayImpl
  implements IMarketCommandGateway, IHistoricalMarketDataRepository
{
  constructor(private readonly prisma: PrismaService) {}

  public async saveQuote(stock: StockQuote): Promise<void> {
    try {
      await this.prisma.stockHistory.create({
        data: {
          currentPrice: stock.currentPrice,
          openPrice: stock.openPrice,
          closePrice: stock.closePrice,
          high: stock.high,
          low: stock.low,
          volume: stock.volume,
          interval: stock.interval,
          marketTimestamp: stock.marketTimestamp,

          monitoredStock: {
            connectOrCreate: {
              where: { symbol: stock.symbol },
              create: {
                symbol: stock.symbol,
                companyName: stock.companyName,
                isActive: true,
              },
            },
          },
        },
      });
    } catch {
      throw new InternalServerErrorException(
        `Error saving stock quote history for ${stock.symbol} in database`,
      );
    }
  }

  public async saveHistorical(quotes: StockQuote[]): Promise<void> {
    if (quotes.length === 0) return;

    try {
      const first = quotes[0];
      await this.prisma.monitoredStock.upsert({
        where: { symbol: first.symbol },
        update: { companyName: first.companyName },
        create: {
          symbol: first.symbol,
          companyName: first.companyName,
          isActive: true,
        },
      });
      await this.prisma.stockHistory.createMany({
        data: quotes.map((quote) => ({
          symbol: quote.symbol,
          currentPrice: quote.currentPrice,
          openPrice: quote.openPrice,
          closePrice: quote.closePrice,
          high: quote.high,
          low: quote.low,
          volume: quote.volume,
          interval: quote.interval,
          marketTimestamp: quote.marketTimestamp,
          createdAt: quote.fetchedAt,
        })),
        skipDuplicates: true,
      });
    } catch {
      throw new InternalServerErrorException(
        `Error saving historical market data for ${quotes[0].symbol}`,
      );
    }
  }
}
