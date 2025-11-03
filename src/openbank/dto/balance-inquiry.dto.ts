import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BalanceInquiryDto {
  @ApiProperty({
    description: '핀테크 이용번호 (계좌 목록 조회에서 받은 값)',
    example: '123456789012345678901234',
  })
  @IsString()
  @IsNotEmpty()
  fintech_use_num: string;

  @ApiProperty({
    description: '거래 일시 (YYYYMMDDHHmmss 형식)',
    example: '20250103152030',
  })
  @IsString()
  @IsNotEmpty()
  tran_dtime: string;
}

export class BalanceInquiryRequestDto {
  @ApiProperty({
    description: '은행 거래 고유번호',
    example: '0db8a62f1U20250103152030123456',
  })
  @IsString()
  @IsNotEmpty()
  bank_tran_id: string;

  @ApiProperty({
    description: '핀테크 이용번호',
    example: '123456789012345678901234',
  })
  @IsString()
  @IsNotEmpty()
  fintech_use_num: string;

  @ApiProperty({
    description: '거래 일시 (YYYYMMDDHHmmss 형식)',
    example: '20250103152030',
  })
  @IsString()
  @IsNotEmpty()
  tran_dtime: string;
}
