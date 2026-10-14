import { useCallback, useEffect, useRef, useState } from 'react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: number
  message: string
  action?: ToastAction
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, number>())
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((message: string, action?: ToastAction, ttlMs = 6_000) => {
    counter.current += 1
    const id = counter.current
    setToasts((current) => [...current.slice(-2), { id, message, action }])
    timers.current.set(id, window.setTimeout(() => dismiss(id), ttlMs))
    return id
  }, [dismiss])

  useEffect(() => {
    const active = timers.current
    return () => {
      for (const timer of active.values()) window.clearTimeout(timer)
      active.clear()
    }
  }, [])

  return { toasts, push, dismiss }
}
