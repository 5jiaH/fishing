const TAB_SESSION_KEY = '__SLIDE_T__';
const MAX_IFRAMES = 5;
function flattenMenuLabels(items, acc = {}) {
  for (const it of items || []) {
    if (it.children) flattenMenuLabels(it.children, acc);
    else if (it.key && String(it.key).startsWith('/')) acc[it.key] = it.label;
  }
  return acc;
}

export default function IframeTabProvider({ children, firstKey, menus }) {
  const { useState, useEffect, useRef } = React;

  const lastUsedRef = useRef({});
  const didInitLastUsed = useRef(false);
  const PATH_LABELS = flattenMenuLabels(menus);

  const [tabs, setTabs] = useState(() => {
    const stored = readStoredTabs();
    if (stored) return stored;
    return firstKey
      ? { tabOrder: [firstKey], activePath: firstKey }
      : { tabOrder: [], activePath: null };
  });

  /** 仅对已访问过的 path 挂载 iframe，避免从 session 恢复 tab 时一次性加载全部 */
  const [mountedPaths, setMountedPaths] = useState(() => {
    const stored = readStoredTabs();
    if (stored?.activePath) return [stored.activePath];
    if (firstKey) return [firstKey];
    return [];
  });

  useEffect(() => {
    setMountedPaths((prev) => {
      let next = prev.filter((p) => tabs.tabOrder.includes(p));
      const ap = tabs.activePath;
      if (ap && tabs.tabOrder.includes(ap) && !next.includes(ap)) {
        next = [...next, ap];
      }
      return next;
    });
  }, [tabs.tabOrder, tabs.activePath]);

  if (!didInitLastUsed.current && tabs.tabOrder.length) {
    didInitLastUsed.current = true;
    tabs.tabOrder.forEach((p, i) => {
      lastUsedRef.current[p] = Date.now() - (tabs.tabOrder.length - i) * 1000;
    });
  }

  function readStoredTabs() {
    try {
      const raw = sessionStorage.getItem(TAB_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tabOrder)) return null;
      const tabOrder = parsed.tabOrder.filter((p) => PATH_LABELS[p]);
      if (!tabOrder.length) return null;
      const activePath =
        parsed.activePath && tabOrder.includes(parsed.activePath)
          ? parsed.activePath
          : tabOrder[0];
      return { tabOrder, activePath };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!tabs.tabOrder.length) return;
    sessionStorage.setItem(
      TAB_SESSION_KEY,
      JSON.stringify({
        tabOrder: tabs.tabOrder,
        activePath: tabs.activePath,
      }),
    );
  }, [tabs.tabOrder, tabs.activePath]);

  const openOrActivateTab = (path) => {
    const now = Date.now();
    setTabs((prev) => {
      let order = [...prev.tabOrder];
      if (order.includes(path)) {
        lastUsedRef.current[path] = now;
        return { tabOrder: order, activePath: path };
      }
      order.push(path);
      lastUsedRef.current[path] = now;
      while (order.length > MAX_IFRAMES) {
        const victim = order.reduce((a, b) =>
          (lastUsedRef.current[a] ?? 0) <= (lastUsedRef.current[b] ?? 0)
            ? a
            : b,
        );
        order = order.filter((p) => p !== victim);
        delete lastUsedRef.current[victim];
      }
      return { tabOrder: order, activePath: path };
    });
  };

  const activateTab = (path) => {
    const now = Date.now();
    setTabs((prev) => {
      if (!prev.tabOrder.includes(path)) return prev;
      lastUsedRef.current[path] = now;
      return { ...prev, activePath: path };
    });
  };

  const closeTab = (path) => {
    setTabs((prev) => {
      const order = prev.tabOrder.filter((p) => p !== path);
      delete lastUsedRef.current[path];
      let active = prev.activePath;
      if (active === path) {
        if (order.length > 0) {
          const i = prev.tabOrder.indexOf(path);
          active = order[Math.max(0, i - 1)] ?? order[0];
        } else {
          // const first = getFirstMenuKey();
          if (firstKey) {
            lastUsedRef.current[firstKey] = Date.now();
            return { tabOrder: [firstKey], activePath: firstKey };
          }
          active = null;
        }
      }
      return { tabOrder: order, activePath: active };
    });
  };

  const reorderTabs = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setTabs((prev) => {
      const order = [...prev.tabOrder];
      const [item] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, item);
      return { ...prev, tabOrder: order };
    });
  };

  const value = {
    tabOrder: tabs.tabOrder,
    activePath: tabs.activePath,
    mountedPaths,
    pathLabels: PATH_LABELS,
    openOrActivateTab,
    activateTab,
    closeTab,
    reorderTabs,
  };

  return (
    <globalContext.Provider value={value}>{children}</globalContext.Provider>
  );
}
