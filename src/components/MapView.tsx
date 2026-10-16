import { Fragment, useEffect, useRef, useState } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import type { DivIcon, Map as LeafletMap, TileLayer as LeafletTileLayer } from 'leaflet'
import {
  Circle, CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents,
} from 'react-leaflet'
import { Layers, LocateFixed, MapPinned, Navigation, RotateCcw } from 'lucide-react'
import type { Coordinate, Language, MetroStation, NamedCoordinate, Pandal } from '../types'
import type { TravelMode } from '../domain/travel'
import type { StreetHotspot, StreetRoute } from '../domain/streets'
import type { DevicePosition } from '../hooks/useGeolocation'
import { formatNumber, otherName, pickName, t, zoneLabel } from '../i18n'
import { HOOGHLY_LABEL, HOOGHLY_POLYGON, PLANNING_RECTANGLE } from './schematic'
import { isStreetPoint } from './streetNavigation'

export type MapFocusRequest =
  | { nonce: number, kind: 'point', point: Coordinate, zoom?: number }
  | { nonce: number, kind: 'bounds', points: Coordinate[], maxZoom?: number }

export interface RouteSegment {
  mode: TravelMode | 'direct'
  points: Coordinate[]
}

interface MapViewProps {
  language: Language
  pandals: readonly Pandal[]
  stopIds: readonly string[]
  visitedIds: ReadonlySet<string>
  selectedId: string | null
  nextStopId: string | null
  origin: NamedCoordinate | null
  devicePosition: DevicePosition | null
  segments: readonly RouteSegment[]
  directions: {
    route: StreetRoute
    alternative: StreetRoute | null
    origin: Coordinate
    destination: Coordinate
    originSnap: Coordinate
    destinationSnap: Coordinate
    selectedStep: number | null
    hotspots: readonly StreetHotspot[]
  } | null
  picking: 'origin' | 'destination' | null
  pickedPoint: Coordinate | null
  onPickPoint: (point: Coordinate) => void
  onCancelPick: () => void
  onConfirmPick: () => void
  metroStations: readonly MetroStation[]
  focus: MapFocusRequest | null
  online: boolean
  locating: boolean
  onSelect: (id: string) => void
  onOpenDetails: (id: string) => void
  onNavigate: (id: string) => void
  onToggleStop: (id: string) => void
  onLocate: () => void
  onFitRoute: () => void
}

type StreetsState = 'loading' | 'ready' | 'slow' | 'failed'
type PinState = 'stop' | 'visited' | 'next' | 'selected'

const KOLKATA_CENTER: [number, number] = [22.552, 88.365]
const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const TILE_LOAD_TIMEOUT_MS = 12_000
const FLAG_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1"/></svg>'
const CHECK_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

const iconCache = new Map<string, DivIcon>()

function pinIcon(label: string, state: PinState): DivIcon {
  const key = `${state}:${label}`
  const cached = iconCache.get(key)
  if (cached) return cached
  const safeLabel = label.replace(/[^\p{N}]/gu, '')
  const icon = divIcon({
    className: 'pp-pin-anchor',
    html: `<span class="pp-pin pp-pin--${state}">${state === 'visited' ? CHECK_SVG : safeLabel}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  })
  iconCache.set(key, icon)
  return icon
}

const startIcon = divIcon({
  className: 'pp-pin-anchor',
  html: `<span class="pp-pin pp-pin--start">${FLAG_SVG}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -14],
})

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }))
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])
  return null
}

function MapPointPicker({ active, onPick }: { active: boolean; onPick: (point: Coordinate) => void }) {
  const map = useMapEvents({ click: (event) => { if (active) onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) } })
  useEffect(() => {
    if (!active) return
    map.closePopup()
    const container = map.getContainer()
    // The dialog that started picking has just closed, so Enter/arrow keys should reach the map.
    if (!document.activeElement || document.activeElement === document.body) container.focus({ preventScroll: true })
    const chooseCenter = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && event.target === container) {
        const center = map.getCenter()
        onPick({ lat: center.lat, lng: center.lng })
      }
    }
    container.addEventListener('keydown', chooseCenter)
    return () => container.removeEventListener('keydown', chooseCenter)
  }, [active, map, onPick])
  return null
}

