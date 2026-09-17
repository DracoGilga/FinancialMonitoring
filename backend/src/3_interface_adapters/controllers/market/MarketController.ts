// src/3_interface_adapters/controllers/market/MarketController.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseFilters,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/JwtAuthGuard';
import { IGetStockQuoteInputPort } from '../../../2_use_cases/market/get_stock_quote/IGetStockQuoteInputPort';
import { GetStockQuoteRequest } from '../../../2_use_cases/market/get_stock_quote/GetStockQuoteRequest';
import { GetStockDto } from './dto/GetStockDto';
import { IGetBatchMarketDataInputPort } from '../../../2_use_cases/market/get_batch_market_data/IGetBatchMarketDataInputPort';
import { GetBatchMarketDataRequest } from '../../../2_use_cases/market/get_batch_market_data/GetBatchMarketDataRequest';
import { ISearchSymbolsInputPort } from '../../../2_use_cases/market/search_symbols/ISearchSymbolsInputPort';
import { MarketExceptionFilter } from './filters/MarketExceptionFilter';

@ApiTags('Market')
@Controller('market')
@UseGuards(JwtAuthGuard)
@UseFilters(MarketExceptionFilter)
@ApiBearerAuth()
export class MarketController {
  constructor(
    @Inject('IGetStockQuoteInputPort')
    private readonly getStockQuoteUseCase: IGetStockQuoteInputPort,
    @Inject('IGetBatchMarketDataInputPort')
    private readonly getBatchMarketDataUseCase: IGetBatchMarketDataInputPort,
    @Inject('ISearchSymbolsInputPort')
    private readonly searchSymbolsUseCase: ISearchSymbolsInputPort,
  ) {}

  @Get('batch')
  @ApiOperation({
    summary: 'Get one-year and five-minute data for top companies',
  })
  @ApiQuery({
    name: 'symbols',
    required: false,
    type: String,
    example: 'AAPL,AMZN,MSFT',
    description:
      'Comma-separated stock symbols. Defaults to the top companies.',
  })
  @ApiResponse({ status: 200, description: 'Batch market data retrieved' })
  @ApiResponse({ status: 404, description: 'A requested symbol was not found' })
  @ApiResponse({ status: 429, description: 'Provider rate limit exceeded' })
  @ApiResponse({ status: 503, description: 'Market providers unavailable' })
  async getBatchMarketData(@Query('symbols') symbols?: string) {
    const result = await this.getBatchMarketDataUseCase.execute(
      new GetBatchMarketDataRequest(symbols),
    );
    if (result.status === 'error') {
      throw new HttpException(result.message, HttpStatus.BAD_GATEWAY);
    }
    return result;
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search supported market symbols by company name or ticker',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    example: 'Apple',
    description: 'Company name or ticker symbol to search for.',
  })
  @ApiResponse({ status: 200, description: 'Normalized symbols and metadata' })
  @ApiResponse({ status: 400, description: 'Search query is required' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 404, description: 'No matching symbol was found' })
  @ApiResponse({ status: 429, description: 'Provider rate limit exceeded' })
  @ApiResponse({ status: 503, description: 'Symbol search unavailable' })
  async searchSymbols(@Query('query') query?: string) {
    if (!query?.trim()) {
      throw new HttpException(
        'Search query is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.searchSymbolsUseCase.execute(query);
  }

  @Get('quote/:symbol')
  @ApiOperation({ summary: 'Get current stock market quote by symbol' })
  @ApiResponse({
    status: 200,
    description: 'Stock quote retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid stock symbol' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({
    status: 404,
    description: 'Stock symbol not found in providers',
  })
  @ApiResponse({ status: 429, description: 'Provider rate limit exceeded' })
  @ApiResponse({ status: 503, description: 'Market providers unavailable' })
  async getStockQuote(@Param() params: GetStockDto) {
    const request = new GetStockQuoteRequest(params.symbol.toUpperCase());
    const result = await this.getStockQuoteUseCase.execute(request);

    if (result.status === 'error') {
      throw new HttpException(
        result.message || 'Error fetching stock data',
        HttpStatus.BAD_REQUEST,
      );
    }

    return result;
  }
}
