import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  OpenBankConfig,
  TokenResponse,
  BalanceResponse,
  UserTokenInfo,
} from './interfaces/openbank.interface';
import { BalanceInquiryDto } from './dto/balance-inquiry.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class OpenBankService {
  private config: OpenBankConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.config = {
      apiBaseUrl: this.configService.get<string>('OPENBANK_API_BASE_URL', 'https://testapi.openbanking.or.kr'),
      clientId: this.configService.get<string>('OPEN_BANK_CLIENT_ID', ''),
      clientSecret: this.configService.get<string>('OPEN_BANK_CLIENT_SECRET', ''),
      redirectUri: this.configService.get<string>(
        'OPENBANK_REDIRECT_URI',
        'http://localhost:4000/api/openbank/callback',
      ),
    };
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'login inquiry',
      state: state,
      auth_type: '0',
    });

    return `${this.config.apiBaseUrl}/oauth/2.0/authorize?${params.toString()}`;
  }

  async getAccessToken(
    code: string,
    supabaseUserId: string,
  ): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code: code,
      });

      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(
          `${this.config.apiBaseUrl}/oauth/2.0/token`,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const tokenData = response.data;
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      await this.supabaseService.saveUserToken({
        supabase_user_id: supabaseUserId,
        user_seq_no: tokenData.user_seq_no,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope,
      });

      return tokenData;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to get access token',
          error: error.response?.data || error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async refreshAccessToken(supabaseUserId: string): Promise<TokenResponse> {
    const userToken =
      await this.supabaseService.getUserTokenBySupabaseId(supabaseUserId);
    if (!userToken) {
      throw new HttpException(
        'User token not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: userToken.refresh_token,
        scope: 'login inquiry transfer',
      });

      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(
          `${this.config.apiBaseUrl}/oauth/2.0/token`,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const tokenData = response.data;
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      await this.supabaseService.saveUserToken({
        supabase_user_id: supabaseUserId,
        user_seq_no: tokenData.user_seq_no,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        expires_at: expiresAt.toISOString(),
        scope: tokenData.scope,
      });

      return tokenData;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to refresh access token',
          error: error.response?.data || error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getBalance(
    supabaseUserId: string,
    balanceInquiry: BalanceInquiryDto,
  ): Promise<BalanceResponse> {
    let userToken =
      await this.supabaseService.getUserTokenBySupabaseId(supabaseUserId);
    if (!userToken) {
      throw new HttpException(
        {
          message: 'Open banking authentication required',
          error: 'OPENBANK_AUTH_REQUIRED',
          authUrl: `${this.config.apiBaseUrl}/oauth/2.0/authorize?response_type=code&client_id=${this.config.clientId}&redirect_uri=${this.config.redirectUri}&scope=login inquiry transfer&state=${supabaseUserId}&auth_type=0`,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (new Date() >= new Date(userToken.expires_at)) {
      await this.refreshAccessToken(supabaseUserId);
      userToken =
        await this.supabaseService.getUserTokenBySupabaseId(supabaseUserId);
    }

    if (!userToken) {
      throw new HttpException(
        'Failed to get user token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const bankTranId = this.generateBankTranId();

      const requestBody = {
        bank_tran_id: bankTranId,
        fintech_use_num: balanceInquiry.fintech_use_num,
        tran_dtime: balanceInquiry.tran_dtime,
      };

      const response = await firstValueFrom(
        this.httpService.post<BalanceResponse>(
          `${this.config.apiBaseUrl}/v2.0/account/balance/finn`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken.access_token}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to get balance',
          error: error.response?.data || error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getUserAccountList(supabaseUserId: string): Promise<any> {
    let userToken =
      await this.supabaseService.getUserTokenBySupabaseId(supabaseUserId);
    if (!userToken) {
      throw new HttpException(
        {
          message: 'Open banking authentication required',
          error: 'OPENBANK_AUTH_REQUIRED',
          authUrl: `${this.config.apiBaseUrl}/oauth/2.0/authorize?response_type=code&client_id=${this.config.clientId}&redirect_uri=${this.config.redirectUri}&scope=login inquiry transfer&state=${supabaseUserId}&auth_type=0`,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (new Date() >= new Date(userToken.expires_at)) {
      await this.refreshAccessToken(supabaseUserId);
      userToken =
        await this.supabaseService.getUserTokenBySupabaseId(supabaseUserId);
    }

    if (!userToken) {
      throw new HttpException(
        'Failed to get user token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const requestBody = {
        user_seq_no: userToken.user_seq_no,
        include_cancel_yn: 'N',
        sort_order: 'D',
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.config.apiBaseUrl}/v2.0/account/list`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken.access_token}`,
            },
          },
        ),
      );

      const accounts = response.data.res_list || [];
      for (const account of accounts) {
        await this.supabaseService.saveUserAccount({
          user_seq_no: userToken.user_seq_no,
          fintech_use_num: account.fintech_use_num,
          bank_code_std: account.bank_code_std,
          bank_code_sub: account.bank_code_sub,
          bank_name: account.bank_name,
          account_num_masked: account.account_num_masked,
          account_holder_name: account.account_holder_name,
          account_type: account.account_type,
          account_state: account.account_state,
        });
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        {
          message: 'Failed to get user account list',
          error: error.response?.data || error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private generateBankTranId(): string {
    const clientUseCode = this.config.clientId.substring(0, 9);
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14);
    const randomNum = String(Math.floor(Math.random() * 1000000)).padStart(
      6,
      '0',
    );
    return `${clientUseCode}U${timestamp}${randomNum}`;
  }

  async isUserAuthenticated(supabaseUserId: string): Promise<{
    is_authenticated: boolean;
    user_seq_no?: string;
    expires_at?: string;
  }> {
    const userToken =
      await this.supabaseService.getUserTokenBySupabaseId(supabaseUserId);
    if (!userToken) {
      return { is_authenticated: false };
    }
    const isAuthenticated = new Date() < new Date(userToken.expires_at);
    return {
      is_authenticated: isAuthenticated,
      user_seq_no: userToken.user_seq_no,
      expires_at: userToken.expires_at,
    };
  }
}
