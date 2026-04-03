import { useState, useCallback } from 'react'

/**
 * useToast — returns { show, ToastEl }
 *
 * Usage:
 *   const { show, ToastEl } = useToast()
 *   show('Copied!')
 *   return <div>... {ToastEl}</div>
 */
export function useToast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, duration = 2200) => {
    setToast(message)
    setTimeout(() => setToast(null), duration)
  }, [])

  const ToastEl = toast ? (
    <div className="toast-popup">
      {message}
    </div>
  ) : null

  // Fix: use toast variable, not message
  const ToastElement = toast ? (
    <div className="toast-popup">{toast}</div>
  ) : null

  return { show, ToastEl: ToastElement }
}
