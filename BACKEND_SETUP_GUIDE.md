# NestJS 백엔드 설정 가이드 (아이디어 협업 에디터)

## 📍 작업 위치
```
C:\Users\PC\WebstormProjects\adhubnest\
```

---

## 1️⃣ 필요한 패키지 설치

### adhubnest 폴더에서 실행:
```bash
cd C:\Users\PC\WebstormProjects\adhubnest

# WebSocket 관련
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# 파일 업로드
npm install @nestjs/platform-express multer
npm install --save-dev @types/multer

# Y.js (협업 동기화)
npm install yjs y-websocket

# Markdown 변환
npm install remark remark-gfm remark-html
npm install --save-dev @types/remark
```

---

## 2️⃣ 모듈 구조 생성

### 폴더 구조:
```
adhubnest/src/
├── ideas/                          # 아이디어 에디터 모듈
│   ├── ideas.module.ts
│   ├── ideas.controller.ts         # REST API
│   ├── ideas.service.ts            # 비즈니스 로직
│   ├── ideas.gateway.ts            # WebSocket
│   ├── dto/
│   │   ├── create-folder.dto.ts
│   │   ├── create-document.dto.ts
│   │   └── update-document.dto.ts
│   └── entities/
│       ├── folder.entity.ts
│       └── document.entity.ts
├── upload/                         # 이미지 업로드
│   ├── upload.module.ts
│   ├── upload.controller.ts
│   └── upload.service.ts
└── guards/
    └── admin.guard.ts              # 관리자 권한 체크
```

---

## 3️⃣ Admin Guard 구현

### `src/guards/admin.guard.ts`
```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AdminGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      // Supabase로 JWT 검증
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid token');
      }

      // user_metadata.role이 'admin'인지 확인
      const role = user.user_metadata?.role;
      if (role !== 'admin') {
        throw new ForbiddenException('Admin access only');
      }

      // request에 user 정보 추가
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
```

---

## 4️⃣ Ideas Module 구현

### `src/ideas/dto/create-folder.dto.ts`
```typescript
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;
}
```

### `src/ideas/dto/create-document.dto.ts`
```typescript
import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  folder_id?: string;

  @IsOptional()
  @IsObject()
  content?: any;  // ProseMirror JSON

  @IsOptional()
  @IsString()
  markdown?: string;
}
```

