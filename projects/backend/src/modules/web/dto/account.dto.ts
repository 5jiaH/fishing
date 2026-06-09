import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class listDto {
  @IsString()
  @IsOptional()
  username: string;

  @IsNumber()
  @IsOptional()
  skip: number;

  @IsNumber()
  @IsOptional()
  take: number;

  @IsNumber()
  @IsOptional()
  disabled: number;

  @IsObject()
  @IsOptional()
  sort: Record<string, 'ASC' | 'DESC'>;
}
