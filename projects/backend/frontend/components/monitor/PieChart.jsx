const defaultOption = {
  tooltip: { trigger: 'item' },
  legend: { bottom: '0', left: 'center' },
  series: [
    {
      name: '占比',
      type: 'pie',
      radius: ['42%', '68%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {d}%' },
      data: [
        { value: 1048, name: '直接访问' },
        { value: 735, name: '联盟广告' },
        { value: 580, name: '邮件营销' },
        { value: 484, name: '视频广告' },
        { value: 300, name: '搜索引擎' },
      ],
    },
  ],
};

export default function MonitorPieChart({ option, className = '', style }) {
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
