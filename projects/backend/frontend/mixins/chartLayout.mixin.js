/**
 * 可拖拽、可缩放面板（受控）：rect 含 x,y,width,height,zIndex；限制在父容器内；结束时 onCommit。
 *
 * @typedef {{ x: number, y: number, width: number, height: number, zIndex?: number }} ChartLayoutRect
 */

/** 指针位移不超过该值（含等于）视为未有效拖动/缩放，不触发 onCommit */
const COMMIT_MOVE_THRESHOLD_PX = 5;

/**
 * @param {ChartLayoutRect} rect
 * @param {number} bw
 * @param {number} bh
 * @param {number} minW
 * @param {number} minH
 * @returns {ChartLayoutRect}
 */
export function clampLayoutRect(rect, bw, bh, minW, minH) {
  let { x, y, width, height, zIndex = 1 } = rect;
  if (!(bw > 0 && bh > 0)) {
    return { x, y, width, height, zIndex };
  }
  width = Math.max(minW, Math.min(width, bw));
  height = Math.max(minH, Math.min(height, bh));
  x = Math.max(0, Math.min(x, bw - width));
  y = Math.max(0, Math.min(y, bh - height));
  width = Math.max(minW, Math.min(width, bw - x));
  height = Math.max(minH, Math.min(height, bh - y));
  return { x, y, width, height, zIndex };
}

/**
 * @param {object} options
 * @param {ChartLayoutRect} options.rect
 * @param {function} options.setRect - (updater: ChartLayoutRect | ((p: ChartLayoutRect) => ChartLayoutRect)) => void
 * @param {React.MutableRefObject<HTMLElement | null>} options.boundsRef
 * @param {number} [options.minWidth]
 * @param {number} [options.minHeight]
 * @param {function} [options.onCommit] - 拖动/缩放指针释放时调用，参数为当前 rect
 * @returns {object} rootStyle, dragHandleProps, resizeHandleProps
 */
export function useChartLayoutPanel(options = {}) {
  const R = globalThis.React;
  if (!R) {
    throw new Error('[chartLayout.mixin] 需要全局 React');
  }
  const { useRef, useEffect, useMemo } = R;

  const {
    rect,
    setRect,
    boundsRef,
    minWidth = 260,
    minHeight = 220,
    onCommit,
  } = options;

  if (!rect || typeof setRect !== 'function') {
    throw new Error('[chartLayout.mixin] 需要受控 rect 与 setRect');
  }
  if (!boundsRef) {
    throw new Error('[chartLayout.mixin] 需要 boundsRef 指向父容器');
  }

  const rectRef = useRef(rect);
  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const readBounds = () => {
    const el = boundsRef.current;
    if (!el) return null;
    return { w: el.clientWidth, h: el.clientHeight };
  };

  const dragHandleProps = useMemo(
    () => ({
      onPointerDown(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          px: e.clientX,
          py: e.clientY,
          x: rectRef.current.x,
          y: rectRef.current.y,
        };
      },
      onPointerMove(e) {
        if (!dragRef.current) return;
        const d = dragRef.current;
        const b = readBounds();
        setRect((prev) => {
          const raw = {
            ...prev,
            x: d.x + e.clientX - d.px,
            y: d.y + e.clientY - d.py,
          };
          return b ? clampLayoutRect(raw, b.w, b.h, minWidth, minHeight) : raw;
        });
      },
      onPointerUp(e) {
        const was = !!dragRef.current;
        const d = dragRef.current;
        dragRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        if (!was || !d) return;

        const mdx = e.clientX - d.px;
        const mdy = e.clientY - d.py;
        if (Math.hypot(mdx, mdy) <= COMMIT_MOVE_THRESHOLD_PX) {
          setRect((prev) => ({ ...prev, x: d.x, y: d.y }));
          return;
        }

        const b = readBounds();
        setRect((prev) => {
          const raw = {
            ...prev,
            x: d.x + e.clientX - d.px,
            y: d.y + e.clientY - d.py,
          };
          const next = b
            ? clampLayoutRect(raw, b.w, b.h, minWidth, minHeight)
            : raw;
          const cb = onCommitRef.current;
          if (cb) {
            queueMicrotask(() => cb(next));
          }
          return next;
        });
      },
      onPointerCancel(e) {
        dragRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      },
    }),
    [boundsRef, minWidth, minHeight, setRect],
  );

  const resizeHandleProps = useMemo(
    () => ({
      onPointerDown(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        resizeRef.current = {
          px: e.clientX,
          py: e.clientY,
          w: rectRef.current.width,
          h: rectRef.current.height,
        };
      },
      onPointerMove(e) {
        const r = resizeRef.current;
        if (!r) return;
        const b = readBounds();
        setRect((prev) => {
          const raw = {
            ...prev,
            width: Math.max(minWidth, r.w + e.clientX - r.px),
            height: Math.max(minHeight, r.h + e.clientY - r.py),
          };
          return b ? clampLayoutRect(raw, b.w, b.h, minWidth, minHeight) : raw;
        });
      },
      onPointerUp(e) {
        const was = !!resizeRef.current;
        const r = resizeRef.current;
        resizeRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        if (!was || !r) return;

        const mdx = e.clientX - r.px;
        const mdy = e.clientY - r.py;
        if (Math.hypot(mdx, mdy) <= COMMIT_MOVE_THRESHOLD_PX) {
          setRect((prev) => ({ ...prev, width: r.w, height: r.h }));
          return;
        }

        const b = readBounds();
        setRect((prev) => {
          const raw = {
            ...prev,
            width: Math.max(minWidth, r.w + e.clientX - r.px),
            height: Math.max(minHeight, r.h + e.clientY - r.py),
          };
          const next = b
            ? clampLayoutRect(raw, b.w, b.h, minWidth, minHeight)
            : raw;
          const cb = onCommitRef.current;
          if (cb) {
            queueMicrotask(() => cb(next));
          }
          return next;
        });
      },
      onPointerCancel(e) {
        resizeRef.current = null;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      },
    }),
    [boundsRef, minWidth, minHeight, setRect],
  );

  const rootStyle = useMemo(
    () => ({
      position: 'absolute',
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
      boxSizing: 'border-box',
      zIndex: rect.zIndex ?? 1,
      touchAction: 'none',
    }),
    [rect],
  );

  return {
    rootStyle,
    dragHandleProps,
    resizeHandleProps,
  };
}

/**
 * @param {number} index
 * @param {object} [opts]
 * @returns {ChartLayoutRect}
 */
export function staggeredChartLayout(index, opts = {}) {
  const {
    cellWidth = 412,
    cellHeight = 372,
    columns = 2,
    panelWidth = 400,
    panelHeight = 360,
  } = opts;
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 8 + col * cellWidth,
    y: 8 + row * cellHeight,
    width: panelWidth,
    height: panelHeight,
    zIndex: index + 1,
  };
}
