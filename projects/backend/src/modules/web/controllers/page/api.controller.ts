import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedApiGuard } from '../../services/auth/authenticated.guard';
import { TransfError } from '../../utils/sourceMap';
import * as path from 'path';
import { baseRequest } from '../../utils/request';

@Controller('api')
export class ApiController {
  request: <T = any>(url: string, init?: RequestInit) => Promise<T>;
  constructor() {
    this.request = baseRequest(process.env.SIGNOZ_API, {
      headers: { 'SIGNOZ-API-KEY': process.env.SIGNOZ_API_KEY as string },
    });
  }

  // 获取真实报错信息
  @UseGuards(AuthenticatedApiGuard)
  @Get('realError')
  async real_error(@Req() req, @Res() res) {
    const { groupId, timestamp } = req.query || {};
    let tagMapGlobal = {};
    let globalError = '';

    try {
      // 获取错误信息
      const url = `/v1/errorFromGroupID?groupID=${groupId}&timestamp=${timestamp}`;
      const result = await this.request(url);

      // console.log(result);

      if (result) {
        // 获取额外信息
        const detail = await this.request(
          `/v2/traces/waterfall/${result.traceID}`,
          {
            method: 'post',
            body: JSON.stringify({
              isSelectedSpanIDUnCollapsed: true,
              selectedSpanId: result.spanID,
              uncollapsedSpans: [],
            }),
          },
        );
        // console.log(detail);

        if (detail) {
          const { spans } = detail;
          const { tagMap } =
            spans && spans.length ? spans[spans.length - 1] : {};
          tagMapGlobal = tagMap || {};
          globalError = result.exceptionStacktrace || '';

          if (/^\s*$/.test(result.exceptionStacktrace || '')) {
            throw Error('有记录到错误信息，但是错误信息为空');
          }
          if (!spans || (spans && !spans.length)) {
            throw Error('没有找到任何错误信息，可能搜索有问题');
          }

          const realErrorMessage = await TransfError(
            result.exceptionStacktrace,
            path.resolve(
              `${process.env.SIGNOZ_SOURCEMAP_PATH}/${tagMap['service.name']}/sourcemap_${tagMap['service.version']}`,
            ),
          );
          res.send({ ...(realErrorMessage as any), ...tagMap });
        }
      }
    } catch (err) {
      // console.log(err);

      res.send({
        error: `${err.message}(错误解析异常，将原样数据错误信息)`,
        ...tagMapGlobal,
        result: globalError
          .split('\n')
          .map((i) => `<p>${i}</p>`)
          .join(''),
      });
    }
  }

  // 获取报错信息列表
  @UseGuards(AuthenticatedApiGuard)
  @Post('listErrors')
  async list_errors(@Body() body, @Res() res) {
    const result = await fetch(`${process.env.SIGNOZ_API}/v1/listErrors`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'SIGNOZ-API-KEY': process.env.SIGNOZ_API_KEY as string,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .catch(() => []);
    res.send(result);
  }

  // 获取报错信息列表总数
  @UseGuards(AuthenticatedApiGuard)
  @Post('countErrors')
  async count_Errors(@Body() body, @Res() res) {
    const result = await fetch(`${process.env.SIGNOZ_API}/v1/countErrors`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'SIGNOZ-API-KEY': process.env.SIGNOZ_API_KEY as string,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .catch(() => []);
    res.send(result);
  }

  // 获取项目名列表
  @UseGuards(AuthenticatedApiGuard)
  @Get('listServiceNames')
  async listServiceNames(@Req() req, @Res() res) {
    const url = `/v3/autocomplete/attribute_values?aggregateOperator=noop&dataSource=traces&aggregateAttribute=&attributeKey=service.name&searchText=&filterAttributeKeyDataType=string&tagType=resource`;
    const result = await this.request(url);
    res.send(result);
  }
}
