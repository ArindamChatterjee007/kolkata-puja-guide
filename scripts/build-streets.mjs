import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { lstat, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export const STREET_BOUNDS = { south: 22.44, west: 88.28, north: 22.64, east: 88.49 }
const allowedHighways = new Set([
  'residential', 'tertiary', 'secondary', 'primary', 'unclassified', 'living_street',
  'pedestrian', 'footway', 'path', 'steps', 'service', 'track',
  'primary_link', 'secondary_link', 'tertiary_link',
])
const highSpeedHighways = new Set(['motorway', 'trunk', 'motorway_link', 'trunk_link'])
const allowedAccess = new Set(['yes', 'designated', 'permissive'])
const passableBarriers = new Set(['no', 'entrance', 'bollard', 'cycle_barrier', 'stile', 'kissing_gate'])
const maxResponseBytes = 30 * 1024 * 1024
const maxAssetBytes = 8 * 1024 * 1024
const maxPbfBytes = 349_999_999
const geofabrikUrl = 'https://download.geofabrik.de/asia/india/eastern-zone-latest.osm.pbf'
const projectRoot = resolve(fileURLToPath(new URL('../', import.meta.url)))
const assetPath = resolve(projectRoot, 'public/data/kolkata-walking.json')
const privateDirectory = resolve(projectRoot, '.private/street-data')
const boundsQuery = Object.values(STREET_BOUNDS).join(',')
export const OVERPASS_QUERY = `[out:json][timeout:90];(way["highway"~"^(${[...allowedHighways].join('|')})$"](${boundsQuery});way["highway"~"^(${[...highSpeedHighways].join('|')})$"]["foot"~"^(yes|designated)$"](${boundsQuery}););(._;>;);out body;`
const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

function conditionalAccess(tags) {
  return Object.keys(tags).some((key) => /^(?:(?:access|foot)(?::(?:forward|backward))?|oneway:foot|foot:oneway):conditional$/.test(key))
}

function permitsFoot(tags, direction) {
  if (['no', 'private'].includes(tags.access) || ['no', 'private'].includes(tags.foot)
    || (direction && ['no', 'private'].includes(tags[`access:${direction}`]))) return false
  const foot = (direction && tags[`foot:${direction}`]) ?? tags.foot
  const access = (direction && tags[`access:${direction}`]) ?? tags.access
  if (foot !== undefined) return allowedAccess.has(foot)
  return access === undefined || allowedAccess.has(access)
}

export function isWalkableNode(tags = {}) {
  if (conditionalAccess(tags) || tags.locked === 'yes' || !permitsFoot(tags)) return false
  return !tags.barrier || passableBarriers.has(tags.barrier) || allowedAccess.has(tags.foot)
}

export function walkingDirections(tags = {}) {
  if ((!allowedHighways.has(tags.highway) && !highSpeedHighways.has(tags.highway))
    || tags.area === 'yes' || tags.construction || tags.proposed || conditionalAccess(tags)) return []
  if (highSpeedHighways.has(tags.highway) && !['yes', 'designated'].includes(tags.foot)) return []
  const oneWay = tags['oneway:foot'] ?? tags['foot:oneway']
  if (oneWay !== undefined && !['yes', '1', 'true', '-1', 'reverse', 'no', '0', 'false'].includes(oneWay)) return []
  if (tags['oneway:foot'] !== undefined && tags['foot:oneway'] !== undefined
    && tags['oneway:foot'] !== tags['foot:oneway']) return []
  const directions = []
  if (permitsFoot(tags, 'forward') && !['-1', 'reverse'].includes(oneWay)) directions.push(1)
  if (permitsFoot(tags, 'backward') && !['yes', '1', 'true'].includes(oneWay)) directions.push(-1)
  return directions
}

function inside(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= STREET_BOUNDS.south && lat <= STREET_BOUNDS.north
    && lng >= STREET_BOUNDS.west && lng <= STREET_BOUNDS.east
}

function distance(first, second) {
  const radians = Math.PI / 180
  const chord = Math.sin((second.lat - first.lat) * radians / 2) ** 2
    + Math.cos(first.lat * radians) * Math.cos(second.lat * radians)
    * Math.sin((second.lng - first.lng) * radians / 2) ** 2
  return 6_371_008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, chord))))
}

