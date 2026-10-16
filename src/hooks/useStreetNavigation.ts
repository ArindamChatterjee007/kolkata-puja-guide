import { useCallback, useEffect, useRef, useState } from 'react'
import { StreetWorkerClient, streetDataUrl } from './streetWorkerClient'
import type { StreetNavigationState, StreetRouteInput } from './streetWorkerClient'

export function useStreetNavigation() {
  const [state, setState] = useState<StreetNavigationState>({ status: 'idle' })
  const client = useRef<StreetWorkerClient | null>(null)

  const request = useCallback((input: StreetRouteInput) => {
    try {
      if (client.current?.isDisposed) client.current = null
      client.current ??= new StreetWorkerClient(
        new Worker(new URL('../workers/streets.worker.ts', import.meta.url), { type: 'module' }),
        streetDataUrl(import.meta.env.BASE_URL, document.baseURI),
        (next) => {
          const bootstrapFailed = next.status === 'error' && (next.code === 'worker' || client.current?.isDisposed)
          setState(bootstrapFailed && navigator.onLine === false ? { status: 'error', code: 'network' } : next)
        },
      )
      client.current.route(input)
    } catch {
      client.current?.dispose()
      client.current = null
      setState({ status: 'error', code: navigator.onLine === false ? 'network' : 'worker' })
    }
  }, [])

  const invalidate = useCallback(() => {
    client.current?.invalidate()
    setState({ status: 'idle' })
  }, [])

  useEffect(() => () => {
    client.current?.dispose()
    client.current = null
  }, [])

  return { state, request, invalidate }
}