import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Res } from '@nestjs/common';
import { IdeasService } from './ideas.service';
import { AdminGuard } from '../guards/admin.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import type { Response } from 'express';

@Controller('api/ideas')
@UseGuards(AdminGuard)
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  // 문서 목록
  @Get('documents')
  async getDocuments() {
    return this.ideasService.getDocuments();
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
  async updateDocument(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Req() req: any) {
    const userId = req.user.id;
    return this.ideasService.updateDocument(id, dto, userId);
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
    const content = doc.content || '# ' + doc.title;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.md"`);
    res.send(content);
  }
}
