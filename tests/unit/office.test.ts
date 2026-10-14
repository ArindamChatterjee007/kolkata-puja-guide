import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { evidenceHref, filterTasks, parseBoard, taskCounts, TASK_STATUSES } from '../../src/office'
import viteConfig, { pwaOptions } from '../../vite.config'

const snapshot = JSON.parse(readFileSync(new URL('../../public/office/board.json', import.meta.url), 'utf8'))
const freshSnapshot = () => structuredClone(snapshot)
const deployedSnapshot = () => ({
  ...freshSnapshot(),
  publication: 'deployed',
  release: {
    url: 'https://arindamchatterjee007.github.io/kolkata-puja-guide/',
    repository: 'https://github.com/ArindamChatterjee007/kolkata-puja-guide',
    commit: 'a'.repeat(40),
    runUrl: 'https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/123',
    deployedAt: snapshot.snapshotAt,
  },
})

describe('public office snapshot', () => {
  it('validates the checked-in schema without inventing deployment or provider attribution', () => {
    const board = parseBoard(snapshot)
    expect(['pending', 'deployed']).toContain(board.publication)
    expect(board.release === null).toBe(board.publication === 'pending')
    expect(board.roles.every((role) => role.runtime === 'unverified')).toBe(true)
    expect(board.coverage.currentTimetable).toBe(false)
    expect(board.suiteReports.map((suite) => suite.passed)).toEqual([22, 44, 6])
    expect(board.fullSuite === null || board.fullSuite.checkedAt.length > 0).toBe(true)
  })

  it('points only at existing public documentation and test files', () => {
    for (const task of parseBoard(snapshot).tasks) {
      for (const evidence of task.evidence) {
        const path = evidence.path.replace('https://github.com/ArindamChatterjee007/kolkata-puja-guide/blob/main/', '').split('#')[0]
        expect(existsSync(new URL(`../../${path}`, import.meta.url)), evidence.path).toBe(true)
      }
    }
  })

  it('rejects duplicate task and role IDs', () => {
    for (const collection of ['tasks', 'roles']) {
      const board = freshSnapshot()
      board[collection][1].id = board[collection][0].id
      expect(() => parseBoard(board)).toThrow('IDs must be unique')
    }
  })

  it('rejects unknown statuses and roles', () => {
    const board = freshSnapshot()
    board.tasks[0].status = 'signed-off'
    expect(() => parseBoard(board)).toThrow('unknown task status')
    board.tasks[0].status = 'review'
    board.tasks[0].role = 'unassigned-agent'
    expect(() => parseBoard(board)).toThrow('unknown task role')
  })

  it('requires evidence for verified tasks', () => {
    const board = freshSnapshot()
    board.tasks[0].status = 'verified'
    board.tasks[0].evidence = []
    expect(() => parseBoard(board)).toThrow('verified tasks require evidence')
  })

  it('rejects invented commit and runtime metadata', () => {
    const board = freshSnapshot()
    board.tasks[0].commit = 'invented'
    expect(() => parseBoard(board)).toThrow('no commit evidence')
    delete board.tasks[0].commit
    board.roles[0].runtime = 'confirmed'
    expect(() => parseBoard(board)).toThrow('runtime metadata is unverified')
  })

  it('requires a real ISO snapshot date and nonnegative counts', () => {
    const board = freshSnapshot()
    board.snapshotAt = 'live'
    expect(() => parseBoard(board)).toThrow('canonical ISO timestamp')
    board.snapshotAt = snapshot.snapshotAt
    board.suiteReports[0].passed = -1
    expect(() => parseBoard(board)).toThrow('invalid handoff count')
  })

  it('rejects an unsafe evidence link inside an otherwise valid board', () => {
    const board = freshSnapshot()
    board.tasks[0].evidence = [{ label: 'Untrusted', path: 'javascript:alert(1)' }]
    expect(() => parseBoard(board)).toThrow('unsafe or invalid evidence')
  })

  it('derives counts from actual tasks and composes search and filters', () => {
    const board = parseBoard(snapshot)
    const counts = taskCounts(board.tasks)
    expect(TASK_STATUSES.reduce((total, status) => total + counts[status], 0)).toBe(board.tasks.length)
    expect(filterTasks(board.tasks, '  CATALOGUE  ', 'verified', 'data').map((task) => task.id)).toEqual(['source-catalogue'])
    expect(filterTasks(board.tasks, 'catalogue', 'backlog', 'data')).toHaveLength(0)
    expect(filterTasks(board.tasks, '', 'all', 'all')).toHaveLength(board.tasks.length)
  })
})

