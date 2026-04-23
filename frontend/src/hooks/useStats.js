import { useState, useCallback } from 'react'
import { getOwnerStats } from '../services/authService'

export function useStats() {
  const [stats, setStats] = useState({})

  const fetchStats = useCallback(async () => {
    try {
      const r = await getOwnerStats()
      setStats(r.data)
    } catch {}
  }, [])

  return { stats, fetchStats }
}
