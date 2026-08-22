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
        cursorInitialized = true;
      }
    };

    const handleMouseDown = () => {
      cursor.classList.add('click');
    };

    const handleMouseUp = () => {
      cursor.classList.remove('click');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Dynamic listener attaching
    const addHoverClass = () => cursor.classList.add('hover');
    const removeHoverClass = () => cursor.classList.remove('hover');

    const updateInteractiveListeners = () => {
      const interactiveElements = document.querySelectorAll(
        'a, button, .filter-btn, .article-card, .btn-issue-view, [role="button"]'
      );
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', addHoverClass);
        el.removeEventListener('mouseleave', removeHoverClass);
        el.addEventListener('mouseenter', addHoverClass);
        el.addEventListener('mouseleave', removeHoverClass);
      });
    };

    updateInteractiveListeners();

    // Re-bind hover listeners if DOM updates dynamically
    const observer = new MutationObserver(updateInteractiveListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    let animationFrameId;
    const animate = () => {
      // Lerp (Linear Interpolation) for smooth trailing delay
      cursorCoords.current.x += (mouseCoords.current.x - cursorCoords.current.x) * 0.12;
      cursorCoords.current.y += (mouseCoords.current.y - cursorCoords.current.y) * 0.12;

      dotCoords.current.x += (mouseCoords.current.x - dotCoords.current.x) * 0.3;
      dotCoords.current.y += (mouseCoords.current.y - dotCoords.current.y) * 0.3;

      cursor.style.left = `${cursorCoords.current.x}px`;
      cursor.style.top = `${cursorCoords.current.y}px`;

      dot.style.left = `${dotCoords.current.x}px`;
      dot.style.top = `${dotCoords.current.y}px`;

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      observer.disconnect();
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