describe('office release evidence boundaries', () => {
  it.each(['arindamchatterjee007.github.io', 'ArindamChatterjee007.github.io'])('accepts complete scoped evidence with hostname %s', (hostname) => {
    const board = deployedSnapshot()
    board.release.url = `https://${hostname}/kolkata-puja-guide/`
    expect(parseBoard(board).release).toEqual(board.release)
  })

  it('requires release: null while publication is pending', () => {
    const board = freshSnapshot()
    board.publication = 'pending'
    for (const release of [undefined, deployedSnapshot().release]) {
      board.release = release
      expect(() => parseBoard(board)).toThrow('pending publication requires release: null')
    }
    board.release = null
    expect(parseBoard(board).release).toBeNull()
  })

  it('rejects unknown publication states and extra release fields', () => {
    const board = freshSnapshot()
    board.publication = 'published'
    expect(() => parseBoard(board)).toThrow('unknown publication status')
    Object.assign(board, deployedSnapshot())
    board.release.tracking = 'not-public-evidence'
    expect(() => parseBoard(board)).toThrow('exactly five release fields')
  })

  it.each(['url', 'repository', 'commit', 'runUrl', 'deployedAt'])('rejects deployed evidence missing %s', (field) => {
    const board = deployedSnapshot()
    delete board.release[field as keyof typeof board.release]
    expect(() => parseBoard(board)).toThrow('exactly five release fields')
  })

  it.each([
    ['url', 'https://arindamchatterjee007.github.io.evil.example/kolkata-puja-guide/'],
    ['url', 'https://arindamchatterjee007.github.io/another-project/'],
    ['url', 'https://arindamchatterjee007.github.io/other/../kolkata-puja-guide/'],
    ['url', 'https://arindamchatterjee007.github.io/kolkata-puja-guide/?token=fixture'],
    ['url', 'https://user:fixture@arindamchatterjee007.github.io/kolkata-puja-guide/'],
    ['url', 'http://arindamchatterjee007.github.io/kolkata-puja-guide/'],
    ['url', 'javascript:alert(1)'],
    ['repository', 'https://github.com.evil.example/ArindamChatterjee007/kolkata-puja-guide'],
    ['repository', 'https://github.com/another/kolkata-puja-guide'],
    ['repository', 'https://github.com/ArindamChatterjee007/kolkata-puja-guide#tracking'],
    ['runUrl', 'https://github.com.evil.example/ArindamChatterjee007/kolkata-puja-guide/actions/runs/123'],
    ['runUrl', 'https://github.com/another/kolkata-puja-guide/actions/runs/123'],
    ['runUrl', 'https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/not-a-number'],
    ['runUrl', 'https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/123?token=fixture'],
    ['commit', 'abc'],
    ['commit', 'g'.repeat(40)],
    ['deployedAt', '2026-10-15'],
  ])('rejects invalid release %s: %s', (field, value) => {
    const board = deployedSnapshot()
    board.release[field as keyof typeof board.release] = value
    expect(() => parseBoard(board)).toThrow('Invalid office snapshot')
  })
})