function streetName(tags) {
  const name = tags['name:en'] || tags.name || ''
  return typeof name === 'string' && !/[<>\u0000-\u001f\u007f]/.test(name)
    ? name.trim().replace(/\s+/g, ' ').slice(0, 160) : ''
}

export function convertOverpass(raw, provenance) {
  if (!raw || !Array.isArray(raw.elements) || raw.remark || !Number.isFinite(Date.parse(raw.osm3s?.timestamp_osm_base))) {
    throw new Error('Incomplete Overpass response or missing OSM snapshot timestamp')
  }
  const nodesById = new Map()
  let blockedNodes = 0
  for (const element of raw.elements) {
    if (element.type !== 'node') continue
    if (!Number.isSafeInteger(element.id) || element.id <= 0) throw new Error('Invalid OSM node ID')
    if (!inside(element.lat, element.lon)) continue
    if (!isWalkableNode(element.tags)) {
      blockedNodes += 1
      continue
    }
    nodesById.set(element.id, { lat: element.lat, lng: element.lon })
  }
  const segments = new Map()
  let rejectedWays = 0
  let acceptedWays = 0
  for (const way of raw.elements.filter((element) => element.type === 'way').sort((first, second) => first.id - second.id)) {
    const tags = way.tags ?? {}
    const directions = walkingDirections(tags)
    if (!directions.length || !Array.isArray(way.nodes)) {
      rejectedWays += 1
      continue
    }
    acceptedWays += 1
    const name = streetName(tags)
    const flags = (tags.bridge && tags.bridge !== 'no' ? 1 : 0)
      | (tags.highway === 'steps' ? 2 : 0) | (tags.tunnel && tags.tunnel !== 'no' ? 4 : 0)
      | (highSpeedHighways.has(tags.highway) ? 8 : 0)
    for (let index = 1; index < way.nodes.length; index += 1) {
      const previousId = way.nodes[index - 1]
      const nextId = way.nodes[index]
      const first = nodesById.get(previousId)
      const second = nodesById.get(nextId)
      if (!first || !second || previousId === nextId) continue
      const metres = distance(first, second)
      if (metres < 0.01 || metres > 5_000) continue
      const forward = previousId < nextId
      const from = Math.min(previousId, nextId)
      const to = Math.max(previousId, nextId)
      const key = `${from}:${to}`
      const segment = segments.get(key) ?? { from, to, metres, name, flags, directions: new Set() }
      for (const direction of directions) segment.directions.add(forward ? direction : -direction)
      segment.flags |= flags
      if (!segment.name) segment.name = name
      segments.set(key, segment)
    }
  }
  const usedNodeIds = [...new Set([...segments.values()].flatMap(({ from, to }) => [from, to]))].sort((first, second) => first - second)
  const nodes = usedNodeIds.map((id) => [id,
    Math.round(nodesById.get(id).lat * 1e6) / 1e6, Math.round(nodesById.get(id).lng * 1e6) / 1e6])
  const nodeIndices = new Map(usedNodeIds.map((id, index) => [id, index]))
  const names = ['', ...[...new Set([...segments.values()].map((segment) => segment.name).filter(Boolean))].sort()]
  const nameIndices = new Map(names.map((name, index) => [name, index]))
  const edges = [...segments.values()].sort((first, second) => first.from - second.from || first.to - second.to)
    .map((segment) => [nodeIndices.get(segment.from), nodeIndices.get(segment.to),
      Math.round(segment.metres * 1_000) / 1_000, nameIndices.get(segment.name), segment.flags,
      segment.directions.size === 2 ? 0 : [...segment.directions][0]])
  if (!nodes.length || !edges.length) throw new Error('No connected walkable street segments in response')
  return {
    version: 1,
    bounds: STREET_BOUNDS,
    source: {
      ...provenance,
      provider: 'OpenStreetMap', license: 'ODbL-1.0', attribution: 'OpenStreetMap contributors',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
      attributionUrl: 'https://www.openstreetmap.org/copyright', timestamp: raw.osm3s.timestamp_osm_base,
      query: provenance.query === undefined ? OVERPASS_QUERY : provenance.query,
      generator: 'scripts/build-streets.mjs', filterVersion: 2,
    },
    filters: {
      allowedHighways: [...allowedHighways], highSpeedRequiresFoot: ['yes', 'designated'],
      implicitFootOnOrdinaryHighways: true, conditionalAccessExcluded: true,
      explicitPrivateOrNoExcluded: true, blockedNodes, acceptedWays, rejectedWays,
      boundary: 'Both original OSM endpoints must be in bounds; no synthetic boundary connectors.',
      duplicateSegments: 'Same OSM node pair merged; permitted directions and known flags combined.',
    },
    nodes, names, edges,
  }
}

