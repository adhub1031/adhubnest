import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class IdeasService {
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL', '');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_SECRET', '');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 문서 목록
  async getDocuments() {
    const { data, error } = await this.supabase
      .from('idea_documents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // 문서 상세
  async getDocument(id: string) {
    const { data, error } = await this.supabase
      .from('idea_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // 문서 생성
  async createDocument(dto: CreateDocumentDto, userId: string) {
    const { data, error } = await this.supabase
      .from('idea_documents')
      .insert({ ...dto, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 문서 업데이트
  async updateDocument(id: string, dto: UpdateDocumentDto, userId: string) {
    const { data, error } = await this.supabase
      .from('idea_documents')
      .update({ ...dto, updated_by: userId })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 문서 삭제
  async deleteDocument(id: string) {
    const { error } = await this.supabase
      .from('idea_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // 최신 스냅샷 가져오기
  async getLatestSnapshot(docId: string) {
    const { data, error } = await this.supabase
      .from('idea_snapshots')
      .select('*')
      .eq('doc_id', docId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // 스냅샷 저장
  async saveSnapshot(docId: string, snapshot: Buffer, version: number) {
    const { data, error } = await this.supabase
      .from('idea_snapshots')
      .insert({
        doc_id: docId,
        version,
        ydoc_snapshot: snapshot
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
