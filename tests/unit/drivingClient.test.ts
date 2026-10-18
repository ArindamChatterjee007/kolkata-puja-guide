import { describe, expect, it, vi } from 'vitest'
import { DrivingWorkerClient } from '../../src/hooks/useDrivingNavigation'

class WorkerMock extends EventTarget {
  postMessage = vi.fn()
  terminate = vi.fn()
  respond(data: unknown) { this.dispatchEvent(new MessageEvent('message', { data })) }
}

describe('single bounded car worker client', () => {
  it('loads once, consumes progress without completing, and correlates only the current request', async () => {
    const worker = new WorkerMock()
    const client = new DrivingWorkerClient(worker)
    expect(worker.postMessage).not.toHaveBeenCalled()
    const progress = vi.fn()
    const loading = client.load(progress)
    const duplicate = client.load(progress)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    worker.respond({ type: 'progress', requestId: 1, phase: 'static', loadedBytes: 10 })
    expect(progress).toHaveBeenCalledTimes(1)
    expect(client.busy).toBe(true)
    worker.respond({ type: 'loaded', requestId: 99 })
    expect(client.busy).toBe(true)
    worker.respond({ type: 'loaded', requestId: 1 })
    await Promise.all([loading, duplicate])
    expect(client.busy).toBe(false)
    client.dispose()
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('terminates and rejects pending requests on cancellation or timeout', async () => {
    vi.useFakeTimers()
    const worker = new WorkerMock()
    const client = new DrivingWorkerClient(worker, 55_000)
    const pending = client.send({ type: 'load' })
    const assertion = expect(pending).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(55_001)
    await assertion
    expect(worker.terminate).toHaveBeenCalledTimes(1)
    expect(client.isDisposed).toBe(true)
    worker.respond({ type: 'loaded', requestId: 1 })
    await expect(client.send({ type: 'load' })).rejects.toThrow('cancelled')
    vi.useRealTimers()
  })

  it('reports worker failure without geographic fallback', async () => {
    const worker = new WorkerMock()
    const client = new DrivingWorkerClient(worker)
    const pending = client.send({ type: 'load' })
    worker.dispatchEvent(new Event('error'))
    await expect(pending).rejects.toThrow('No geographic fallback')
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
})