export function convertOsmXml(xml, metadata) {
  if (typeof xml !== 'string' || Buffer.byteLength(xml) > 150 * 1024 * 1024
    || /<!DOCTYPE|<!ENTITY/i.test(xml) || !Number.isFinite(Date.parse(metadata?.snapshot))) {
    throw new Error('Invalid OSM XML or missing verified PBF snapshot timestamp')
  }
  if (XMLValidator.validate(xml) !== true) throw new Error('Malformed OSM XML')
  const parser = new XMLParser({
    ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: false,
    parseTagValue: false, isArray: (name) => ['node', 'way', 'nd', 'tag'].includes(name),
  })
  const osm = parser.parse(xml).osm
  if (osm?.version !== '0.6') throw new Error('Expected OSM XML version 0.6')
  const tagsOf = (element) => Object.fromEntries((element.tag ?? []).map((tag) => [tag.k, tag.v]))
  const nodes = (osm.node ?? []).map((node) => ({
    type: 'node', id: Number(node.id), lat: Number(node.lat), lon: Number(node.lon), tags: tagsOf(node),
  }))
  const ways = (osm.way ?? []).map((way) => ({
    type: 'way', id: Number(way.id), nodes: (way.nd ?? []).map((node) => Number(node.ref)), tags: tagsOf(way),
  }))
  return convertOverpass({ osm3s: { timestamp_osm_base: metadata.snapshot }, elements: [...nodes, ...ways] }, {
    distributor: 'Geofabrik', endpoint: metadata.url, resolvedEndpoint: metadata.resolvedUrl,
    fetchedAt: metadata.fetchedAt, checkedAt: metadata.checkedAt, lastModified: metadata.lastModified,
    pbfBytes: metadata.bytes, pbfSha256: metadata.sha256, xmlSha256: metadata.xmlSha256,
    pbfHeader: metadata.pbfHeader, osmiumVersion: metadata.osmiumVersion,
    commands: metadata.commands, inputFormat: 'Osmium OSM XML 0.6', query: null,
    extractedAt: metadata.extractedAt,
  })
}

