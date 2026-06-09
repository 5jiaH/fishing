/**
 * 仅注册折线图 + 网格 + 提示框 + Canvas 渲染，减小小程序包体。
 * 详见 https://echarts.apache.org/handbook/zh/basics/import
 */
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

export { echarts };
