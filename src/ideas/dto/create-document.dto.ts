import { IsString, IsOptional } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;  // DEFAULT 'Untitled' in DB

  @IsOptional()
  @IsString()
  content?: string;  // DEFAULT '' in DB
}
