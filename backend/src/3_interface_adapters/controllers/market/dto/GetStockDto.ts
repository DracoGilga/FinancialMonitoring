// src/3_interface_adapters/controllers/market/dto/GetStockDto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class GetStockDto {
  @ApiProperty({
    description: 'Stock symbol / ticker (e.g. AAPL, TSLA)',
    example: 'AAPL',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{1,5}$/, { message: 'Invalid stock symbol format' })
  symbol!: string;
}
