import { useState, useRef, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState('')
  const timerRef = useRef(null)

  const showToast = useCallback((text) => {
    setToast('')
    requestAnimationFrame(() => requestAnimationFrame(() => setToast(text)))
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(''), 2500)
  }, [])

  return { toast, showToast }
}
