import { createHash } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { lstat, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export const DRIVING_BOUNDS = { west: 86.80, south: 22.40, east: 88.55, north: 23.90 }
export const DRIVING_CITIES = [
  { id: 'kolkata', bounds: { south: 22.44, north: 22.65, west: 88.28, east: 88.49 } },
  { id: 'asansol', bounds: { south: 23.58, north: 23.83, west: 86.81, east: 87.11 } },
  { id: 'durgapur', bounds: { south: 23.43, north: 23.67, west: 87.20, east: 87.46 } },
]
export const CORRIDOR_HIGHWAYS = [
  'motorway', 'trunk', 'primary', 'secondary',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link',
]
const highways = [...CORRIDOR_HIGHWAYS, 'tertiary', 'tertiary_link', 'residential', 'unclassified', 'living_street', 'service']
const permittedAccess = new Set(['yes', 'permissive'])
const accessKeys = ['motorcar', 'motor_vehicle', 'vehicle', 'access']
const laneKeys = ['lanes', 'lanes:forward', 'lanes:backward', 'turn:lanes', 'turn:lanes:forward', 'turn:lanes:backward']
const supportedRestrictions = new Set([
  'no_left_turn', 'no_right_turn', 'no_straight_on', 'no_u_turn', 'no_entry', 'no_exit',
  'only_left_turn', 'only_right_turn', 'only_straight_on', 'only_u_turn',
])
const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const privateDirectory = resolve(root, '.private/driving-data')
const sourcePath = resolve(root, '.private/street-data/eastern-zone.osm.pbf')
const manifestPath = resolve(root, 'public/data/bengal-driving.manifest.json')
const maxAssetBytes = 8 * 1024 * 1024
const maxXmlBytes = 200 * 1024 * 1024
const maxPrivateBytes = 250 * 1024 * 1024
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

function conditionalCarAccess(tags) {
  return Object.keys(tags).some((key) => /^(access|vehicle|motor_vehicle|motorcar|oneway)(:.*)?:conditional$/.test(key))
}

function allowsDirection(tags, direction) {
  return accessKeys.every((key) => [tags[key], direction && tags[`${key}:${direction}`]]
    .every((value) => value === undefined || value === false || permittedAccess.has(value)))
}

export function motorcarDirections(tags = {}) {
  if (!highways.includes(tags.highway) || tags.area === 'yes' || tags.construction || tags.proposed
    || conditionalCarAccess(tags) || ['driveway', 'parking_aisle', 'drive-through', 'emergency_access'].includes(tags.service)
    || ['maxheight', 'maxwidth', 'maxweight', 'maxlength', 'maxaxleload'].some((key) => tags[key] !== undefined)) return []
  const oneWay = tags['oneway:motorcar'] ?? tags['oneway:motor_vehicle'] ?? tags['oneway:vehicle']
    ?? tags.oneway ?? (tags.junction === 'roundabout' || tags.highway === 'motorway' ? 'yes' : 'no')
  if (!['yes', '1', 'true', '-1', 'reverse', 'no', '0', 'false'].includes(oneWay)) return []
  const directions = []
  if (!['-1', 'reverse'].includes(oneWay) && allowsDirection(tags, 'forward')) directions.push(1)
  if (!['yes', '1', 'true'].includes(oneWay) && allowsDirection(tags, 'backward')) directions.push(-1)
  return directions
}

export function isMotorcarNode(tags = {}) {
  return !conditionalCarAccess(tags) && allowsDirection(tags) && tags.locked !== 'yes'
    && (!tags.barrier || ['no', 'entrance', 'toll_booth'].includes(tags.barrier))
}

export function parsePostedSpeed(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(mph|km\/h|kmh|kph)?$/i)
  if (!match) return null
  const speed = Number(match[1]) * (match[2]?.toLowerCase() === 'mph' ? 1.609344 : 1)
  return speed > 0 && speed <= 200 ? Math.round(speed * 1000) / 1000 : null
}

