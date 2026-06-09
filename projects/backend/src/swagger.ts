import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiModule } from './modules/api/api.module';

/** 配置 Swagger UI（开源 OpenAPI 3），仅扫描 v1 API 模块 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Tidal API')
    .setDescription(
      '潮汐 / 水文 / 天气等业务接口。统一响应：`{ success: true, data }`（ResponseInterceptor）。',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '由 `/v1/auth/login` 或 `/v1/wechat/auth/login` 返回的 token',
      },
      'bearer',
    )
    .addServer(`http://localhost:${process.env.PORT ?? 5001}`, '本地')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [ApiModule],
    deepScanRoutes: true,
  });

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
  });
}
