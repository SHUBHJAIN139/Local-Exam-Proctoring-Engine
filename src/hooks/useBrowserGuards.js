import { useEffect, useRef } from 'react';

/**
 * Browser Guard Listener
 * Intercepts tab switching, window blur, clipboard operations, context menu, and fullscreen exit.
 * Enforces a 3-second cooldown per event type to prevent cascading deductions.
 */
export function useBrowserGuards({ isActive, onViolation }) {
  const lastTriggeredRef = useRef({
    TAB_SWITCH: 0,
    WINDOW_UNFOCUSED: 0,
    CLIPBOARD_PASTE: 0,
    CLIPBOARD_COPY: 0,
    CLIPBOARD_CUT: 0,
    CONTEXT_MENU: 0,
    FULLSCREEN_EXIT: 0,
  });

  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const triggerEvent = (eventType, payload = {}) => {
    if (!isActive) return;

    const now = Date.now();
    const lastTime = lastTriggeredRef.current[eventType] || 0;
    const COOLDOWN_MS = 3000; // 3-second cooldown per event type

    if (now - lastTime < COOLDOWN_MS) {
      return;
    }

    lastTriggeredRef.current[eventType] = now;
    if (onViolationRef.current) {
      onViolationRef.current(eventType, {
        timestamp: now,
        screen: `${window.screen.width}x${window.screen.height}`,
        ...payload
      });
    }
  };

  useEffect(() => {
    if (!isActive) return;

    // 1. Visibility Change (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerEvent('TAB_SWITCH', {
          reason: 'Document hidden / switched to another tab'
        });
      }
    };

    // 2. Window Blur (Focus Lost to another app / OS window)
    const handleBlur = () => {
      // Don't duplicate if already hidden
      if (!document.hidden) {
        triggerEvent('WINDOW_BLUR', {
          reason: 'Browser window lost active focus'
        });
      }
    };

    // 3. Clipboard Paste
    const handlePaste = (e) => {
      // Intercept and flag paste
      triggerEvent('CLIPBOARD_PASTE', {
        targetTag: e.target?.tagName,
        pastedLength: e.clipboardData ? e.clipboardData.getData('text').length : 0
      });
    };

    // 4. Clipboard Copy & Cut
    const handleCopy = (e) => {
      triggerEvent('CLIPBOARD_COPY', {
        targetTag: e.target?.tagName
      });
    };

    const handleCut = (e) => {
      triggerEvent('CLIPBOARD_CUT', {
        targetTag: e.target?.tagName
      });
    };

    // 5. Context Menu (Right Click)
    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerEvent('CONTEXT_MENU', {
        x: e.clientX,
        y: e.clientY
      });
    };

    // 6. Fullscreen Change
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        triggerEvent('FULLSCREEN_EXIT', {
          reason: 'User exited full-screen proctoring mode'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isActive]);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      }
      return true;
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      return false;
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen exit error:", err);
    }
  };

  return {
    requestFullscreen,
    exitFullscreen
  };
}
