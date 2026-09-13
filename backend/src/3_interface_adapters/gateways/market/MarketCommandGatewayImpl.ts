import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IMarketCommandGateway } from '../../../2_use_cases/market/shared_ports/IMarketCommandGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { PrismaService } from '../db/PrismaService';

@Injectable()
export class MarketCommandGatewayImpl implements IMarketCommandGateway {
  constructor(private readonly prisma: PrismaService) {}

  public async saveQuote(stock: StockQuote): Promise<void> {
    try {
      await this.prisma.stockHistory.create({
        data: {
          currentPrice: stock.currentPrice,
          openPrice: stock.openPrice,
          closePrice: stock.closePrice,
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
}
