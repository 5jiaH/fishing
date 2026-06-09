export default function LogDrawer() {
  return (
    <Drawer
      title="Basic Drawer"
      closable={{ 'aria-label': 'Close Button' }}
      placement="bottom"
      onClose={() => setDrawer([false, {}])}
      height="60vh"
      open={drawerOption[0]}
    >
      <div className="real-error-container">
        <p className="exegesis">文件路径: {drawerOption[1].file}</p>
        <p className="exegesis">错误信息: {drawerOption[1].error}</p>
        <p className="exegesis">
          用户浏览器: {drawerOption[1]['http.user_agent']}
        </p>
        <p className="exegesis">访问连接: {drawerOption[1]['http.url']}</p>
        <p className="exegesis">版本号: {drawerOption[1]['service.version']}</p>
        <p className="mb-[16px]"></p>
        <div dangerouslySetInnerHTML={{ __html: drawerOption[1].result }}></div>
      </div>
    </Drawer>
  );
}
