import { Injectable } from '@nestjs/common';
import {
  MulterModuleOptions,
  MulterOptionsFactory,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class UploadMiddleware implements MulterOptionsFactory {
  allowedFileTypes: string[] = [];

  createMulterOptions(): MulterModuleOptions {
    return {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          // 自定义文件名的逻辑
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = file.originalname.split('.').pop();
          callback(null, `${file.fieldname}-${uniqueSuffix}.${ext}`);
        },
      }),
      fileFilter: this.fileFilter,
    };
  }

  setAllowedFileTypes(fileTypes: string[]) {
    this.allowedFileTypes = fileTypes;
  }

  fileFilter(req, file, callback) {
    // 检查文件类型是否符合要求
    const fileExtension = extname(file.originalname).toLowerCase();
    if (!this.allowedFileTypes.includes(fileExtension)) {
      return callback(
        new Error(
          `Only ${this.allowedFileTypes.join(', ')} files are allowed!`,
        ),
        false,
      );
    }

    callback(null, true);
  }
}