export function compactStreetGraph(data) {
  const adjacent = data.nodes.map(() => [])
  data.edges.forEach((edge, index) => {
    adjacent[edge[0]].push(index)
    adjacent[edge[1]].push(index)
  })
  const directionFrom = (edge, node) => edge[5] * (edge[0] === node ? 1 : -1)
  const retained = new Set()
  adjacent.forEach((edges, node) => {
    if (edges.length !== 2) {
      retained.add(node)
      return
    }
    const first = data.edges[edges[0]]
    const second = data.edges[edges[1]]
    if (first[3] !== second[3] || first[4] !== second[4]
      || directionFrom(first, node) !== -directionFrom(second, node)) retained.add(node)
  })
  const visited = new Uint8Array(data.edges.length)
  const paths = []
  const walk = (start, firstEdge) => {
    const nodes = [start]
    const edges = []
    let current = start
    let edgeIndex = firstEdge
    do {
      const edge = data.edges[edgeIndex]
      visited[edgeIndex] = 1
      edges.push(edgeIndex)
      current = edge[0] === current ? edge[1] : edge[0]
      nodes.push(current)
      if (retained.has(current) || current === start) break
      edgeIndex = adjacent[current].find((candidate) => !visited[candidate])
    } while (edgeIndex !== undefined)
    if (nodes.at(-1) === start) {
      const middle = Math.floor(edges.length / 2)
      retained.add(nodes[middle])
      paths.push({ nodes: nodes.slice(0, middle + 1), edges: edges.slice(0, middle) })
      paths.push({ nodes: nodes.slice(middle), edges: edges.slice(middle) })
    } else {
      paths.push({ nodes, edges })
    }
  }
  for (const node of [...retained].sort((first, second) => first - second)) {
    for (const edge of adjacent[node]) if (!visited[edge]) walk(node, edge)
  }
  data.edges.forEach((edge, index) => {
    if (!visited[index]) {
      retained.add(edge[0])
      walk(edge[0], index)
    }
  })
  const endpoints = [...new Set(paths.flatMap((path) => [path.nodes[0], path.nodes.at(-1)]))]
    .sort((first, second) => first - second)
  const nodeIndices = new Map(endpoints.map((node, index) => [node, index]))
  const edges = paths.map((path) => {
    const first = data.edges[path.edges[0]]
    let latitude = Math.round(data.nodes[path.nodes[0]][1] * 1e6)
    let longitude = Math.round(data.nodes[path.nodes[0]][2] * 1e6)
    const shape = []
    for (const node of path.nodes.slice(1, -1)) {
      const nextLatitude = Math.round(data.nodes[node][1] * 1e6)
      const nextLongitude = Math.round(data.nodes[node][2] * 1e6)
      shape.push(nextLatitude - latitude, nextLongitude - longitude)
      latitude = nextLatitude
      longitude = nextLongitude
    }
    return [nodeIndices.get(path.nodes[0]), nodeIndices.get(path.nodes.at(-1)),
      Math.round(path.edges.reduce((sum, index) => sum + data.edges[index][2], 0) * 1000) / 1000,
      first[3], first[4], directionFrom(first, path.nodes[0]), shape]
  })
  return { ...data, version: 2, nodes: endpoints.map((node) => data.nodes[node]), edges,
    geometryEncoding: 'intermediate-delta-lat-lng-e6',
    compression: {
      algorithm: 'degree-two, identical street name/flags/pedestrian direction; cycle anchors retained',
      inputNodes: data.nodes.length, inputEdges: data.edges.length,
      geometryPoints: edges.reduce((sum, edge) => sum + edge[6].length / 2 + 2, 0),
      coordinateDecimals: 6, allPolylinePointsRetained: true,
      topology: 'Only original OSM node IDs connect edges; coordinate crossings never create junctions.',
    } }
}

