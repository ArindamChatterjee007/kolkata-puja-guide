import { useEffect, useState } from 'react'

// Re-renders on a fixed cadence so expiring reports and relative labels stay current.
export function useNow(intervalMs = 60_000): number {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((tick) => tick + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return Date.now()
}
