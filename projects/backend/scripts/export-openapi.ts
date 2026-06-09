/**
 * 导出 OpenAPI JSON 与根目录 API.md（不启动 HTTP 监听）
 * 运行：npm run docs:api
 */
/// <reference path="../types/account.d.ts" />
/// <reference path="../types/globale.d.ts" />
import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { ApiModule } from '../src/modules/api/api.module';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Tidal API')
    .setDescription('Tidal 业务 API（OpenAPI 3，由 @nestjs/swagger 生成）')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [ApiModule],
    deepScanRoutes: true,
  });

  const root = join(__dirname, '..');
  const jsonPath = join(root, 'openapi.json');
  writeFileSync(jsonPath, JSON.stringify(document, null, 2), 'utf8');

  const port = process.env.PORT ?? 5001;
  const md = `# Tidal API 接口文档

> 本文件由 \`npm run docs:api\` 自动生成，请勿手改。完整参数与在线调试请用 Swagger UI。

## 在线文档（推荐）

- **Swagger UI**：[\`http://localhost:${port}/docs\`](http://localhost:${port}/docs)（需先 \`npm run start:dev\`）
- **OpenAPI JSON**：[\`http://localhost:${port}/docs-json\`](http://localhost:${port}/docs-json)
- **导出文件**：[openapi.json](./openapi.json)

## 概述

| 项 | 说明 |
| --- | --- |
| Base URL | \`http://localhost:${port}/v1\` |
| 鉴权 | \`Authorization: Bearer <JWT>\` |
| 响应格式 | \`{ "success": true, "data": ... }\` |

## 模块

| 标签 | 说明 |
| --- | --- |
| auth | 注册、登录、验证码、上传 |
| wechat | 小程序授权登录、逆地理 |
| tidal | 潮汐数据与港口 |
| hydrology | 水文站列表与雷达 |
| weather | 和风天气代理 |
| test | 测试与限流 |

路径数量：**${Object.keys(document.paths ?? {}).length}**
`;

  writeFileSync(join(root, 'API.md'), md, 'utf8');
  await app.close();

  console.log(`已写入 ${jsonPath}`);
  console.log(`已写入 ${join(root, 'API.md')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
