// src/3_interface_adapters/controllers/market/MarketController.ts
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/JwtAuthGuard';
import { IGetStockQuoteInputPort } from '../../../2_use_cases/market/get_stock_quote/IGetStockQuoteInputPort';
import { GetStockQuoteRequest } from '../../../2_use_cases/market/get_stock_quote/GetStockQuoteRequest';
import { GetStockDto } from './dto/GetStockDto';

@ApiTags('Market')
@Controller('market')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketController {
  constructor(
    @Inject('IGetStockQuoteInputPort')
    private readonly getStockQuoteUseCase: IGetStockQuoteInputPort,
  ) {}

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
