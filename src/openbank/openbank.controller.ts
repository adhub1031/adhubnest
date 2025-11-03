import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OpenBankService } from './openbank.service';
import { AuthCallbackDto } from './dto/auth-callback.dto';
import { BalanceInquiryDto } from './dto/balance-inquiry.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('OpenBank')
@Controller('api/openbank')
export class OpenBankController {
  constructor(private readonly openBankService: OpenBankService) {}

  @Get('auth-url')
  @ApiOperation({
    summary: '오픈뱅킹 인증 URL 가져오기 (Swagger 테스트용)',
    description:
      '오픈뱅킹 인증 URL을 반환합니다. 반환된 URL을 브라우저에서 직접 열어주세요.',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    description: 'Supabase 사용자 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '인증 URL 반환',
    schema: {
      example: {
        message: 'Open the authUrl in your browser to authenticate',
        authUrl: 'https://testapi.openbanking.or.kr/oauth/2.0/authorize?...',
        state: '550e8400-e29b-41d4-a716-446655440000',
      },
    },
  })
  getAuthUrl(@Query('state') state: string) {
    const authState = state || Math.random().toString(36).substring(7);
    const authUrl = this.openBankService.getAuthorizationUrl(authState);
    return {
      message: 'Open the authUrl in your browser to authenticate',
      authUrl,
      state: authState,
    };
  }

  @Get('auth')
  @ApiOperation({
    summary: '오픈뱅킹 인증 시작 (브라우저에서 직접 열기)',
    description:
      '오픈뱅킹 인증 페이지로 리다이렉트합니다. 브라우저 주소창에서 직접 URL을 열어야 합니다. Swagger에서는 작동하지 않습니다.',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    description: 'Supabase 사용자 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 302,
    description: '오픈뱅킹 인증 페이지로 리다이렉트',
  })
  authorize(@Query('state') state: string, @Res() res: Response) {
    const authState = state || Math.random().toString(36).substring(7);
    const authUrl = this.openBankService.getAuthorizationUrl(authState);
    return res.redirect(authUrl);
  }

  @Get('callback')
  @ApiOperation({
    summary: '오픈뱅킹 인증 콜백',
    description: '오픈뱅킹 인증 후 자동으로 호출되는 엔드포인트입니다.',
  })
  @ApiResponse({
    status: 200,
    description: '인증 성공',
  })
  @ApiResponse({
    status: 400,
    description: '인증 실패',
  })
  async handleCallback(
    @Query() query: AuthCallbackDto,
    @Res() res: Response,
  ) {
    try {
      const supabaseUserId = query.state;
      const tokenData = await this.openBankService.getAccessToken(
        query.code,
        supabaseUserId,
      );

      return res.status(HttpStatus.OK).json({
        message: 'Authentication successful',
        data: {
          user_seq_no: tokenData.user_seq_no,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Authentication failed',
        error: error.message,
      });
    }
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('balance')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: '잔액 조회',
    description: '특정 계좌의 잔액을 조회합니다. Supabase 인증 토큰이 필요합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '잔액 조회 성공',
    schema: {
      example: {
        message: 'Balance inquiry successful',
        data: {
          api_tran_id: '0db8a62f1U20250103152030123456',
          rsp_code: 'A0000',
          rsp_message: '정상처리되었습니다',
          balance_amt: 1250000,
          available_amt: 1250000,
          bank_name: 'KB국민은행',
          account_num_masked: '123-******-1234',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패 또는 오픈뱅킹 인증 필요',
  })
  async getBalance(
    @CurrentUser() user: any,
    @Body() balanceInquiry: BalanceInquiryDto,
  ) {
    const balance = await this.openBankService.getBalance(
      user.id,
      balanceInquiry,
    );

    return {
      message: 'Balance inquiry successful',
      data: balance,
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('accounts')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: '계좌 목록 조회',
    description: '연결된 은행 계좌 목록을 조회합니다. Supabase 인증 토큰이 필요합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '계좌 목록 조회 성공',
    schema: {
      example: {
        message: 'Account list retrieved successfully',
        data: {
          rsp_code: 'A0000',
          rsp_message: '정상처리되었습니다',
          res_cnt: 2,
          res_list: [
            {
              fintech_use_num: '123456789012345678901234',
              bank_code_std: '004',
              bank_name: 'KB국민은행',
              account_num_masked: '123-******-1234',
              account_holder_name: '홍길동',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패 또는 오픈뱅킹 인증 필요',
  })
  async getAccounts(@CurrentUser() user: any) {
    const accounts = await this.openBankService.getUserAccountList(user.id);

    return {
      message: 'Account list retrieved successfully',
      data: accounts,
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('auth-status')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: '인증 상태 확인',
    description: '현재 사용자의 오픈뱅킹 인증 상태를 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '인증 상태 조회 성공',
    schema: {
      example: {
        message: 'Authentication status retrieved',
        data: {
          is_authenticated: true,
          user_seq_no: '1100123456',
          expires_at: '2025-04-03T15:20:30.000Z',
        },
      },
    },
  })
  async checkAuthStatus(@CurrentUser() user: any) {
    const status = await this.openBankService.isUserAuthenticated(user.id);

    return {
      message: 'Authentication status retrieved',
      data: status,
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('refresh-token')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: '토큰 갱신',
    description: '만료된 오픈뱅킹 토큰을 갱신합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  async refreshToken(@CurrentUser() user: any) {
    const tokenData = await this.openBankService.refreshAccessToken(user.id);

    return {
      message: 'Token refreshed successfully',
      data: {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
      },
    };
  }
}