async function fileHash(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function fileSize(path) {
  try {
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Expected ordinary data file: ${path}`)
    return info.size
  } catch (error) {
    if (error.code === 'ENOENT') return 0
    throw error
  }
}

async function publicHead() {
  let url = geofabrikUrl
  for (let hop = 0; hop < 3; hop += 1) {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(30_000) })
    if ([301, 302, 307, 308].includes(response.status)) {
      const next = new URL(response.headers.get('location'), url)
      if (next.protocol !== 'https:' || next.hostname !== 'download.geofabrik.de') throw new Error('Unexpected extract redirect')
      url = next.href
      continue
    }
    const bytes = Number(response.headers.get('content-length'))
    const lastModified = response.headers.get('last-modified')
    if (response.status !== 200 || !Number.isSafeInteger(bytes) || bytes <= 0 || bytes > maxPbfBytes
      || !Number.isFinite(Date.parse(lastModified))) throw new Error(`Unusable public extract HEAD: HTTP ${response.status}`)
    return { url: geofabrikUrl, resolvedUrl: url, expectedBytes: bytes, lastModified,
      etag: response.headers.get('etag'), checkedAt: new Date().toISOString() }
  }
  throw new Error('Too many public extract redirects')
}

async function prepareGeofabrik() {
  const input = resolve(privateDirectory, 'eastern-zone.osm.pbf')
  const metadataPath = resolve(privateDirectory, 'metadata.json')
  await mkdir(privateDirectory, { recursive: true })
  const remote = await publicHead()
  let metadata = { ...remote, attempts: [] }
  if (await fileSize(metadataPath)) {
    metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
    if (metadata.resolvedUrl !== remote.resolvedUrl || metadata.expectedBytes !== remote.expectedBytes
      || metadata.lastModified !== remote.lastModified) throw new Error('Saved extract differs from current download; retained without replacement')
  } else if (await fileSize(input)) {
    throw new Error('Unidentified existing PBF retained; refusing to overwrite or resume it')
  }
  const saveMetadata = () => writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
  if (await fileSize(input) > metadata.expectedBytes) throw new Error('Existing PBF exceeds expected length')
  await saveMetadata()
  while (await fileSize(input) < metadata.expectedBytes) {
    if (metadata.attempts.length >= 3) throw new Error('Download exhausted its initial attempt plus two resumptions; partial input retained')
    const attempt = { startedAt: new Date().toISOString(), resumedFrom: await fileSize(input) }
    metadata.attempts.push(attempt)
    await saveMetadata()
    try {
      execFileSync('curl', ['--proto', '=https', '--proto-redir', '=https', '--fail', '--show-error',
        '--progress-bar', '--connect-timeout', '20', '--max-time', '480', '--speed-limit', '1024', '--speed-time', '60',
        '--max-filesize', String(maxPbfBytes), '--continue-at', '-',
        '--header', `If-Unmodified-Since: ${metadata.lastModified}`,
        '--dump-header', resolve(privateDirectory, 'download.headers.txt'),
        '--output', input, metadata.resolvedUrl], { stdio: 'inherit' })
      attempt.exitCode = 0
    } catch (error) {
      attempt.exitCode = error.status ?? -1
    }
    attempt.finishedAt = new Date().toISOString()
    metadata.bytes = await fileSize(input)
    metadata.sha256 = metadata.bytes ? await fileHash(input) : null
    await saveMetadata()
    if (attempt.exitCode === 0 && metadata.bytes === metadata.expectedBytes) break
    if (![18, 28, 35, 52, 55, 56, 92].includes(attempt.exitCode) || metadata.attempts.length >= 3) {
      throw new Error(`PBF download stopped (curl ${attempt.exitCode}, ${metadata.bytes} bytes); metadata and partial file retained`)
    }
    console.error(`Network interruption; resuming the same dated extract (${metadata.bytes} bytes retained).`)
  }
  const sha256 = await fileHash(input)
  if (metadata.sha256 && metadata.sha256 !== sha256) throw new Error('Saved PBF checksum mismatch')
  metadata.bytes = await fileSize(input)
  metadata.sha256 = sha256
  metadata.fetchedAt ??= new Date().toISOString()
  const fileInfo = JSON.parse(execFileSync('osmium', ['fileinfo', '--json', input], { encoding: 'utf8' }))
  metadata.pbfHeader = fileInfo.header
  metadata.snapshot = fileInfo.header?.option?.osmosis_replication_timestamp
  if (fileInfo.header?.with_history !== false || !Number.isFinite(Date.parse(metadata.snapshot))
    || Date.parse(metadata.snapshot) > Date.now()) throw new Error('PBF lacks a valid non-history snapshot header')
  metadata.osmiumVersion = execFileSync('osmium', ['--version'], { encoding: 'utf8' }).split('\n')[0]
  await saveMetadata()
  const clipped = resolve(privateDirectory, 'kolkata.osm.pbf')
  const highways = resolve(privateDirectory, 'kolkata-highways.osm.pbf')
  const xmlPath = resolve(privateDirectory, 'kolkata-highways.osm')
  const commands = [
    ['extract', '--bbox', '88.28,22.44,88.49,22.64', '--strategy', 'complete_ways', input, '--output', clipped, '--overwrite'],
    ['tags-filter', clipped, 'w/highway', '--output', highways, '--overwrite'],
    ['cat', highways, '--output-format', 'osm', '--output', xmlPath, '--overwrite'],
  ]
  for (const args of commands) execFileSync('osmium', args, { stdio: 'inherit' })
  metadata.commands = commands.map((args) => ['osmium', ...args.map((arg) => arg.replace(`${projectRoot}/`, ''))])
  metadata.xmlSha256 = await fileHash(xmlPath)
  metadata.extractedAt = new Date().toISOString()
  await saveMetadata()
  return { xmlPath, metadata }
}

async function saveAsset(data, replace = false) {
  const asset = `${JSON.stringify(data)}\n`
  const bytes = Buffer.byteLength(asset)
  if (bytes > maxAssetBytes) throw new Error(`Street asset ${bytes} bytes exceeds 8 MiB limit; no file written`)
  await mkdir(dirname(assetPath), { recursive: true })
  await writeFile(assetPath, asset, { flag: replace ? 'w' : 'wx' })
  console.log(JSON.stringify({ output: assetPath, bytes, nodes: data.nodes.length, edges: data.edges.length,
    namedStreets: data.names.length - 1, snapshot: data.source.timestamp, filters: data.filters }, null, 2))
}

async function buildLocal(xmlPath, metadata, replace) {
  if ((await stat(xmlPath)).size > 150 * 1024 * 1024) throw new Error('Clipped XML exceeds 150 MiB')
  const xmlSha256 = await fileHash(xmlPath)
  if (metadata.xmlSha256 !== xmlSha256) throw new Error('Clipped XML checksum does not match provenance')
  await saveAsset(compactStreetGraph(convertOsmXml(await readFile(xmlPath, 'utf8'), metadata)), replace)
}

async function checkLocal() {
  const started = performance.now()
  const metadata = JSON.parse(await readFile(resolve(privateDirectory, 'metadata.json'), 'utf8'))
  const input = resolve(privateDirectory, 'eastern-zone.osm.pbf')
  const pbfBytes = await fileSize(input)
  if (metadata.url !== geofabrikUrl
    || !/^https:\/\/download\.geofabrik\.de\/asia\/india\/eastern-zone-\d{6}\.osm\.pbf$/.test(metadata.resolvedUrl)
    || pbfBytes <= 0 || pbfBytes > maxPbfBytes || pbfBytes !== metadata.bytes || pbfBytes !== metadata.expectedBytes
    || await fileHash(input) !== metadata.sha256) throw new Error('Retained PBF differs from verified source provenance')
  const header = JSON.parse(execFileSync('osmium', ['fileinfo', '--json', input], { encoding: 'utf8' })).header
  if (!isDeepStrictEqual(header, metadata.pbfHeader) || header.with_history !== false
    || header.option?.osmosis_replication_timestamp !== metadata.snapshot
    || ![metadata.snapshot, metadata.fetchedAt, metadata.lastModified].every((date) => Number.isFinite(Date.parse(date)))
    || Date.parse(metadata.snapshot) > Date.parse(metadata.fetchedAt)
    || Date.parse(metadata.lastModified) > Date.parse(metadata.fetchedAt)) throw new Error('Retained PBF snapshot header differs from provenance')
  const xmlPath = resolve(privateDirectory, 'kolkata-highways.osm')
  const xmlBytes = await fileSize(xmlPath)
  if (!xmlBytes || xmlBytes > 150 * 1024 * 1024 || await fileHash(xmlPath) !== metadata.xmlSha256) {
    throw new Error('Retained clipped XML differs from verified provenance')
  }
  const assetBytes = await fileSize(assetPath)
  if (!assetBytes || assetBytes > maxAssetBytes) throw new Error('Street asset missing or exceeds 8 MiB')
  const data = compactStreetGraph(convertOsmXml(await readFile(xmlPath, 'utf8'), metadata))
  const asset = await readFile(assetPath, 'utf8')
  if (asset !== `${JSON.stringify(data)}\n`) throw new Error('Street asset differs from deterministic local V2 conversion')
  console.log(JSON.stringify({ status: 'PASS', mode: 'offline-local-check', bytes: assetBytes,
    sha256: createHash('sha256').update(asset).digest('hex'), pbfBytes, pbfSha256: metadata.sha256,
    xmlBytes, xmlSha256: metadata.xmlSha256, snapshot: metadata.snapshot, fetchedAt: metadata.fetchedAt,
    nodes: data.nodes.length, polylines: data.edges.length, namedStreets: data.names.length - 1,
    bounds: data.bounds, compression: data.compression, filters: data.filters,
    elapsedMs: performance.now() - started }, null, 2))
}

async function download(endpoint) {
  const response = await fetch(endpoint, {
    method: 'POST', body: new URLSearchParams({ data: OVERPASS_QUERY }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    signal: AbortSignal.timeout(100_000),
  })
  if (!response.ok) {
    await response.body?.cancel()
    const error = new Error(`Overpass HTTP ${response.status} at ${endpoint}`)
    error.httpStatus = response.status
    throw error
  }
  if (Number(response.headers.get('content-length')) > maxResponseBytes) {
    await response.body?.cancel()
    throw new Error('Overpass response exceeds 30 MiB limit')
  }
  const chunks = []
  let bytes = 0
  for await (const chunk of response.body) {
    bytes += chunk.length
    if (bytes > maxResponseBytes) throw new Error('Overpass response exceeds 30 MiB limit')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function build(useMirror = false) {
  const output = fileURLToPath(new URL('../public/data/kolkata-walking.json', import.meta.url))
  try {
    await lstat(output)
    throw new Error('Street asset already exists; refusing another download or overwrite')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  let endpoint = endpoints[useMirror ? 1 : 0]
  let rawBytes
  try {
    rawBytes = await download(endpoint)
  } catch (error) {
    if (useMirror || ![500, 502, 503, 504].includes(error.httpStatus)) throw error
    console.error(`${error.message}; trying the one public mirror once.`)
    endpoint = endpoints[1]
    rawBytes = await download(endpoint)
  }
  const fetchedAt = new Date().toISOString()
  const data = convertOverpass(JSON.parse(rawBytes.toString('utf8')), {
    endpoint, fetchedAt, rawSha256: createHash('sha256').update(rawBytes).digest('hex'),
    responseBytes: rawBytes.length,
  })
  await saveAsset(data)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const run = async () => {
    const args = process.argv.slice(2)
    const replace = args.at(-1) === '--replace'
    if (replace) args.pop()
    if (!replace && args[0] === '--check' && args.length === 1) {
      await checkLocal()
    } else if (args[0] === '--geofabrik' && args.length === 1) {
      if (!replace && await fileSize(assetPath)) throw new Error('Street asset exists; use --replace only for an intended rebuild')
      const { xmlPath, metadata } = await prepareGeofabrik()
      await buildLocal(xmlPath, metadata, replace)
    } else if (args[0] === '--local-osm' && args[2] === '--metadata' && args.length === 4) {
      await buildLocal(resolve(args[1]), JSON.parse(await readFile(resolve(args[3]), 'utf8')), replace)
    } else if (!replace && args[0] === '--fetch' && (args.length === 1 || (args.length === 2 && args[1] === '--mirror'))) {
      await build(args[1] === '--mirror')
    } else {
      throw new Error('Usage: --check | --geofabrik [--replace] | --local-osm FILE --metadata FILE [--replace] | --fetch [--mirror]')
    }
  }
  await run().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}