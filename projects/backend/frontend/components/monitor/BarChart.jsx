const defaultOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '访问量',
      type: 'bar',
      data: [120, 200, 150, 80, 70, 110, 130],
      itemStyle: { color: '#5470c6' },
    },
  ],
};

export default function MonitorBarChart({ option, className = '', style }) {
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
