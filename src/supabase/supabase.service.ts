import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UserToken {
  id?: string;
  supabase_user_id: string;
  user_seq_no: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string;
  scope: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserAccount {
  id?: string;
  user_seq_no: string;
  fintech_use_num: string;
  bank_code_std: string;
  bank_code_sub: string;
  bank_name: string;
  account_num_masked: string;
  account_holder_name: string;
  account_type: string;
  account_state: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>(
      'NEXT_PUBLIC_SUPABASE_URL',
      '',
    );
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_SECRET',
      '',
    );

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async saveUserToken(tokenData: UserToken): Promise<UserToken | null> {
    const { data, error } = await this.supabase
      .from('user_tokens')
      .upsert(
        {
          supabase_user_id: tokenData.supabase_user_id,
          user_seq_no: tokenData.user_seq_no,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          expires_at: tokenData.expires_at,
          scope: tokenData.scope,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'supabase_user_id',
        },
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving user token:', error);
      return null;
    }

    return data;
  }

  async getUserTokenBySupabaseId(
    supabaseUserId: string,
  ): Promise<UserToken | null> {
    const { data, error } = await this.supabase
      .from('user_tokens')
      .select('*')
      .eq('supabase_user_id', supabaseUserId)
      .maybeSingle();

    if (error) {
      console.error('Error getting user token by supabase id:', error);
      return null;
    }

    return data;
  }

  async getUserToken(userSeqNo: string): Promise<UserToken | null> {
    const { data, error } = await this.supabase
      .from('user_tokens')
      .select('*')
      .eq('user_seq_no', userSeqNo)
      .maybeSingle();

    if (error) {
      console.error('Error getting user token:', error);
      return null;
    }

    return data;
  }

  async deleteUserToken(userSeqNo: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_tokens')
      .delete()
      .eq('user_seq_no', userSeqNo);

    if (error) {
      console.error('Error deleting user token:', error);
      return false;
    }

    return true;
  }

  async saveUserAccount(accountData: UserAccount): Promise<UserAccount | null> {
    const { data, error } = await this.supabase
      .from('user_accounts')
      .upsert(
        {
          user_seq_no: accountData.user_seq_no,
          fintech_use_num: accountData.fintech_use_num,
          bank_code_std: accountData.bank_code_std,
          bank_code_sub: accountData.bank_code_sub,
          bank_name: accountData.bank_name,
          account_num_masked: accountData.account_num_masked,
          account_holder_name: accountData.account_holder_name,
          account_type: accountData.account_type,
          account_state: accountData.account_state,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'fintech_use_num',
        },
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving user account:', error);
      return null;
    }

    return data;
  }

  async getUserAccounts(userSeqNo: string): Promise<UserAccount[]> {
    const { data, error } = await this.supabase
      .from('user_accounts')
      .select('*')
      .eq('user_seq_no', userSeqNo);

    if (error) {
      console.error('Error getting user accounts:', error);
      return [];
    }

    return data || [];
  }

  async getUserAccountByFintechNum(
    fintechUseNum: string,
  ): Promise<UserAccount | null> {
    const { data, error } = await this.supabase
      .from('user_accounts')
      .select('*')
      .eq('fintech_use_num', fintechUseNum)
      .maybeSingle();

    if (error) {
      console.error('Error getting user account:', error);
      return null;
    }

    return data;
  }

  async deleteUserAccount(fintechUseNum: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_accounts')
      .delete()
      .eq('fintech_use_num', fintechUseNum);

    if (error) {
      console.error('Error deleting user account:', error);
      return false;
    }

    return true;
  }
}
