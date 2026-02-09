'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, DollarSign, GripHorizontal } from 'lucide-react';
import { UsageCosts } from '@/components/admin/UsageCosts';

interface UsageCostsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = 'marketpulse_usage_window';
const DEFAULT_WIDTH = 700;
const DEFAULT_HEIGHT = 600;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
}

function getDefaultState(): WindowState {
  return {
    x: Math.max(0, Math.floor((window.innerWidth - DEFAULT_WIDTH) / 2)),
    y: Math.max(0, Math.floor((window.innerHeight - DEFAULT_HEIGHT) / 2)),
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minimized: false,
  };
}

function loadState(): WindowState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WindowState;
      if (
        parsed.width >= MIN_WIDTH &&
        parsed.height >= MIN_HEIGHT &&
        parsed.x >= 0 &&
        parsed.y >= 0
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function saveState(state: WindowState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function UsageCostsWindow({ open, onOpenChange }: UsageCostsWindowProps) {
  const [mounted, setMounted] = useState(false);
  const [windowState, setWindowState] = useState<WindowState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize window state when opened
  useEffect(() => {
    if (open && !windowState) {
      const saved = loadState();
      const state = saved || getDefaultState();
      state.x = Math.min(state.x, window.innerWidth - 100);
      state.y = Math.min(state.y, window.innerHeight - 50);
      setWindowState(state);
    }
  }, [open, windowState]);

  // Persist state
  useEffect(() => {
    if (windowState) {
      saveState(windowState);
    }
  }, [windowState]);

  // --- Drag ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!windowState) return;
      e.preventDefault();
      dragOffset.current = {
        x: e.clientX - windowState.x,
        y: e.clientY - windowState.y,
      };
      setDragging(true);
    },
    [windowState]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setWindowState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 100)),
          y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 50)),
        };
      });
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // --- Resize (custom corner handle) ---
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!windowState) return;
      e.preventDefault();
      e.stopPropagation();
      resizeStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: windowState.width,
        height: windowState.height,
      };
      setResizing(true);
    },
    [windowState]
  );

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.mouseX;
      const dy = e.clientY - resizeStart.current.mouseY;
      setWindowState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          width: Math.max(MIN_WIDTH, resizeStart.current.width + dx),
          height: Math.max(MIN_HEIGHT, resizeStart.current.height + dy),
        };
      });
    };
    const onUp = () => setResizing(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  const handleClose = () => onOpenChange(false);
  const handleMinimize = () =>
    setWindowState((prev) => (prev ? { ...prev, minimized: !prev.minimized } : prev));

  if (!mounted || !open || !windowState) return null;

  const interacting = dragging || resizing;

  return createPortal(
    <div
      className="fixed z-[9999] flex flex-col rounded-xl border border-border bg-background shadow-2xl shadow-black/30 dark:shadow-black/60"
      style={{
        left: windowState.x,
        top: windowState.y,
        width: windowState.width,
        height: windowState.minimized ? 'auto' : windowState.height,
        minWidth: MIN_WIDTH,
        minHeight: windowState.minimized ? undefined : MIN_HEIGHT,
        userSelect: interacting ? 'none' : undefined,
      }}
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border rounded-t-xl flex-shrink-0"
        onMouseDown={handleDragStart}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span className="text-sm font-medium text-foreground">Usage &amp; Costs</span>
        </div>
        <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleMinimize}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!windowState.minimized && (
        <div className="flex-1 overflow-auto p-4 min-h-0">
          <UsageCosts />
        </div>
      )}

      {/* Resize Handle (bottom-right corner) */}
      {!windowState.minimized && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-10"
          style={{ touchAction: 'none' }}
        >
          {/* Diagonal grip lines */}
          <svg width="14" height="14" viewBox="0 0 14 14" className="absolute bottom-0.5 right-0.5 text-muted-foreground">
            <line x1="10" y1="14" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="6" y1="14" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>,
    document.body
  );
}