const FIT_GAP = 12
const PIN_RADIUS = 16
const FIT_MIN_SPAN = 120

function splitPadding(total: number, start: number, end: number): [number, number] {
  if (total - start - end >= FIT_MIN_SPAN) return [start, end]
  // Tiny map: scale both sides down so fitBounds never sees a negative viewport.
  const scale = Math.max(0, total - FIT_MIN_SPAN) / Math.max(1, start + end)
  return [start * scale, end * scale]
}

// Keeps fitted pins clear of the zoom control, tools column, notice band, permanent legend and attribution.
function overlayPadding(map: LeafletMap) {
  const container = map.getContainer()
  const root = container.parentElement ?? container
  const frame = container.getBoundingClientRect()
  const rectOf = (selector: string) => {
    const element = root.querySelector<HTMLElement>(selector)
    return element && element.getClientRects().length > 0 ? element.getBoundingClientRect() : null
  }
  const zoom = rectOf('.leaflet-control-zoom')
  const tools = rectOf('.pp-map__tools')
  // A legend behind the Layers tool is a transient popup; only the always-visible legend reserves space.
  const legend = rectOf('.pp-map__legend-toggle') ? null : rectOf('.pp-legend')
  const banners = [...root.querySelectorAll<HTMLElement>('.pp-map__banner')]
    .filter((element) => element.getClientRects().length > 0)
    .map((element) => element.getBoundingClientRect())
  const attribution = rectOf('.leaflet-control-attribution')
  const reserve = Number.parseFloat(getComputedStyle(root).getPropertyValue('--map-notice-reserve')) || 0
  const left = (zoom ? zoom.right - frame.left : 0) + FIT_GAP + PIN_RADIUS
  const right = (tools ? frame.right - tools.left : 0) + FIT_GAP + PIN_RADIUS
  const bottomBand = Math.max(
    legend ? frame.bottom - legend.top : 0,
    ...banners.map((banner) => frame.bottom - banner.top),
    attribution ? frame.bottom - attribution.top : 0,
    reserve,
  )
  const size = map.getSize()
  const [padLeft, padRight] = splitPadding(size.x, left, right)
  const [padTop, padBottom] = splitPadding(size.y, FIT_GAP + PIN_RADIUS, bottomBand + FIT_GAP + PIN_RADIUS)
  return { paddingTopLeft: [padLeft, padTop] as [number, number], paddingBottomRight: [padRight, padBottom] as [number, number] }
}

function MapFocus({ request }: { request: MapFocusRequest | null }) {
  const map = useMap()
  useEffect(() => {
    if (!request) return
    if (request.kind === 'point') {
      map.setView([request.point.lat, request.point.lng], Math.max(map.getZoom(), request.zoom ?? 15), { animate: true })
      return
    }
    if (request.points.length === 0) return
    const bounds = latLngBounds(request.points.map((point) => [point.lat, point.lng] as [number, number]))
    map.fitBounds(bounds, { ...overlayPadding(map), maxZoom: request.maxZoom ?? 15 })
  }, [map, request])
  return null
}

function StreetTiles({ onStateChange }: { onStateChange: (state: StreetsState) => void }) {
  const layerRef = useRef<LeafletTileLayer | null>(null)
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let failed = false
    let anyLoaded = false
    const clearTimer = () => {
      clearTimeout(timer)
      timer = undefined
    }
    const fail = () => {
      failed = true
      clearTimer()
      onStateChange('failed')
    }
    // A slow first load is not an outage: keep the requests alive and show the overview meanwhile.
    // A map that already drew tiles keeps its existing contract: a stalled later cycle falls back with Retry.
    const slow = () => {
      timer = undefined
      if (failed) return
      if (anyLoaded) fail()
      else onStateChange('slow')
    }
    const loading = () => {
      if (failed) return
      clearTimer()
      onStateChange('loading')
      timer = setTimeout(slow, TILE_LOAD_TIMEOUT_MS)
    }
    const load = () => {
      if (failed) return
      clearTimer()
      onStateChange('ready')
    }
    const tileload = () => {
      anyLoaded = true
    }
    const handlers = { loading, load, tileload, tileerror: fail }
    layer.on(handlers)
    if (layer.isLoading()) loading()
    else load()
    return () => {
      clearTimer()
      layer.off(handlers)
    }
  }, [onStateChange])
  return <TileLayer ref={layerRef} url={OSM_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
}

