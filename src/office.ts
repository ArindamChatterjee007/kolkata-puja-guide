import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUpRight, Columns3, List, RefreshCw, Search, type LucideIcon } from 'lucide-react'
import './office.css'

export const TASK_STATUSES = ['backlog', 'in-progress', 'review', 'verified', 'blocked'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface OfficeEvidence {
  label: string
  path: string
}

export interface OfficeRole {
  id: string
  name: string
  requestedModel: 'Claude Fable 5.1' | 'GPT-6 Astra' | null
  assignment: 'requested' | 'pending'
  runtime: 'unverified'
}

export interface OfficeTask {
  id: string
  title: string
  role: string
  status: TaskStatus
  summary: string
  evidence: OfficeEvidence[]
}

export interface OfficeRelease {
  url: string
  repository: string
  commit: string
  runUrl: string
  deployedAt: string
}

export type OfficeBoard = {
  schemaVersion: 1
  project: 'PujaPath'
  snapshotAt: string
  roles: OfficeRole[]
  tasks: OfficeTask[]
  suiteReports: { id: string; label: string; passed: number; provenance: 'handoff' }[]
  fullSuite: { passed: number; files: number; checkedAt: string } | null
  coverage: { entries: number; sourced: number; metroNodes: number; starts: number; routes: number; currentTimetable: false }
} & ({ publication: 'pending'; release: null } | { publication: 'deployed'; release: OfficeRelease })

const REPOSITORY = 'https://github.com/ArindamChatterjee007/kolkata-puja-guide/blob/main/'
const REPOSITORY_PATH = /^(?:README\.md|docs\/[a-zA-Z0-9][a-zA-Z0-9._/-]*\.md|tests\/[a-zA-Z0-9][a-zA-Z0-9._/-]*\.test\.ts)(?:#L[1-9]\d*)?$/

export function evidenceHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const path = value.startsWith(REPOSITORY) ? value.slice(REPOSITORY.length) : value
  if (!REPOSITORY_PATH.test(path) || path.split('/').some((part) => part === '..' || part === '.' || part === '')) return null
  return `${REPOSITORY}${path}`
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid office snapshot: ${message}`)
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 1200
}

function timestamp(value: unknown): boolean {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value
}

function count(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function releaseUrl(value: unknown, origin: string, path: string | RegExp): boolean {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.origin === origin
      && (typeof path === 'string' ? url.pathname === path : path.test(url.pathname))
      && value.toLowerCase() === `${url.origin}${url.pathname}`.toLowerCase()
  } catch {
    return false
  }
}

function uniqueId(value: unknown, known: Set<string>): asserts value is string {
  requireValue(typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value) && !known.has(value), 'IDs must be unique stable slugs')
  known.add(value)
}

export function parseBoard(value: unknown): OfficeBoard {
  requireValue(record(value), 'expected an object')
  requireValue(value.schemaVersion === 1 && value.project === 'PujaPath', 'unsupported schema or project')
  requireValue(timestamp(value.snapshotAt), 'snapshotAt must be a canonical ISO timestamp')
  requireValue(value.publication === 'pending' || value.publication === 'deployed', 'unknown publication status')
  requireValue(!('commit' in value), 'commit evidence belongs in release')
  if (value.publication === 'pending') {
    requireValue(value.release === null, 'pending publication requires release: null')
  } else {
    requireValue(record(value.release) && Object.keys(value.release).length === 5, 'deployed publication requires exactly five release fields')
    requireValue(releaseUrl(value.release.url, 'https://arindamchatterjee007.github.io', '/kolkata-puja-guide/'), 'invalid release Pages URL')
    requireValue(releaseUrl(value.release.repository, 'https://github.com', '/ArindamChatterjee007/kolkata-puja-guide'), 'invalid release repository')
    requireValue(typeof value.release.commit === 'string' && /^[a-f\d]{40}$/i.test(value.release.commit), 'release commit must be 40 hex characters')
    requireValue(releaseUrl(value.release.runUrl, 'https://github.com', /^\/ArindamChatterjee007\/kolkata-puja-guide\/actions\/runs\/\d+$/), 'invalid release workflow run URL')
    requireValue(timestamp(value.release.deployedAt), 'deployedAt must be a canonical ISO timestamp')
  }
  requireValue(Array.isArray(value.roles) && value.roles.length > 0, 'roles are required')
  const roleIds = new Set<string>()
  for (const role of value.roles) {
    requireValue(record(role), 'invalid role')
    uniqueId(role.id, roleIds)
    requireValue(text(role.name), 'role name is required')
    requireValue(role.runtime === 'unverified', 'provider runtime metadata is unverified')
    requireValue(
      (role.assignment === 'pending' && role.requestedModel === null)
        || (role.assignment === 'requested' && ['Claude Fable 5.1', 'GPT-6 Astra'].includes(String(role.requestedModel))),
      'requested models and pending assignments must be explicit',
    )
  }
  requireValue(Array.isArray(value.tasks), 'tasks are required')
  const taskIds = new Set<string>()
  for (const task of value.tasks) {
    requireValue(record(task), 'invalid task')
    uniqueId(task.id, taskIds)
    requireValue(text(task.title) && text(task.summary), 'task text is required')
    requireValue(typeof task.role === 'string' && roleIds.has(task.role), 'unknown task role')
    requireValue(TASK_STATUSES.includes(task.status as TaskStatus), 'unknown task status')
    requireValue(!('commit' in task), 'no commit evidence is recorded')
    requireValue(Array.isArray(task.evidence), 'evidence must be an array')
    requireValue(task.status !== 'verified' || task.evidence.length > 0, 'verified tasks require evidence')
    for (const evidence of task.evidence) {
      requireValue(record(evidence) && text(evidence.label) && evidenceHref(evidence.path), 'unsafe or invalid evidence')
    }
  }
  requireValue(Array.isArray(value.suiteReports), 'per-suite handoff reports are required')
  const suiteIds = new Set<string>()
  for (const suite of value.suiteReports) {
    requireValue(record(suite), 'invalid suite report')
    uniqueId(suite.id, suiteIds)
    requireValue(text(suite.label) && count(suite.passed) && suite.provenance === 'handoff', 'invalid handoff count')
  }
  requireValue(value.fullSuite === null || (
    record(value.fullSuite) && count(value.fullSuite.passed) && count(value.fullSuite.files) && timestamp(value.fullSuite.checkedAt)
  ), 'full-suite results need a timestamped local run')
  requireValue(record(value.coverage), 'coverage is required')
  for (const key of ['entries', 'sourced', 'metroNodes', 'starts', 'routes']) {
    requireValue(count(value.coverage[key]), 'coverage must use nonnegative integers')
  }
  requireValue(Number(value.coverage.sourced) <= Number(value.coverage.entries), 'sourced coverage exceeds entries')
  requireValue(value.coverage.currentTimetable === false, 'candidate coverage is not a current festival timetable')
  return value as unknown as OfficeBoard
}

export function taskCounts(tasks: OfficeTask[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { backlog: 0, 'in-progress': 0, review: 0, verified: 0, blocked: 0 }
  for (const task of tasks) counts[task.status] += 1
  return counts
}

export function filterTasks(tasks: OfficeTask[], query: string, status: string, role: string): OfficeTask[] {
  const normalized = query.trim().toLocaleLowerCase('en')
  return tasks.filter((task) => (status === 'all' || task.status === status)
    && (role === 'all' || task.role === role)
    && `${task.id} ${task.title} ${task.summary} ${task.role}`.toLocaleLowerCase('en').includes(normalized))
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog', 'in-progress': 'In progress', review: 'Review', verified: 'Verified', blocked: 'Blocked',
}

function element<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, className = '', content?: string): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag)
  node.className = className
  if (content !== undefined) node.textContent = content
  return node
}

function requiredElement<Element extends HTMLElement>(id: string): Element {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing office element: ${id}`)
  return node as Element
}

function displayTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC',
  }).format(new Date(value)) + ' UTC'
}

function mountOffice(): void {
  const search = requiredElement<HTMLInputElement>('task-search')
  const statusFilter = requiredElement<HTMLSelectElement>('status-filter')
  const roleFilter = requiredElement<HTMLSelectElement>('role-filter')
  const listButton = requiredElement<HTMLButtonElement>('list-view')
  const boardButton = requiredElement<HTMLButtonElement>('board-view')
  const refreshButton = requiredElement<HTMLButtonElement>('refresh-board')
  const tasksRegion = requiredElement('tasks')
  const refreshError = requiredElement('refresh-error')
  const sourceState = requiredElement('source-state')
  const icons: Record<string, LucideIcon> = { arrow: ArrowUpRight, list: List, board: Columns3, refresh: RefreshCw, search: Search }
  for (const host of document.querySelectorAll<HTMLElement>('[data-icon]')) {
    const icon = icons[host.dataset.icon ?? '']
    if (icon) createRoot(host).render(createElement(icon, { size: 18, strokeWidth: 1.8, 'aria-hidden': true }))
  }

  let board: OfficeBoard | null = null
  let lastPayload = ''
  let view: 'list' | 'board' = 'board'
  let refreshTimer: number | undefined
  let request: AbortController | undefined

  function taskItem(task: OfficeTask): HTMLLIElement {
    const item = element('li', 'task-item')
    item.dataset.taskId = task.id
    item.dataset.status = task.status
    const content = element('div', 'task-content')
    content.append(element('span', 'task-id', task.id), element('h3', '', task.title), element('p', 'task-summary', task.summary))
    if (task.evidence.length) {
      const evidenceList = element('ul', 'task-evidence')
      evidenceList.setAttribute('aria-label', `${task.title} evidence`)
      for (const evidence of task.evidence) {
        const href = evidenceHref(evidence.path)
        if (!href) continue
        const link = element('a', '', evidence.label)
        link.href = href
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.title = `${evidence.path} (public repository; ${board?.publication === 'deployed' ? 'deployment recorded' : 'publication pending'})`
        const entry = element('li')
        entry.append(link)
        evidenceList.append(entry)
      }
      content.append(evidenceList)
    }
    const metadata = element('div', 'task-meta')
    const role = board?.roles.find((candidate) => candidate.id === task.role)
    metadata.append(element('span', 'task-owner', role?.name ?? task.role), element('span', `status-badge status-${task.status}`, STATUS_LABELS[task.status]))
    item.append(content, metadata)
    return item
  }

  function renderTasks(): void {
    if (!board) return
    const visible = filterTasks(board.tasks, search.value, statusFilter.value, roleFilter.value)
    requiredElement('result-count').textContent = `${visible.length} of ${board.tasks.length} tasks`
    listButton.setAttribute('aria-pressed', String(view === 'list'))
    boardButton.setAttribute('aria-pressed', String(view === 'board'))
    if (!visible.length) {
      tasksRegion.replaceChildren(element('p', 'empty-state', 'No matching tasks.'))
      return
    }
    if (view === 'list') {
      const list = element('ul', 'task-list')
      list.append(...visible.map(taskItem))
      tasksRegion.replaceChildren(list)
      return
    }
    const columns = element('div', 'task-board')
    columns.setAttribute('aria-label', 'Task board')
    columns.tabIndex = 0
    for (const status of TASK_STATUSES) {
      const tasks = visible.filter((task) => task.status === status)
      const lane = element('section', `task-lane lane-${status}`)
      lane.setAttribute('aria-labelledby', `lane-${status}`)
      const heading = element('h3', 'lane-heading', STATUS_LABELS[status])
      heading.id = `lane-${status}`
      heading.append(element('span', 'lane-count', String(tasks.length)))
      const list = element('ul', 'lane-tasks')
      list.append(...tasks.map(taskItem))
      lane.append(heading, list)
      if (!tasks.length) lane.append(element('p', 'lane-empty', 'No tasks'))
      columns.append(lane)
    }
    tasksRegion.replaceChildren(columns)
  }

  function renderSnapshot(): void {
    if (!board) return
    requiredElement('snapshot-time').textContent = `Snapshot ${displayTime(board.snapshotAt)}`
    requiredElement('publication-state').textContent = board.publication === 'deployed' ? 'Deployed' : 'Publication pending'
    const publicationEvidence = requiredElement('publication-evidence')
    publicationEvidence.replaceChildren()
    if (board.publication === 'deployed') {
      const release = board.release
      const links: [string, string][] = [
        ['Pages', release.url], ['Repository', release.repository],
        [`Commit ${release.commit.slice(0, 7)}`, `${release.repository}/commit/${release.commit}`],
        ['Deployment run', release.runUrl],
      ]
      for (const [label, href] of links) {
        const link = element('a', '', label)
        link.href = href
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        if (publicationEvidence.childNodes.length) publicationEvidence.append(' / ')
        publicationEvidence.append(link)
      }
      publicationEvidence.append(` / Deployed ${displayTime(release.deployedAt)}`)
    } else {
      publicationEvidence.textContent = 'Repository evidence links: publication pending'
    }
    const quality = board.tasks.find((task) => task.id === 'integrated-quality')
    requiredElement('quality-state').textContent = quality
      ? `${STATUS_LABELS[quality.status]}: ${quality.summary}`
      : 'Integrated quality record unavailable.'
    const stats = requiredElement('task-stats')
    const counts = taskCounts(board.tasks)
    stats.replaceChildren(...TASK_STATUSES.map((status) => {
      const stat = element('div', `stat stat-${status}`)
      stat.append(element('span', 'stat-label', STATUS_LABELS[status]), element('strong', 'stat-value', String(counts[status])))
      return stat
    }))

    const selectedRole = roleFilter.value
    const allRoles = element('option', '', 'All roles')
    allRoles.value = 'all'
    roleFilter.replaceChildren(allRoles, ...board.roles.map((role) => {
      const option = element('option', '', role.name)
      option.value = role.id
      return option
    }))
    roleFilter.value = board.roles.some((role) => role.id === selectedRole) ? selectedRole : 'all'

    requiredElement('role-roster').replaceChildren(...board.roles.map((role) => {
      const item = element('li', 'role-entry')
      item.append(element('strong', '', role.name), element('span', '', role.requestedModel ? `${role.requestedModel} requested` : 'Assignment pending'))
      return item
    }))
    requiredElement('suite-reports').replaceChildren(...board.suiteReports.map((suite) => {
      const item = element('li')
      item.append(element('span', '', suite.label), element('strong', '', `${suite.passed} PASS`))
      return item
    }))
    requiredElement('full-suite').textContent = board.fullSuite
      ? `Local full-suite run: ${board.fullSuite.passed} tests in ${board.fullSuite.files} files passed. ${displayTime(board.fullSuite.checkedAt)}.`
      : 'Fresh full-suite run pending. Handoff counts are not an aggregate.'
    const coverage: [string, string][] = [
      ['Source-backed entries', `${board.coverage.sourced}/${board.coverage.entries}`],
      ['Metro nodes', String(board.coverage.metroNodes)], ['Start points', String(board.coverage.starts)], ['Example routes', String(board.coverage.routes)],
    ]
    requiredElement('catalogue-coverage').replaceChildren(...coverage.flatMap(([label, value]) => [element('dt', '', label), element('dd', '', value)]))
    renderTasks()
  }

  function connectionLabel(): void {
    sourceState.textContent = board ? (navigator.onLine ? 'Cached build snapshot' : 'Offline cached snapshot') : 'No snapshot available'
  }

  function scheduleRefresh(): void {
    window.clearTimeout(refreshTimer)
    if (document.visibilityState === 'visible') refreshTimer = window.setTimeout(() => { void refresh() }, 30_000)
  }

  async function refresh(): Promise<void> {
    if (document.visibilityState !== 'visible' || request) return
    window.clearTimeout(refreshTimer)
    const controller = new AbortController()
    request = controller
    refreshButton.disabled = true
    tasksRegion.setAttribute('aria-busy', 'true')
    let timedOut = false
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 8_000)
    try {
      const response = await fetch(new URL('office/board.json', document.baseURI), {
        signal: controller.signal, cache: 'no-cache', credentials: 'omit', redirect: 'error',
      })
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Snapshot response unavailable')
      const payload = await response.text()
      if (payload.length > 128_000) throw new Error('Snapshot exceeds size limit')
      const nextBoard = parseBoard(JSON.parse(payload))
      if (request !== controller || document.visibilityState !== 'visible') return
      board = nextBoard
      if (payload !== lastPayload) {
        lastPayload = payload
        renderSnapshot()
      }
      requiredElement('checked-time').textContent = `Checked ${displayTime(new Date().toISOString())}`
      refreshError.hidden = true
      refreshError.textContent = ''
    } catch {
      if (request !== controller || document.visibilityState !== 'visible') return
      refreshError.textContent = `${timedOut ? 'Refresh timed out.' : 'Refresh failed.'} ${board ? 'The last valid snapshot is retained.' : 'No valid snapshot is available.'}`
      refreshError.hidden = false
      if (!board) {
        tasksRegion.replaceChildren(element('p', 'empty-state', 'Project snapshot unavailable.'))
        requiredElement('result-count').textContent = 'Snapshot unavailable'
      }
    } finally {
      window.clearTimeout(timeout)
      if (request === controller) {
        request = undefined
        refreshButton.disabled = false
        tasksRegion.setAttribute('aria-busy', 'false')
        connectionLabel()
        scheduleRefresh()
      }
    }
  }

  function pause(): void {
    window.clearTimeout(refreshTimer)
    request?.abort()
    request = undefined
    refreshButton.disabled = false
    tasksRegion.setAttribute('aria-busy', 'false')
  }

  search.addEventListener('input', renderTasks)
  statusFilter.addEventListener('change', renderTasks)
  roleFilter.addEventListener('change', renderTasks)
  listButton.addEventListener('click', () => { view = 'list'; renderTasks() })
  boardButton.addEventListener('click', () => { view = 'board'; renderTasks() })
  refreshButton.addEventListener('click', () => { void refresh() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh()
    else pause()
  })
  window.addEventListener('pagehide', pause)
  window.addEventListener('pageshow', (event) => { if (event.persisted) void refresh() })
  window.addEventListener('online', () => { connectionLabel(); void refresh() })
  window.addEventListener('offline', connectionLabel)
  void refresh()
}

if (typeof document !== 'undefined' && document.getElementById('office-root')) mountOffice()