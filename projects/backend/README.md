```bash
jim:123456
mount -t davfs http://192.168.163.1:6021 /mnt/sourcemap
```

## API 文档（Swagger / OpenAPI）

使用开源 [@nestjs/swagger](https://github.com/nestjs/swagger)（Swagger UI）：

| 方式 | 地址 / 命令 |
| --- | --- |
| 在线调试 | 启动服务后打开 `http://localhost:5001/docs` |
| OpenAPI JSON | `http://localhost:5001/docs-json` |
| 导出到仓库 | `npm run docs:api` → 生成根目录 `openapi.json` 与 `API.md` |

生产环境可通过环境变量 `SWAGGER_ENABLED=false` 关闭文档页。

接口说明与参数写在 `src/modules/api` 的 Controller `@ApiOperation` 与 DTO `@ApiProperty` 上，改完后重新执行 `npm run docs:api` 即可。