function SchematicLayer({ language, metroStations }: { language: Language, metroStations: readonly MetroStation[] }) {
  const lines = (['blue', 'green'] as const).map((line) => ({
    line,
    points: metroStations.filter((station) => station.line === line)
      .sort((a, b) => a.order - b.order)
      .map((station) => [station.lat, station.lng] as [number, number]),
  }))
  return (
    <>
      <Polygon positions={PLANNING_RECTANGLE} pathOptions={{ color: '#c9d4de', weight: 1, dashArray: '4 6', fill: false }} interactive={false} />
      <Polygon positions={HOOGHLY_POLYGON} pathOptions={{ color: '#9cc5e0', weight: 1, fillColor: '#cfe6f5', fillOpacity: 1 }} interactive={false}>
        <Tooltip permanent direction="left" offset={[-6, 0]} className="pp-label pp-label--water" position={HOOGHLY_LABEL}>
          {t(language, 'hooghly')}
        </Tooltip>
      </Polygon>
      {lines.map(({ line, points }) => (
        <Polyline
          key={line}
          positions={points}
          pathOptions={{ color: line === 'blue' ? '#2a62c9' : '#1f8a5b', weight: 3, dashArray: '7 7', opacity: 0.85 }}
          interactive={false}
        />
      ))}
      {metroStations.map((station) => (
        <CircleMarker
          key={station.id}
          center={[station.lat, station.lng]}
          radius={3.5}
          pathOptions={{ color: station.line === 'blue' ? '#2a62c9' : '#1f8a5b', weight: 1.5, fillColor: '#ffffff', fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -4]} className="pp-label">{pickName(language, station)}</Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}

export function MapView(props: MapViewProps) {
  const {
    language, pandals, stopIds, visitedIds, selectedId, nextStopId, origin, devicePosition, segments,
    metroStations, focus, online, locating, onSelect, onOpenDetails, onToggleStop, onLocate, onFitRoute, onNavigate,
    directions, picking, pickedPoint, onPickPoint, onCancelPick, onConfirmPick,
  } = props
  const [streets, setStreets] = useState<StreetsState>(() => (online ? 'loading' : 'failed'))
  const [epoch, setEpoch] = useState(0)
  const [legendOpen, setLegendOpen] = useState(false)
  const streetsRef = useRef<StreetsState>(streets)

  useEffect(() => {
    streetsRef.current = streets
  }, [streets])

  useEffect(() => {
    if (!online) {
      setStreets('failed')
      return
    }
    if (streetsRef.current === 'failed') {
      setEpoch((value) => value + 1)
      setStreets('loading')
    }
  }, [online])

  const retryStreets = () => {
    setEpoch((value) => value + 1)
    setStreets('loading')
  }

  const stopIndex = new Map(stopIds.map((id, index) => [id, index]))
  const metroSegments = segments.filter((segment) => segment.mode === 'metro')
  const otherSegments = segments.filter((segment) => segment.mode !== 'metro')
  const schematic = streets === 'failed' || streets === 'slow'

  return (
    <div className={`pp-map${schematic ? ' is-schematic' : ''}${streets === 'slow' ? ' is-slow' : ''}${picking ? ' is-picking' : ''}`} data-streets={streets} data-route-points={directions?.route.geometry.length ?? 0} role="region" aria-label={t(language, 'mapRegion')}>
      <p className="sr-only">{t(language, 'mapListHint')}</p>
      <MapContainer
        center={KOLKATA_CENTER}
        zoom={12}
        minZoom={11}
        maxZoom={18}
        maxBounds={[[22.36, 88.14], [22.74, 88.62]]}
        maxBoundsViscosity={0.9}
        className="pp-map__canvas"
      >
        <MapResizer />
        <MapFocus request={focus} />
        <MapPointPicker active={picking !== null} onPick={onPickPoint} />
        {streets !== 'failed' && <StreetTiles key={epoch} onStateChange={setStreets} />}
        {schematic && <SchematicLayer language={language} metroStations={metroStations} />}
        {otherSegments.map((segment, index) => (
          <Polyline
            key={`seg-${index}`}
            positions={segment.points.map((point) => [point.lat, point.lng] as [number, number])}
            pathOptions={{ color: '#bc2f32', weight: 4, opacity: 0.9, dashArray: '8 8', lineCap: 'round' }}
            interactive={false}
          />
        ))}
        {metroSegments.map((segment, index) => (
          <Polyline
            key={`metro-${index}`}
            positions={segment.points.map((point) => [point.lat, point.lng] as [number, number])}
            pathOptions={{ color: '#2a62c9', weight: 4, opacity: 0.9, dashArray: '2 9', lineCap: 'round' }}
            interactive={false}
          />
        ))}
        {directions && <>
          {directions.hotspots.map((hotspot) => <Circle key={hotspot.id} center={[hotspot.lat, hotspot.lng]} radius={hotspot.radiusMetres ?? 180} pathOptions={{ className: 'street-hotspot', color: '#772d63', weight: 1, fillColor: '#772d63', fillOpacity: 0.09 }} interactive={false} />)}
          {directions.alternative && <Polyline positions={directions.alternative.geometry.map((point) => [point.lat, point.lng])} pathOptions={{ className: 'street-alternative', color: '#772d63', weight: 5, opacity: 0.3 }} interactive={false} />}
          <Polyline positions={directions.route.geometry.map((point) => [point.lat, point.lng])} pathOptions={{ className: 'street-route-casing', color: '#ffffff', weight: 9, opacity: 0.9, lineCap: 'round' }} interactive={false} />
          <Polyline positions={directions.route.geometry.map((point) => [point.lat, point.lng])} pathOptions={{ className: 'street-route', color: '#14664d', weight: 6, opacity: 1, lineCap: 'round' }} interactive={false} />
          {directions.selectedStep !== null && <Polyline positions={directions.route.geometry.slice(directions.route.steps[directions.selectedStep].startGeometryIndex, directions.route.steps[directions.selectedStep].endGeometryIndex + 1).map((point) => [point.lat, point.lng])} pathOptions={{ className: 'street-step-highlight', color: '#bc2f32', weight: 8, opacity: 1 }} interactive={false} />}
          {directions.selectedStep !== null && <CircleMarker center={[directions.route.steps[directions.selectedStep].at.lat, directions.route.steps[directions.selectedStep].at.lng]} radius={9} pathOptions={{ className: 'street-step-point', color: '#bc2f32', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }} interactive={false} />}
          {([
            { kind: 'origin', pin: directions.origin, snap: directions.originSnap, pinLabel: 'streetPinStart', snapLabel: 'streetSnapStart' },
            { kind: 'destination', pin: directions.destination, snap: directions.destinationSnap, pinLabel: 'streetPinDestination', snapLabel: 'streetSnapDestination' },
          ] as const).map(({ kind, pin, snap, pinLabel, snapLabel }) => <Fragment key={kind}>
            <CircleMarker center={[pin.lat, pin.lng]} radius={9} pathOptions={{ className: `street-pin-${kind}`, color: '#595b60', weight: 2, dashArray: '3 3', fillColor: '#ffffff', fillOpacity: 0.8 }}>
              <Tooltip direction="top" className="pp-label">{t(language, pinLabel)}</Tooltip>
            </CircleMarker>
            <CircleMarker center={[snap.lat, snap.lng]} radius={5} pathOptions={{ className: `street-snap-${kind}`, color: '#ffffff', weight: 2, fillColor: '#14664d', fillOpacity: 1 }}>
              <Tooltip direction="bottom" className="pp-label">{t(language, snapLabel)}</Tooltip>
            </CircleMarker>
          </Fragment>)}
        </>}
        {picking && <Polygon positions={[[22.44, 88.28], [22.64, 88.28], [22.64, 88.49], [22.44, 88.49]]} pathOptions={{ color: '#14664d', weight: 2, dashArray: '6 6', fillOpacity: 0.04 }} interactive={false} />}
        {picking && pickedPoint && <CircleMarker center={[pickedPoint.lat, pickedPoint.lng]} radius={10} pathOptions={{ className: 'street-picked-point', color: isStreetPoint(pickedPoint) ? '#14664d' : '#bc2f32', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }} interactive={false} />}
        {pandals.map((pandal) => {
          const index = stopIndex.get(pandal.id)
          const name = pickName(language, pandal)
          const alternate = otherName(language, pandal)
          const inRoute = index !== undefined
          const popup = (
            <Popup className="pp-popup" closeButton>
              <div className="pp-popup__body">
                <strong>{name}</strong>
                {alternate && <span className="pp-popup__alt">{alternate}</span>}
                <span className="pp-popup__zone">{zoneLabel(language, pandal.zone)}</span>
                <div className="pp-popup__actions">
                  <button type="button" className="icon-btn" onClick={() => onNavigate(pandal.id)} title={t(language, 'navigateTo', { name })} aria-label={t(language, 'navigateTo', { name })}>
                    <Navigation size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn--small" onClick={() => onOpenDetails(pandal.id)}>
                    {t(language, 'details')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn--small ${inRoute ? '' : 'btn--primary'}`}
                    onClick={() => onToggleStop(pandal.id)}
                    disabled={!inRoute && stopIds.length >= 12}
                  >
                    {inRoute ? t(language, 'remove') : t(language, 'add')}
                  </button>
                </div>
              </div>
            </Popup>
          )
          if (inRoute) {
            const state: PinState = visitedIds.has(pandal.id) ? 'visited'
              : selectedId === pandal.id ? 'selected'
                : nextStopId === pandal.id ? 'next' : 'stop'
            const label = formatNumber(language, index + 1)
            return (
              <Marker
                key={pandal.id}
                position={[pandal.lat, pandal.lng]}
                icon={pinIcon(label, state)}
                interactive={!picking}
                keyboard={!picking}
                title={t(language, 'stopMarker', { n: label, name })}
                zIndexOffset={state === 'selected' || state === 'next' ? 400 : 200}
                eventHandlers={{ click: () => onSelect(pandal.id) }}
              >
                {schematic && (
                  <Tooltip permanent direction="auto" offset={[12, 0]} className="pp-label pp-label--stop">{name}</Tooltip>
                )}
                {popup}
              </Marker>
            )
          }
          const selected = selectedId === pandal.id
          return (
            <CircleMarker
              key={pandal.id}
              center={[pandal.lat, pandal.lng]}
              interactive={!picking}
              radius={selected ? 9 : 6}
              pathOptions={{
                color: selected ? '#a82329' : '#ffffff',
                weight: selected ? 3 : 1.5,
                fillColor: selected ? '#ffffff' : '#c98a1b',
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(pandal.id) }}
            >
              {!schematic && <Tooltip direction="top" offset={[0, -6]} className="pp-label">{name}</Tooltip>}
              {schematic && <Tooltip permanent direction="auto" offset={[8, 0]} className="pp-label pp-label--faint">{name}</Tooltip>}
              {popup}
            </CircleMarker>
          )
        })}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={startIcon} title={t(language, 'startMarker', { name: origin.name })} zIndexOffset={300}>
            <Tooltip direction="top" offset={[0, -14]} className="pp-label">{t(language, 'startMarker', { name: origin.name })}</Tooltip>
          </Marker>
        )}
        {devicePosition && (
          <>
            <Circle
              center={[devicePosition.lat, devicePosition.lng]}
              radius={Math.min(400, Math.max(10, devicePosition.accuracyMetres))}
              pathOptions={{ color: '#2a62c9', weight: 1, fillColor: '#2a62c9', fillOpacity: 0.12 }}
              interactive={false}
            />
            <CircleMarker
              center={[devicePosition.lat, devicePosition.lng]}
              radius={7}
              pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: '#2a62c9', fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -6]} className="pp-label">{t(language, 'yourLocation')}</Tooltip>
            </CircleMarker>
          </>
        )}
      </MapContainer>

      <div className="pp-map__tools" role="group" aria-label={t(language, 'mapTools')}>
        <button
          type="button"
          className="icon-btn icon-btn--map"
          onClick={onFitRoute}
          title={t(language, 'fitRoute')}
          aria-label={t(language, 'fitRoute')}
          disabled={stopIds.length === 0 && !directions}
        >
          <MapPinned size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn icon-btn--map${locating ? ' is-busy' : ''}`}
          onClick={onLocate}
          title={t(language, 'locateMe')}
          aria-label={t(language, 'locateMe')}
          aria-busy={locating}
        >
          <LocateFixed size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`icon-btn icon-btn--map pp-map__legend-toggle${legendOpen ? ' is-on' : ''}`}
          onClick={() => setLegendOpen((value) => !value)}
          title={t(language, 'legend')}
          aria-label={t(language, 'legend')}
          aria-expanded={legendOpen}
          aria-controls="map-legend"
        >
          <Layers size={20} aria-hidden="true" />
        </button>
      </div>

      {picking && <div className="pp-map__picker" role="region" aria-label={t(language, picking === 'origin' ? 'streetPickStart' : 'streetPickDestination')}>
        <strong>{t(language, picking === 'origin' ? 'streetPickStart' : 'streetPickDestination')}</strong>
        <span role="status">{pickedPoint ? isStreetPoint(pickedPoint) ? `${pickedPoint.lat.toFixed(5)}, ${pickedPoint.lng.toFixed(5)}` : t(language, 'streetOutside') : t(language, 'streetPickHint')}</span>
        <div><button className="btn btn--quiet" type="button" onClick={onCancelPick}>{t(language, 'cancel')}</button><button className="btn btn--primary" type="button" disabled={!pickedPoint || !isStreetPoint(pickedPoint)} onClick={onConfirmPick}>{t(language, 'streetChoosePoint')}</button></div>
      </div>}

      <div className="pp-map__overlays">
        {schematic && (
          <div className="pp-map__banner" role="status">
            <strong>{t(language, streets === 'slow' ? 'streetsSlow' : online ? 'streetsUnavailable' : 'offlineOverview')}</strong>
            {online && (
              <button type="button" className="btn btn--small" onClick={retryStreets} title={t(language, 'retryStreets')} aria-label={t(language, 'retryStreets')}>
                <RotateCcw size={16} aria-hidden="true" />
                <span className="pp-map__banner-text">{t(language, 'retryStreets')}</span>
              </button>
            )}
            <span className="pp-map__banner-note">{t(language, streets === 'slow' ? 'streetsSlowNote' : directions ? 'streetTilesOnly' : 'schematicNote')}</span>
          </div>
        )}
        {streets === 'loading' && <div className="pp-map__banner pp-map__banner--quiet" role="status">{t(language, 'loadingStreets')}</div>}
        <ul id="map-legend" className={`pp-legend${legendOpen ? '' : ' is-collapsed'}`} aria-label={t(language, 'legend')}>
          <li><span className={`pp-legend__line${directions ? ' pp-legend__line--street' : ''}`} aria-hidden="true" /> {t(language, directions ? 'streetLegend' : 'legendRoute')}</li>
          {directions?.alternative && <li><span className="pp-legend__line pp-legend__line--alt" aria-hidden="true" /> {t(language, 'streetAltLegend', { name: t(language, directions.alternative.strategy === 'quieter' ? 'streetQuieter' : 'streetShortest') })}</li>}
          {directions && <li><span className="pp-legend__snap" aria-hidden="true" />{t(language, 'streetSnapDestination')}</li>}
          {directions && <li><span className="pp-legend__approx" aria-hidden="true" />{t(language, 'streetPinDestination')}</li>}
          {directions && directions.hotspots.length > 0 && <li><span className="pp-legend__hotspot" aria-hidden="true" />{t(language, 'streetHotspots')}</li>}
          {metroSegments.length > 0 && <li><span className="pp-legend__line pp-legend__line--metro" aria-hidden="true" /> {t(language, 'legendMetroLeg')}</li>}
          {schematic && <li><span className="pp-legend__line pp-legend__line--metroline" aria-hidden="true" /> {t(language, 'legendMetroLine')}</li>}
          <li><span className="pp-legend__dot" aria-hidden="true" /> {t(language, 'legendPandal')}</li>
          <li><span className="pp-legend__pin" aria-hidden="true">{formatNumber(language, 1)}</span> {t(language, 'legendStop')}</li>
          <li><span className="pp-legend__pin pp-legend__pin--visited" aria-hidden="true">✓</span> {t(language, 'legendVisited')}</li>
          <li><span className="pp-legend__pin pp-legend__pin--start" aria-hidden="true" /> {t(language, 'legendStart')}</li>
        </ul>
      </div>
    </div>
  )
}