describe('office evidence link boundaries', () => {
  it('maps repository paths to the intended public repository', () => {
    const prefix = 'https://github.com/ArindamChatterjee007/kolkata-puja-guide/blob/main/'
    expect(evidenceHref('docs/DATA_SOURCES.md')).toBe(`${prefix}docs/DATA_SOURCES.md`)
    expect(evidenceHref(`${prefix}tests/unit/office.test.ts#L1`)).toBe(`${prefix}tests/unit/office.test.ts#L1`)
  })

  it.each([
    'javascript:alert(1)', 'data:text/html,test', '//evil.example/test',
    'https://github.com.evil.example/ArindamChatterjee007/kolkata-puja-guide/blob/main/README.md',
    'https://github.com/another/repository/blob/main/README.md',
    'https://github.com/ArindamChatterjee007/kolkata-puja-guide/blob/main/README.md?token=secret',
    '../README.md', 'docs/../README.md', 'docs/%2e%2e/README.md',
    'docs//README.md', 'docs/\\README.md', '/docs/README.md',
    'file:///private/document.md', 'docs/report.md#private-preview',
    'docs/report.md?view=private-preview', '<img src=x onerror=alert(1)>',
  ])('rejects unsafe or out-of-scope path %s', (path) => {
    expect(evidenceHref(path)).toBeNull()
  })
})

describe('Pages and offline configuration', () => {
  it('limits the dev server to this project rather than the parent workspace', () => {
    expect(viteConfig.server?.host).toBe('127.0.0.1')
    expect(viteConfig.server?.fs?.strict).toBe(true)
    expect(viteConfig.server?.fs?.allow).toEqual([new URL('../../', import.meta.url).pathname])
  })

  it('builds both project-relative pages and keeps custom Actions opt-in', () => {
    expect(viteConfig.base).toBe('./')
    expect(viteConfig.build?.rolldownOptions?.input).toEqual({
      main: new URL('../../index.html', import.meta.url).pathname,
      office: new URL('../../office.html', import.meta.url).pathname,
    })
    const workflows = new URL('../../.github/workflows/', import.meta.url)
    expect(existsSync(workflows) ? readdirSync(workflows) : []).toEqual([])
    const example = readFileSync(new URL('../../docs/github-pages-actions.example.yml', import.meta.url), 'utf8')
    expect(example).toContain('path: dist')
    expect(example).toContain("node-version: '24'")
  })

  it('does not route office navigation into the planner fallback', () => {
    const denied = pwaOptions.workbox.navigateFallbackDenylist
    expect(denied.some((pattern) => pattern.test('/kolkata-puja-guide/office.html'))).toBe(true)
    expect(denied.some((pattern) => pattern.test('/kolkata-puja-guide/office.html?test=1'))).toBe(true)
    expect(denied.some((pattern) => pattern.test('/kolkata-puja-guide/'))).toBe(false)
    expect(pwaOptions.workbox.navigateFallback).toBe('index.html')
  })

  it('does not configure third-party map caching, analytics, or forced worker takeover', () => {
    expect(pwaOptions.workbox.runtimeCaching).toEqual([])
    expect(pwaOptions.workbox.offlineGoogleAnalytics).toBe(false)
    expect(pwaOptions.workbox.skipWaiting).toBe(false)
    expect(pwaOptions.workbox.clientsClaim).toBe(false)
    expect(pwaOptions.injectRegister).toBe('script-defer')
    expect(pwaOptions.registerType).toBe('autoUpdate')
  })

  it('defines standalone branding and dedicated mask-safe PNG icons', () => {
    expect(pwaOptions.manifest.name).toBe('PujaPath')
    expect(pwaOptions.manifest.short_name).toBe('PujaPath')
    expect(pwaOptions.manifest.display).toBe('standalone')
    expect(pwaOptions.manifest.theme_color).toBe('#bc2f32')
    expect(pwaOptions.manifest.scope).toBe('./')
    expect(pwaOptions.manifest.icons).toContainEqual({ src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' })
  })
})