export function parseCarRestriction(relation) {
  const tags = relation.tags ?? {}
  if (tags.type !== 'restriction') return []
  if ((tags.except ?? '').split(/[;,\s]+/).some((mode) => ['motorcar', 'motor_vehicle', 'vehicle'].includes(mode))) return []
  const type = tags['restriction:motorcar'] ?? tags['restriction:motor_vehicle'] ?? tags['restriction:vehicle'] ?? tags.restriction
  const conditional = ['restriction:conditional', 'restriction:motorcar:conditional',
    'restriction:motor_vehicle:conditional', 'restriction:vehicle:conditional'].some((key) => tags[key] !== undefined)
  if (!type && !conditional) return []
  const members = relation.members ?? []
  const fromWays = members.filter((member) => member.role === 'from' && member.type === 'way').map((member) => member.ref)
  const toWays = members.filter((member) => member.role === 'to' && member.type === 'way').map((member) => member.ref)
  const viaNodes = members.filter((member) => member.role === 'via' && member.type === 'node').map((member) => member.ref)
  const viaWays = members.filter((member) => member.role === 'via' && member.type === 'way').map((member) => member.ref)
  if (!fromWays.length) {
    const affectedWays = members.filter((member) => member.type === 'way').map((member) => member.ref)
    const affectedNodes = members.filter((member) => member.type === 'node').map((member) => member.ref)
    if (!affectedWays.length && !affectedNodes.length) throw new Error(`Unlocatable car restriction ${relation.id}`)
    return [
      ...affectedWays.map((fromWay) => ({ id: relation.id, fromWay, viaNode: null, viaWays: [], toWays: [],
        type: type ?? 'conditional', kind: 'exclude-way', reason: 'missing-from' })),
      ...affectedNodes.map((viaNode) => ({ id: relation.id, fromWay: 0, viaNode, viaWays: [], toWays: [],
        type: type ?? 'conditional', kind: 'exclude-node', reason: 'missing-from' })),
    ]
  }
  const supported = !conditional && viaNodes.length === 1 && !viaWays.length && fromWays.length === 1
    && toWays.length === 1 && supportedRestrictions.has(type)
  return fromWays.map((fromWay) => ({
    id: relation.id, fromWay, toWays, viaWays,
    viaNode: viaNodes.length === 1 ? viaNodes[0] : null,
    type: type ?? 'conditional', kind: supported ? (type.startsWith('only_') ? 'only' : 'no') : 'block',
    reason: supported ? 'via-node' : conditional ? 'conditional' : viaWays.length ? 'via-way' : 'unsupported',
  }))
}

function inside(point, bounds) {
  return point.lat >= bounds.south && point.lat <= bounds.north && point.lng >= bounds.west && point.lng <= bounds.east
}

function distance(first, second) {
  const radians = Math.PI / 180
  const chord = Math.sin((second.lat - first.lat) * radians / 2) ** 2
    + Math.cos(first.lat * radians) * Math.cos(second.lat * radians)
    * Math.sin((second.lng - first.lng) * radians / 2) ** 2
  return 6_371_008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, chord)))
}

function safeLabel(value) {
  return typeof value === 'string' && !/[<>\u0000-\u001f\u007f]/.test(value)
    ? value.trim().replace(/\s+/g, ' ').slice(0, 160) : ''
}

