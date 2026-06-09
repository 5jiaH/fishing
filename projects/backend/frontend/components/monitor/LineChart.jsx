const defaultOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '趋势',
      type: 'line',
      smooth: true,
      data: [820, 932, 901, 934, 1290, 1330],
      areaStyle: { opacity: 0.12 },
      itemStyle: { color: '#91cc75' },
    },
  ],
};

export default function MonitorLineChart({ option, className = '', style }) {
  const { useRef, useEffect } = React;
  const elRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || !echarts) return;
    const chart = echarts.init(elRef.current);
    chartRef.current = chart;
    chart.setOption(option ?? defaultOption);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);

  return (
    <div
      ref={elRef}
      className={`monitor-echarts ${className}`.trim()}
      style={style}
    />
  );
}
