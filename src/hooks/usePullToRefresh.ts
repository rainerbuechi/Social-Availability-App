import { useCallback, useState } from "react";
import type { TouchEvent } from "react";

type PullToRefreshOptions = {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
};

export function usePullToRefresh({
  onRefresh,
  threshold = 72,
  maxPull = 96,
}: PullToRefreshOptions) {
  const [startY, setStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isReady = pullDistance >= threshold;

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const element = event.currentTarget;

    if (element.scrollTop <= 0 && event.touches.length > 0) {
      setStartY(event.touches[0].clientY);
    }
  }, []);

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (startY === null || isRefreshing || event.touches.length === 0) return;

      const element = event.currentTarget;

      if (element.scrollTop > 0) {
        setStartY(null);
        setPullDistance(0);
        return;
      }

      const currentY = event.touches[0].clientY;
      const diff = currentY - startY;

      if (diff <= 0) {
        setPullDistance(0);
        return;
      }

      event.preventDefault();

      const easedDistance = Math.min(diff * 0.55, maxPull);
      setPullDistance(easedDistance);
    },
    [isRefreshing, maxPull, startY],
  );

  const onTouchEnd = useCallback(async () => {
    if (startY === null) return;

    const shouldRefresh = pullDistance >= threshold;

    setStartY(null);

    if (!shouldRefresh) {
      setPullDistance(0);
      return;
    }

    setIsRefreshing(true);
    setPullDistance(72);

    try {
      await onRefresh();
    } finally {
      window.setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 350);
    }
  }, [onRefresh, pullDistance, startY, threshold]);

  return {
    pullDistance,
    isRefreshing,
    isReady,
    pullHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  };
}