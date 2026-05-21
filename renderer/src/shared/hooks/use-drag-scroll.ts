import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};

export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const endDrag = useCallback((event?: ReactPointerEvent<T>) => {
    const el = ref.current;
    const pointerId = dragRef.current?.pointerId;
    if (event && el && pointerId != null && el.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<T>) => {
    if (event.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const drag = dragRef.current;
    const el = ref.current;
    if (!drag || !el || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    el.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    el.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
  }, []);

  return {
    ref,
    isDragging,
    dragScrollHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onPointerLeave: endDrag,
    },
  };
}