### `src/ideas/dto/update-document.dto.ts`
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
```

### `src/ideas/ideas.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class IdeasService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  // 폴더 목록
  async getFolders() {
    const { data, error } = await this.supabase
      .from('idea_folders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // 폴더 생성
  async createFolder(dto: CreateFolderDto) {
    const { data, error } = await this.supabase
      .from('idea_folders')
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 문서 목록 (폴더별 필터)
  async getDocuments(folderId?: string) {
    let query = this.supabase
      .from('idea_documents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query;
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
  async updateDocument(id: string, dto: UpdateDocumentDto) {
    const { data, error } = await this.supabase
      .from('idea_documents')
      .update(dto)
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
```

### `src/ideas/ideas.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { IdeasService } from './ideas.service';
import { AdminGuard } from '../guards/admin.guard';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Response } from 'express';

@Controller('api/ideas')
@UseGuards(AdminGuard)
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  // 폴더 목록
  @Get('folders')
  async getFolders() {
    return this.ideasService.getFolders();
  }

  // 폴더 생성
  @Post('folders')
  async createFolder(@Body() dto: CreateFolderDto) {
    return this.ideasService.createFolder(dto);
  }

  // 문서 목록
  @Get('documents')
  async getDocuments(@Query('folderId') folderId?: string) {
    return this.ideasService.getDocuments(folderId);
  }

  // 문서 상세
  @Get('documents/:id')
  async getDocument(@Param('id') id: string) {
    return this.ideasService.getDocument(id);
  }

  // 문서 생성
  @Post('documents')
  async createDocument(@Body() dto: CreateDocumentDto, @Req() req: any) {
    const userId = req.user.id;
    return this.ideasService.createDocument(dto, userId);
  }

  // 문서 업데이트
  @Put('documents/:id')
  async updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.ideasService.updateDocument(id, dto);
  }

  // 문서 삭제
  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    return this.ideasService.deleteDocument(id);
  }

  // Markdown export
  @Get('documents/:id/export')
  async exportMarkdown(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.ideasService.getDocument(id);
    const markdown = doc.markdown || '# ' + doc.title;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.md"`);
    res.send(markdown);
  }
}
```

---

## 5️⃣ WebSocket Gateway 구현

### `src/ideas/ideas.gateway.ts`
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { IdeasService } from './ideas.service';
import * as Y from 'yjs';

@WebSocketGateway({
  namespace: '/ideas',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class IdeasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // 문서별 Y.Doc 저장 (메모리 캐시)
  private docs: Map<string, Y.Doc> = new Map();

  constructor(private readonly ideasService: IdeasService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // 문서 접속
  @SubscribeMessage('join-document')
  async handleJoinDocument(
    @MessageBody() data: { docId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { docId } = data;
    client.join(docId);

    // Y.Doc 초기화 or 로드
    if (!this.docs.has(docId)) {
      const ydoc = new Y.Doc();

      // DB에서 최신 스냅샷 로드
      const snapshot = await this.ideasService.getLatestSnapshot(docId);
      if (snapshot && snapshot.ydoc_snapshot) {
        Y.applyUpdate(ydoc, snapshot.ydoc_snapshot);
      }

      this.docs.set(docId, ydoc);
    }

    const ydoc = this.docs.get(docId);
    const state = Y.encodeStateAsUpdate(ydoc);

    // 현재 상태를 클라이언트에 전송
    client.emit('document-state', { state: Array.from(state) });
  }

  // 문서 업데이트 (다른 클라이언트에 브로드캐스트)
  @SubscribeMessage('document-update')
  async handleUpdate(
    @MessageBody() data: { docId: string; update: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const { docId, update } = data;
    const updateArray = new Uint8Array(update);

    // 현재 Y.Doc에 업데이트 적용
    if (this.docs.has(docId)) {
      const ydoc = this.docs.get(docId);
      Y.applyUpdate(ydoc, updateArray);
    }

    // 같은 room의 다른 클라이언트에게 브로드캐스트
    client.to(docId).emit('document-update', { update });
  }

  // 스냅샷 저장 (클라이언트 요청 or 주기적)
  @SubscribeMessage('save-snapshot')
  async handleSaveSnapshot(
    @MessageBody() data: { docId: string },
  ) {
    const { docId } = data;

    if (!this.docs.has(docId)) return;

    const ydoc = this.docs.get(docId);
    const snapshot = Y.encodeStateAsUpdate(ydoc);
    const version = Date.now();

    await this.ideasService.saveSnapshot(docId, Buffer.from(snapshot), version);

    return { success: true, version };
  }
}
```

---

## 6️⃣ Module 등록

### `src/ideas/ideas.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';
import { IdeasGateway } from './ideas.gateway';

@Module({
  controllers: [IdeasController],
  providers: [IdeasService, IdeasGateway],
  exports: [IdeasService],
})
export class IdeasModule {}
```

### `src/app.module.ts`에 추가
```typescript
import { IdeasModule } from './ideas/ideas.module';

@Module({
  imports: [
    // ... 기존 imports
    IdeasModule,
  ],
  ...
})
export class AppModule {}
```

---

## 7️⃣ 이미지 업로드 모듈

### `src/upload/upload.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async uploadImage(file: Express.Multer.File, docId: string) {
    const fileName = `${uuid()}-${file.originalname}`;
    const filePath = `images/${fileName}`;

    // Supabase Storage에 업로드
    const { data, error } = await this.supabase.storage
      .from('ideas')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    // Public URL 생성
    const { data: publicUrl } = this.supabase.storage
      .from('ideas')
      .getPublicUrl(filePath);

    // 메타데이터 저장
    await this.supabase.from('idea_attachments').insert({
      doc_id: docId,
      file_name: file.originalname,
      file_url: publicUrl.publicUrl,
      file_size: file.size,
      mime_type: file.mimetype,
    });

    return { url: publicUrl.publicUrl };
  }
}
```

### `src/upload/upload.controller.ts`
```typescript
import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { AdminGuard } from '../guards/admin.guard';

@Controller('api/upload')
@UseGuards(AdminGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('docId') docId: string,
  ) {
    return this.uploadService.uploadImage(file, docId);
  }
}
```

### `src/upload/upload.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
```

### `src/app.module.ts`에 추가
```typescript
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    // ... 기존 imports
    UploadModule,
  ],
  ...
})
export class AppModule {}
```

---

## 8️⃣ 환경변수 설정

### `.env` 파일에 추가:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:3000
```

---

## 9️⃣ 서버 실행

```bash
cd C:\Users\PC\WebstormProjects\adhubnest
npm run start:dev
```

WebSocket은 `ws://localhost:4000/ideas`로 접속 가능합니다.

---

## ✅ 완료 체크리스트

- [ ] 패키지 설치 완료
- [ ] Admin Guard 구현
- [ ] Ideas Module (Controller, Service, Gateway) 구현
- [ ] Upload Module 구현
- [ ] app.module.ts에 모듈 등록
- [ ] 환경변수 설정
- [ ] 서버 실행 및 테스트

---

## 📝 API 엔드포인트 목록

### REST API
- `GET /api/ideas/folders` - 폴더 목록
- `POST /api/ideas/folders` - 폴더 생성
- `GET /api/ideas/documents?folderId=xxx` - 문서 목록
- `GET /api/ideas/documents/:id` - 문서 상세
- `POST /api/ideas/documents` - 문서 생성
- `PUT /api/ideas/documents/:id` - 문서 수정
- `DELETE /api/ideas/documents/:id` - 문서 삭제
- `GET /api/ideas/documents/:id/export` - Markdown 다운로드
- `POST /api/upload/image` - 이미지 업로드

### WebSocket (ws://localhost:4000/ideas)
- `join-document` - 문서 접속
- `document-update` - 변경사항 전송/수신
- `save-snapshot` - 스냅샷 저장
