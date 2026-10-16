'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const mouseCoords = useRef({ x: 0, y: 0 });
  const cursorCoords = useRef({ x: 0, y: 0 });
  const dotCoords = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Disable custom cursor on touch/mobile/tablet screens
    const isTouchDevice = window.matchMedia('(hover: none) or (pointer: coarse)').matches;
    if (isTouchDevice) return;

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    let cursorInitialized = false;

    const handleMouseMove = (e) => {
      mouseCoords.current.x = e.clientX;
      mouseCoords.current.y = e.clientY;

      if (!cursorInitialized) {
        cursor.style.opacity = '1';
        dot.style.opacity = '1';
        cursorCoords.current.x = e.clientX;
        cursorCoords.current.y = e.clientY;
        dotCoords.current.x = e.clientX;
        dotCoords.current.y = e.clientY;
        cursorInitialized = true;
      }
    };

    const handleMouseDown = () => {
      cursor.classList.add('click');
    };

    const handleMouseUp = () => {
      cursor.classList.remove('click');
    };

    // Blazing-fast event delegation for hover states — replaces MutationObserver and thousands of element listeners
    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target &&
        typeof target.closest === 'function' &&
        target.closest('a, button, .filter-btn, .article-card, .event-card, .btn-issue-view, [role="button"], input, textarea, select')
      ) {
        cursor.classList.add('hover');
      } else {
        cursor.classList.remove('hover');
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });

    let animationFrameId;
    const animate = () => {
      // Lerp (Linear Interpolation) for smooth trailing delay
      cursorCoords.current.x += (mouseCoords.current.x - cursorCoords.current.x) * 0.16;
      cursorCoords.current.y += (mouseCoords.current.y - cursorCoords.current.y) * 0.16;

      dotCoords.current.x += (mouseCoords.current.x - dotCoords.current.x) * 0.35;
      dotCoords.current.y += (mouseCoords.current.y - dotCoords.current.y) * 0.35;

      // GPU-accelerated 3D transform — runs on compositor thread without triggering CPU layout/reflow
      cursor.style.transform = `translate3d(${cursorCoords.current.x}px, ${cursorCoords.current.y}px, 0) translate(-50%, -50%)`;
      dot.style.transform = `translate3d(${dotCoords.current.x}px, ${dotCoords.current.y}px, 0) translate(-50%, -50%)`;

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div className="custom-cursor" id="custom-cursor" ref={cursorRef}></div>
      <div className="custom-cursor-dot" id="custom-cursor-dot" ref={dotRef}></div>
    </>
  );
}
