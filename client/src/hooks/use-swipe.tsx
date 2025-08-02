import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeConfig {
  minDistance?: number;
  preventDefaultTouchmoveEvent?: boolean;
}

export const useSwipeable = (
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) => {
  const { minDistance = 50, preventDefaultTouchmoveEvent = false } = config;
  
  const touchRef = useRef<{
    startX: number;
    startY: number;
    deltaX: number;
    deltaY: number;
  }>({
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
  });

  const onTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    touchRef.current.startX = touch.clientX;
    touchRef.current.startY = touch.clientY;
    touchRef.current.deltaX = 0;
    touchRef.current.deltaY = 0;
  }, []);

  const onTouchMove = useCallback((event: TouchEvent) => {
    if (preventDefaultTouchmoveEvent) {
      event.preventDefault();
    }
    
    const touch = event.touches[0];
    touchRef.current.deltaX = touch.clientX - touchRef.current.startX;
    touchRef.current.deltaY = touch.clientY - touchRef.current.startY;
  }, [preventDefaultTouchmoveEvent]);

  const onTouchEnd = useCallback(() => {
    const { deltaX, deltaY } = touchRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > minDistance || absY > minDistance) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }
  }, [handlers, minDistance]);

  const swipeHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };

  return swipeHandlers;
};

export const useCalendarSwipe = (
  onPrevious: () => void,
  onNext: () => void
) => {
  return useSwipeable({
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
  }, {
    minDistance: 50,
    preventDefaultTouchmoveEvent: false,
  });
};

export const usePullToRefresh = (onRefresh: () => void) => {
  const pullRef = useRef<{
    startY: number;
    currentY: number;
    isPulling: boolean;
  }>({
    startY: 0,
    currentY: 0,
    isPulling: false,
  });

  const onTouchStart = useCallback((event: TouchEvent) => {
    if (window.scrollY === 0) {
      pullRef.current.startY = event.touches[0].clientY;
      pullRef.current.isPulling = false;
    }
  }, []);

  const onTouchMove = useCallback((event: TouchEvent) => {
    if (window.scrollY === 0) {
      pullRef.current.currentY = event.touches[0].clientY;
      const diff = pullRef.current.currentY - pullRef.current.startY;
      
      if (diff > 100 && !pullRef.current.isPulling) {
        pullRef.current.isPulling = true;
        // Add visual feedback here
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullRef.current.isPulling) {
      pullRef.current.isPulling = false;
      onRefresh();
    }
  }, [onRefresh]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};
