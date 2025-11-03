-- Create user_tokens table
CREATE TABLE IF NOT EXISTS public.user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    user_seq_no VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    expires_in INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_accounts table
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_seq_no VARCHAR(255) NOT NULL,
    fintech_use_num VARCHAR(255) NOT NULL UNIQUE,
    bank_code_std VARCHAR(10) NOT NULL,
    bank_code_sub VARCHAR(10),
    bank_name VARCHAR(100) NOT NULL,
    account_num_masked VARCHAR(100) NOT NULL,
    account_holder_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(10) NOT NULL,
    account_state VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_tokens_supabase_user_id ON public.user_tokens(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_seq_no ON public.user_tokens(user_seq_no);
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_seq_no ON public.user_accounts(user_seq_no);
CREATE INDEX IF NOT EXISTS idx_user_accounts_fintech_use_num ON public.user_accounts(fintech_use_num);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_tokens
CREATE POLICY "Users can view their own tokens"
    ON public.user_tokens
    FOR SELECT
    USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can insert their own tokens"
    ON public.user_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = supabase_user_id);

CREATE POLICY "Users can update their own tokens"
    ON public.user_tokens
    FOR UPDATE
    USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can delete their own tokens"
    ON public.user_tokens
    FOR DELETE
    USING (auth.uid() = supabase_user_id);

-- Create RLS policies for user_accounts
CREATE POLICY "Users can view their own accounts"
    ON public.user_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_tokens
            WHERE user_tokens.user_seq_no = user_accounts.user_seq_no
            AND user_tokens.supabase_user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage user_accounts"
    ON public.user_accounts
    FOR ALL
    USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_tokens_updated_at
    BEFORE UPDATE ON public.user_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_accounts_updated_at
    BEFORE UPDATE ON public.user_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to service role
GRANT ALL ON public.user_tokens TO service_role;
GRANT ALL ON public.user_accounts TO service_role;