export function convertDrivingXml(xml, source) {
  if (typeof xml !== 'string' || Buffer.byteLength(xml) > maxXmlBytes || /<!DOCTYPE|<!ENTITY/i.test(xml)
    || !Number.isFinite(Date.parse(source?.timestamp))) throw new Error('Invalid OSM input or source snapshot')
  if (XMLValidator.validate(xml) !== true) throw new Error('Malformed OSM XML')
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: false,
    parseTagValue: false, isArray: (name) => ['node', 'way', 'nd', 'tag', 'relation', 'member'].includes(name) })
  const osm = parser.parse(xml).osm
  if (osm?.version !== '0.6') throw new Error('Expected OSM XML 0.6')
  const tagsOf = (element) => Object.fromEntries((element.tag ?? []).map((tag) => [tag.k, tag.v]))
  const validId = (value) => Number.isSafeInteger(value) && value > 0
  const nodes = new Map()
  for (const node of osm.node ?? []) {
    const id = Number(node.id)
    const lat = Math.round(Number(node.lat) * 1e6) / 1e6
    const lng = Math.round(Number(node.lon) * 1e6) / 1e6
    if (!validId(id) || nodes.has(id) || !Number.isFinite(lat) || !Number.isFinite(lng)
      || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Invalid or duplicate OSM node')
    nodes.set(id, { lat, lng, allowed: isMotorcarNode(tagsOf(node)) })
  }
  const ways = new Map()
  for (const way of osm.way ?? []) {
    const id = Number(way.id)
    const refs = (way.nd ?? []).map((node) => Number(node.ref))
    if (!validId(id) || ways.has(id) || refs.some((ref) => !nodes.has(ref))) throw new Error('Missing way-node reference or duplicate way')
    ways.set(id, { id, refs, tags: tagsOf(way) })
  }
  let carRelations = 0
  let ignoredRelations = 0
  const restrictions = []
  const relationIds = new Set()
  for (const relation of osm.relation ?? []) {
    const id = Number(relation.id)
    if (!validId(id) || relationIds.has(id)) throw new Error('Invalid or duplicate restriction relation')
    relationIds.add(id)
    const members = (relation.member ?? []).map((member) => ({ type: member.type, ref: Number(member.ref), role: member.role }))
    if (members.some((member) => !validId(member.ref)
      || (member.type === 'way' && !ways.has(member.ref)) || (member.type === 'node' && !nodes.has(member.ref)))) {
      throw new Error(`Missing restriction member for relation ${id}`)
    }
    const rules = parseCarRestriction({ id, tags: tagsOf(relation), members })
    if (rules.length) carRelations += 1
    else ignoredRelations += 1
    restrictions.push(...rules)
  }
  const excludedNodes = [...new Set(restrictions.filter((rule) => rule.kind === 'exclude-node').map((rule) => rule.viaNode))]
  const excludedWays = new Set(restrictions.filter((rule) => rule.kind === 'exclude-way').map((rule) => rule.fromWay))
  for (const id of excludedNodes) nodes.get(id).allowed = false
  const degrees = new Map()
  const retained = new Set(restrictions.flatMap((rule) => rule.viaNode === null ? [] : [rule.viaNode]))
  const runs = []
  const acceptedWays = new Set()
  let rawSegments = 0
  let blockedSegments = 0
  let rejectedWays = 0
  for (const way of ways.values()) {
    const directions = motorcarDirections(way.tags)
    if (!directions.length || excludedWays.has(way.id)) { rejectedWays += 1; continue }
    let run = []
    let runUrban = false
    const flush = () => {
      if (run.length > 1) {
        retained.add(run[0])
        retained.add(run.at(-1))
        if (run[0] === run.at(-1)) retained.add(run[Math.floor(run.length / 2)])
        runs.push({ way, ids: run, urban: runUrban, directions })
        acceptedWays.add(way.id)
      }
      run = []
    }
    for (let index = 1; index < way.refs.length; index += 1) {
      const firstId = way.refs[index - 1]
      const secondId = way.refs[index]
      const first = nodes.get(firstId)
      const second = nodes.get(secondId)
      const urban = DRIVING_CITIES.some((city) => inside(first, city.bounds) && inside(second, city.bounds))
      const length = distance(first, second)
      const included = first.allowed && second.allowed && inside(first, DRIVING_BOUNDS) && inside(second, DRIVING_BOUNDS)
        && (urban || CORRIDOR_HIGHWAYS.includes(way.tags.highway)) && firstId !== secondId && length >= 0.01 && length <= 10_000
      if (!included) { flush(); blockedSegments += 1; continue }
      if (run.length && urban !== runUrban) flush()
      if (!run.length) { run = [firstId]; runUrban = urban }
      run.push(secondId)
      degrees.set(firstId, (degrees.get(firstId) ?? 0) + 1)
      degrees.set(secondId, (degrees.get(secondId) ?? 0) + 1)
      rawSegments += 1
    }
    flush()
  }
  for (const [id, degree] of degrees) if (degree !== 2) retained.add(id)
  const names = ['']
  const nameIndices = new Map([['', 0]])
  const labelIndex = (value) => {
    const label = safeLabel(value)
    if (!nameIndices.has(label)) { nameIndices.set(label, names.length); names.push(label) }
    return nameIndices.get(label)
  }
  const laneTags = [null]
  const laneIndices = new Map([['null', 0]])
  const roads = []
  const roadIndices = new Map()
  const polylines = []
  for (const run of runs) {
    const tags = run.way.tags
    if (!roadIndices.has(run.way.id)) {
      const bridge = !!tags.bridge && tags.bridge !== 'no'
      const flags = (bridge ? 1 : 0) | (tags.tunnel && tags.tunnel !== 'no' ? 2 : 0)
        | (bridge && (tags.bridge === 'viaduct' || Number(tags.layer) > 0) ? 4 : 0)
        | (tags.junction === 'roundabout' ? 8 : 0) | (tags.toll === 'yes' ? 16 : 0)
      const lanes = Object.fromEntries(laneKeys.filter((key) => safeLabel(tags[key])).map((key) => [key, safeLabel(tags[key])]))
      const laneValue = Object.keys(lanes).length ? lanes : null
      const laneKey = JSON.stringify(laneValue)
      if (!laneIndices.has(laneKey)) { laneIndices.set(laneKey, laneTags.length); laneTags.push(laneValue) }
      roadIndices.set(run.way.id, roads.length)
      roads.push([run.way.id, labelIndex(tags['name:en'] || tags.name), labelIndex(tags.ref), highways.indexOf(tags.highway),
        run.directions.length === 2 ? 0 : run.directions[0], flags,
        parsePostedSpeed(tags['maxspeed:forward'] ?? tags.maxspeed), parsePostedSpeed(tags['maxspeed:backward'] ?? tags.maxspeed),
        laneIndices.get(laneKey)])
    }
    let start = 0
    for (let index = 1; index < run.ids.length; index += 1) {
      if (!retained.has(run.ids[index])) continue
      const ids = run.ids.slice(start, index + 1)
      if (ids[0] === ids.at(-1)) {
        const middle = Math.floor((ids.length - 1) / 2)
        polylines.push({ ids: ids.slice(0, middle + 1), road: roadIndices.get(run.way.id), urban: run.urban },
          { ids: ids.slice(middle), road: roadIndices.get(run.way.id), urban: run.urban })
      } else {
        polylines.push({ ids, road: roadIndices.get(run.way.id), urban: run.urban })
      }
      start = index
    }
  }
  const usedIds = [...new Set(polylines.flatMap((line) => [line.ids[0], line.ids.at(-1)]))].sort((first, second) => first - second)
  const nodeIndices = new Map(usedIds.map((id, index) => [id, index]))
  const edges = polylines.map((line) => {
    let length = 0
    const shape = []
    for (let index = 1; index < line.ids.length; index += 1) {
      const first = nodes.get(line.ids[index - 1])
      const second = nodes.get(line.ids[index])
      length += distance(first, second)
      if (index < line.ids.length - 1) shape.push(Math.round(second.lat * 1e6) - Math.round(first.lat * 1e6),
        Math.round(second.lng * 1e6) - Math.round(first.lng * 1e6))
    }
    return [nodeIndices.get(line.ids[0]), nodeIndices.get(line.ids.at(-1)), Math.round(length * 1000) / 1000,
      line.road, line.urban ? 1 : 0, shape]
  })
  const arcs = edges.reduce((total, edge) => total + (roads[edge[3]][4] === 0 ? 2 : 1), 0)
  if (!edges.length || usedIds.length > 200_000 || arcs > 400_000) throw new Error(`Car graph outside budget: ${usedIds.length} nodes / ${arcs} arcs`)
  return {
    version: 1, mode: 'motorcar', geometryEncoding: 'intermediate-delta-lat-lng-e6', bounds: DRIVING_BOUNDS,
    coverage: { cities: DRIVING_CITIES, corridorHighways: CORRIDOR_HIGHWAYS, maxSnapMetres: 120,
      localRoadsOutsideCities: false, boundaryConnectors: false },
    source: { ...source, provider: 'OpenStreetMap', distributor: 'Geofabrik', license: 'ODbL-1.0',
      attribution: 'OpenStreetMap contributors', attributionUrl: 'https://www.openstreetmap.org/copyright',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/', generator: 'scripts/build-driving.mjs', filterVersion: 1 },
    nodes: usedIds.map((id) => [id, nodes.get(id).lat, nodes.get(id).lng]), names, highways, roads, edges, laneTags,
    restrictions: restrictions.filter((rule) => ['no', 'only', 'block'].includes(rule.kind) && acceptedWays.has(rule.fromWay)),
    exclusions: { nodeIds: excludedNodes, wayIds: [...excludedWays],
      relationIds: [...new Set(restrictions.filter((rule) => rule.kind.startsWith('exclude-')).map((rule) => rule.id))] },
    stats: { sourceNodes: nodes.size, sourceWays: ways.size, sourceRelations: relationIds.size,
      carRelations, ignoredRelations, acceptedWays: acceptedWays.size, rejectedWays, blockedSegments, rawSegments,
      directedArcs: arcs, geometryPoints: edges.reduce((total, edge) => total + edge[5].length / 2 + 2, 0),
      restrictionMembersComplete: true, intermediateCoordinatesPreserved: true },
  }
}

async function hashFile(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function ordinaryFile(path) {
  const info = await lstat(path)
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Expected an ordinary build input')
  return info
}

async function checkPrivateBudget() {
  let total = 0
  for (const name of await readdir(privateDirectory)) total += (await ordinaryFile(resolve(privateDirectory, name))).size
  if (total > maxPrivateBytes) throw new Error('Driving intermediates exceed 250 MiB')
  return total
}

async function exportBoundedXml(input, output, availableBytes) {
  const child = spawn('osmium', ['cat', input, '--output-format', 'osm,add_metadata=false'], { stdio: ['ignore', 'pipe', 'inherit'] })
  const completed = new Promise((resolveExit, reject) => {
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolveExit() : reject(new Error(`osmium cat exit ${code}`)))
  })
  let bytes = 0
  const bound = new Transform({ transform(chunk, _encoding, callback) {
    bytes += chunk.length
    callback(bytes > Math.min(maxXmlBytes, availableBytes) ? new Error('OSM XML exceeds bounded build budget') : null, chunk)
  } })
  try {
    await Promise.all([pipeline(child.stdout, bound, createWriteStream(output, { flags: 'wx' })), completed])
  } catch (error) {
    child.kill('SIGTERM')
    throw error
  }
}

function serializeAssets(data) {
  const tables = ['nodes', 'names', 'highways', 'roads', 'edges', 'laneTags', 'restrictions']
  const header = Object.fromEntries(Object.entries(data).filter(([key]) => !tables.includes(key)))
  const canonical = { ...header, ...Object.fromEntries(tables.map((table) => [table, data[table]])) }
  const content = `${JSON.stringify(canonical)}\n`
  const bytes = Buffer.byteLength(content)
  if (bytes > 48 * 1024 * 1024) throw new Error('Car dataset exceeds total static load budget')
  const assets = []
  const add = (file, value, details = {}) => {
    const size = Buffer.byteLength(value)
    if (size > maxAssetBytes) throw new Error('Car chunk exceeds 8 MiB')
    assets.push({ file, content: value, bytes: size, sha256: sha256(value), ...details })
  }
  if (bytes <= maxAssetBytes) {
    add('bengal-driving.json', content)
  } else {
    for (const table of tables) {
      let offset = 0
      let values = []
      let size = 256
      const flush = () => {
        if (!values.length) return
        add(`bengal-driving-${assets.length}.json`, `${JSON.stringify({ table, offset, values })}\n`,
          { table, offset, count: values.length })
        offset += values.length
        values = []
        size = 256
      }
      for (const value of data[table]) {
        const itemBytes = Buffer.byteLength(JSON.stringify(value)) + 1
        if (size + itemBytes > maxAssetBytes) flush()
        values.push(value)
        size += itemBytes
      }
      flush()
    }
  }
  if (assets.length > 32) throw new Error('Too many car-data chunks')
  const manifest = { version: 1, mode: 'motorcar', layout: bytes <= maxAssetBytes ? 'single' : 'tables',
    sourceTimestamp: data.source.timestamp, datasetSha256: sha256(content), datasetBytes: bytes,
    ...(bytes <= maxAssetBytes ? {} : { header }),
    files: assets.map(({ content: _content, ...entry }) => entry),
  }
  if (Buffer.byteLength(JSON.stringify(manifest)) > 64 * 1024) throw new Error('Car manifest exceeds 64 KiB')
  return { assets, manifest, bytes }
}

async function build(mode) {
  const checkOnly = mode === '--check'
  const sourceMetadata = JSON.parse(await readFile(resolve(root, '.private/street-data/metadata.json'), 'utf8'))
  const sourceInfo = await ordinaryFile(sourcePath)
  const header = JSON.parse(execFileSync('osmium', ['fileinfo', '--json', sourcePath], { encoding: 'utf8' })).header
  const pbfHash = await hashFile(sourcePath)
  if (sourceInfo.size !== 247289715 || pbfHash !== 'b2443fab468183501a9072f4ffa46d6b9c5a4ceea2e54479a51d8aec43a755b1'
    || sourceMetadata.sha256 !== pbfHash || header.option.osmosis_replication_timestamp !== '2026-10-14T20:21:12Z') {
    throw new Error('Retained authorized PBF does not match verified source; no download attempted')
  }
  const xmlPath = resolve(privateDirectory, 'bengal-car-roads.osm')
  const metadataPath = resolve(privateDirectory, 'metadata.json')
  let metadata
  if (checkOnly || mode === '--convert') {
    metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  } else {
    await mkdir(privateDirectory, { recursive: true })
    const existing = await readdir(privateDirectory)
    if (mode === '--resume') {
      if (existing.length !== 2 || !existing.includes('bengal-car-roads.osm.pbf') || !existing.includes('bengal-car-roads.osm')) {
        throw new Error('Resume only supports the bounded, unpublished full-highway XML stage')
      }
      await ordinaryFile(xmlPath)
      await unlink(xmlPath)
    } else if (existing.length) throw new Error('Driving build inputs already exist; use --check, do not overwrite them')
    const clip = '.private/driving-data/bengal-complete.osm.pbf'
    const filtered = '.private/driving-data/bengal-car-roads.osm.pbf'
    const commands = [
      ['osmium', 'extract', '--bbox', '86.80,22.40,88.55,23.90', '--strategy', 'smart', '-S', 'types=restriction',
        '.private/street-data/eastern-zone.osm.pbf', '--output', clip],
      ['osmium', 'tags-filter', clip, 'w/highway', 'r/type=restriction', '--output', filtered],
      ['osmium', 'check-refs', '--check-relations', filtered],
    ]
    if (mode !== '--resume') {
      for (const command of commands) {
        execFileSync(command[0], [...command.slice(1), '--no-progress'], { cwd: root, stdio: 'inherit' })
        await checkPrivateBudget()
      }
      await unlink(resolve(root, clip))
    } else {
      execFileSync('osmium', ['check-refs', '--check-relations', filtered, '--no-progress'], { cwd: root, stdio: 'inherit' })
    }
    const selected = '.private/driving-data/bengal-selected.osm.pbf'
    const backbone = '.private/driving-data/bengal-backbone.osm.pbf'
    const cityFiles = DRIVING_CITIES.map((city) => `.private/driving-data/bengal-${city.id}.osm.pbf`)
    const selectionCommands = [
      ['osmium', 'tags-filter', filtered, `w/highway=${CORRIDOR_HIGHWAYS.join(',')}`, 'r/type=restriction', '--output', backbone],
      ...DRIVING_CITIES.map((city, index) => ['osmium', 'extract', '--bbox',
        [city.bounds.west, city.bounds.south, city.bounds.east, city.bounds.north].join(','),
        '--strategy', 'smart', '-S', 'types=restriction', filtered, '--output', cityFiles[index]]),
      ['osmium', 'merge', backbone, ...cityFiles, '--output', selected],
      ['osmium', 'check-refs', '--check-relations', selected],
    ].map((command) => [...command, '--no-progress'])
    for (const command of selectionCommands) {
      execFileSync(command[0], command.slice(1), { cwd: root, stdio: 'inherit' })
      await checkPrivateBudget()
    }
    for (const intermediate of [backbone, ...cityFiles, filtered]) await unlink(resolve(root, intermediate))
    await exportBoundedXml(resolve(root, selected), xmlPath, maxPrivateBytes - await checkPrivateBudget())
    metadata = { timestamp: header.option.osmosis_replication_timestamp, pbfSha256: pbfHash, pbfBytes: sourceInfo.size,
      pbfReplicationSequence: header.option.osmosis_replication_sequence_number,
      url: sourceMetadata.resolvedUrl, fetchedAt: sourceMetadata.fetchedAt,
      builtAt: new Date().toISOString(), osmiumVersion: execFileSync('osmium', ['--version'], { encoding: 'utf8' }).split('\n')[0],
      xmlSha256: await hashFile(xmlPath), xmlBytes: (await ordinaryFile(xmlPath)).size,
      selectedPbfSha256: await hashFile(resolve(root, selected)), selectedPbfBytes: (await ordinaryFile(resolve(root, selected))).size,
      commands: [...commands, ...selectionCommands, ['osmium', 'cat', selected, '--output-format', 'osm,add_metadata=false']],
      referenceCheck: 'osmium check-refs --check-relations: passed',
    }
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' })
  }
  if ((await ordinaryFile(xmlPath)).size > maxXmlBytes || await hashFile(xmlPath) !== metadata.xmlSha256) throw new Error('XML size/hash mismatch')
  const started = performance.now()
  const data = convertDrivingXml(await readFile(xmlPath, 'utf8'), metadata)
  const { assets, manifest, bytes } = serializeAssets(data)
  if (checkOnly) {
    for (const asset of assets) {
      if (await readFile(resolve(root, 'public/data', asset.file), 'utf8') !== asset.content) throw new Error('Car chunk differs from retained input')
    }
    if (JSON.stringify(JSON.parse(await readFile(manifestPath, 'utf8'))) !== JSON.stringify(manifest)) throw new Error('Car manifest differs from retained input')
  } else {
    for (const asset of assets) await writeFile(resolve(root, 'public/data', asset.file), asset.content, { flag: 'wx' })
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  }
  console.log(JSON.stringify({ status: 'ok', checkOnly, measuredAt: new Date().toISOString(), bytes,
    sha256: manifest.datasetSha256, assets: manifest.files, conversionMs: performance.now() - started, privateBytes: await checkPrivateBudget(),
    nodes: data.nodes.length, roads: data.roads.length, edges: data.edges.length, restrictions: data.restrictions.length, ...data.stats }, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!['--build', '--check', '--resume', '--convert'].includes(process.argv[2]) || process.argv.length !== 3) throw new Error('Use --build or read-only --check')
  await build(process.argv[2])
}