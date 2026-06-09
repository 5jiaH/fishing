function ToolsComponent() {
  const { useRef, useContext } = React;
  const {
    tabOrder,
    activePath,
    pathLabels,
    activateTab,
    closeTab,
    reorderTabs,
  } = useContext(globalContext);
  const dragFrom = useRef(null);

  return (
    <section className="shrink-0 bg-orange-50 border-b border-orange-200/80 flex flex-col gap-2 p-2 min-h-[150px]">
      <div className="text-xs text-neutral-600">
        已打开页面（拖拽排序，关闭会释放 iframe 缓存）
      </div>
      <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-1">
        {tabOrder.map((path, i) => {
          const label = pathLabels[path] || path;
          const active = path === activePath;
          return (
            <div
              key={path}
              role="button"
              tabIndex={0}
              draggable
              onDragStart={(e) => {
                dragFrom.current = i;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from =
                  dragFrom.current ??
                  parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (Number.isNaN(from)) return;
                reorderTabs(from, i);
                dragFrom.current = null;
              }}
              onDragEnd={() => {
                dragFrom.current = null;
              }}
              onClick={() => activateTab(path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  activateTab(path);
                }
              }}
              className={
                'inline-flex items-center gap-1 max-w-[200px] rounded-md border px-2 py-1 text-sm cursor-grab active:cursor-grabbing select-none ' +
                (active
                  ? 'bg-white border-teal-500 text-teal-900 shadow-sm'
                  : 'bg-white/70 border-orange-200 text-neutral-700 hover:bg-white')
              }
            >
              <span className="truncate" title={path}>
                {label}
              </span>
              <button
                type="button"
                className="shrink-0 leading-none px-1 rounded hover:bg-red-100 text-neutral-500 hover:text-red-600"
                title="关闭并注销缓存"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(path);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Main({ context }) {
  const { useContext } = React;
  const { tabOrder, activePath, mountedPaths } = useContext(globalContext);

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <ToolsComponent />
      <div className="relative w-full flex-1 min-h-0">
        {tabOrder
          .filter((path) => (mountedPaths ?? tabOrder).includes(path))
          .map((path) => (
          <iframe
            key={path}
            title={path}
            src={path}
            className={
              activePath === path
                ? 'absolute inset-0 w-full h-full border-0 z-10'
                : 'absolute inset-0 w-full h-full border-0 z-0 invisible pointer-events-none'
            }
          />
        ))}
      </div>
    </main>
  );
}
