import { useCallback, useEffect, useState } from 'react';

export function useCalendarSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  let startX = 0;
  let startY = 0;
  let isMoving = false;

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    isMoving = false;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMoving) {
      const currentX = event.touches[0].clientX;
      const currentY = event.touches[0].clientY;
      const diffX = startX - currentX;
      const diffY = startY - currentY;

      // Only handle horizontal swipes (ignore vertical scrolling)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isMoving = true;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isMoving) {
      // Handle swipe logic here if needed
      isMoving = false;
    }
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

export function usePullToRefresh(onRefresh: () => void) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  let startY = 0;
  let currentY = 0;

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY = event.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isPulling) return;

    currentY = event.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (distance > 0 && window.scrollY === 0) {
      event.preventDefault();
      setPullDistance(Math.min(distance * 0.5, 80));
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(() => {
    if (isPulling && pullDistance > 50) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
    
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}