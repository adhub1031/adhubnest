export interface OpenBankConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  user_seq_no: string;
}

export interface BalanceResponse {
  api_tran_id: string;
  api_tran_dtm: string;
  rsp_code: string;
  rsp_message: string;
  bank_code_std: string;
  bank_code_sub: string;
  bank_name: string;
  account_num_masked: string;
  account_holder_name: string;
  account_type: string;
  account_state: string;
  balance_amt: number;
  available_amt: number;
  account_issue_date: string;
  last_tran_date: string;
}

export interface AccountInfo {
  fintech_use_num: string;
  bank_code_std: string;
  bank_code_sub: string;
  bank_name: string;
  account_num_masked: string;
  account_holder_name: string;
  account_type: string;
  account_state: string;
}

export interface UserTokenInfo {
  user_seq_no: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}
