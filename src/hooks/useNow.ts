import { useEffect, useState } from 'react'

export function useIntervalNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

// Re-renders on a fixed cadence so expiring reports and relative labels stay current.
export function useNow(intervalMs = 60_000): number {
  useIntervalNow(intervalMs)
  return Date.now()
}
