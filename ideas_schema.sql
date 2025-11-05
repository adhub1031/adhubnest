-- Ideas 모듈 테이블 생성 스크립트

-- 1. 폴더 테이블
CREATE TABLE IF NOT EXISTS public.idea_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES public.idea_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 문서 테이블
CREATE TABLE IF NOT EXISTS public.idea_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  folder_id UUID REFERENCES public.idea_folders(id) ON DELETE SET NULL,
  content JSONB, -- ProseMirror JSON
  markdown TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Y.js 스냅샷 테이블
CREATE TABLE IF NOT EXISTS public.idea_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.idea_documents(id) ON DELETE CASCADE,
  version BIGINT NOT NULL,
  ydoc_snapshot BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 첨부파일 테이블
CREATE TABLE IF NOT EXISTS public.idea_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.idea_documents(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_idea_folders_parent_id ON public.idea_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_idea_documents_folder_id ON public.idea_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_idea_documents_created_by ON public.idea_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_idea_snapshots_doc_id ON public.idea_snapshots(doc_id);
CREATE INDEX IF NOT EXISTS idx_idea_snapshots_version ON public.idea_snapshots(doc_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_idea_attachments_doc_id ON public.idea_attachments(doc_id);

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_idea_folders_updated_at ON public.idea_folders;
CREATE TRIGGER update_idea_folders_updated_at
  BEFORE UPDATE ON public.idea_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_idea_documents_updated_at ON public.idea_documents;
CREATE TRIGGER update_idea_documents_updated_at
  BEFORE UPDATE ON public.idea_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_idea_attachments_updated_at ON public.idea_attachments;
CREATE TRIGGER update_idea_attachments_updated_at
  BEFORE UPDATE ON public.idea_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책
ALTER TABLE public.idea_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_attachments ENABLE ROW LEVEL SECURITY;

-- Admin 사용자만 모든 작업 가능
CREATE POLICY "Admin can do everything on idea_folders"
  ON public.idea_folders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );

CREATE POLICY "Admin can do everything on idea_documents"
  ON public.idea_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );

CREATE POLICY "Admin can do everything on idea_snapshots"
  ON public.idea_snapshots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );

CREATE POLICY "Admin can do everything on idea_attachments"
  ON public.idea_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );

-- Supabase Storage 버킷 생성 (Supabase Dashboard에서 수동 생성 필요)
-- 버킷 이름: 'ideas'
-- Public: true (공개 URL 사용 시)
