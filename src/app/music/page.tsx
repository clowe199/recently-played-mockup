'use client'

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

// Typography constants.
// MONO — uses a system monospace stack so the mockup runs with zero
//   font setup. If you license a display mono (PPFraktionMono, Berkeley
//   Mono, etc.), swap the fontFamily string and load the font wherever
//   next/font is configured in app/layout.tsx.
// DRUK — Montserrat Black is loaded by next/font in app/layout.tsx and
//   exposed as `--font-mont`. The original clowe.dev/music uses Druk
//   here; Montserrat 900 is a permissive open-source substitute.
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 400 }
const DRUK = { fontFamily: 'var(--font-mont), "Montserrat", system-ui, sans-serif', fontWeight: 900 as const }

interface HistoryTrack {
  name: string
  artist: string
  album: string
  artwork: string | null
  url: string | null
  playedAt: number
  durationMs?: number
  source?: string
  spotifyId?: string | null
}

interface ListeningStats {
  totalTracks: number
  uniqueTracks?: number
  uniqueArtists?: number
  totalMinutes: number
  topArtist?: { name: string; plays: number } | null
  topTrack?: { name: string; artist: string; plays: number } | null
  history: HistoryTrack[]
}

interface AlbumGroup {
  album: string
  artist: string
  artwork: string | null
  tracks: HistoryTrack[]
  totalPlays: number
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getHighResArtwork(url: string | null, size: number = 600): string | null {
  if (!url) return null
  // musicKit:// internal URLs contain the real CDN URL in their `fat` query param
  if (url.startsWith('musickit://') || url.startsWith('musicKit://')) {
    try {
      const u = new URL(url)
      const fat = u.searchParams.get('fat')
      if (fat) return getHighResArtwork(fat, size)
    } catch {}
    return null
  }
  return url
    .replace(/\d+x\d+(bb|cc|sr)?(\.[a-z]+)$/i, `${size}x${size}$1$2`)
    .replace(/\/\d+x\d+/, `/${size}x${size}`)
}

/** True only for real CDN URLs — filters null, empty, musickit:// blobs, and bare paths */
function isValidArtwork(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false
  // musickit:// internal URLs: only valid when they embed a real CDN URL in `fat`
  if (url.startsWith('musickit://') || url.startsWith('musicKit://')) {
    try {
      const fat = new URL(url).searchParams.get('fat')
      return !!fat && fat.startsWith('https://')
    } catch { return false }
  }
  // Bare paths like "Music115/v4/..." — no scheme, not downloadable from a browser
  if (!url.startsWith('https://') && !url.startsWith('http://')) return false
  return true
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours < 24) return `${hours}h ${mins}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

interface AlbumGroupExtended extends AlbumGroup {
  mostRecentPlay: number
}

function groupByAlbum(tracks: HistoryTrack[]): AlbumGroup[] {
  const albumMap = new Map<string, AlbumGroupExtended>()
  for (const track of tracks) {
    const key = `${track.album}-${track.artist}`
    if (!albumMap.has(key)) {
      albumMap.set(key, { album: track.album, artist: track.artist, artwork: track.artwork, tracks: [], totalPlays: 0, mostRecentPlay: 0 })
    }
    const group = albumMap.get(key)!
    group.tracks.push(track)
    group.totalPlays++
    if (track.playedAt > group.mostRecentPlay) group.mostRecentPlay = track.playedAt
    // Use the first valid CDN artwork found — musickit:// blobs without a fat param are skipped
    if (!isValidArtwork(group.artwork) && isValidArtwork(track.artwork)) group.artwork = track.artwork
  }
  return Array.from(albumMap.values()).sort((a, b) => b.mostRecentPlay - a.mostRecentPlay)
}

// ─── CoverFlow ────────────────────────────────────────────────────────────────

function CoverFlow({ albums, selectedIndex, onSelect, onExpand, detailOpen, compact, releaseYear, showInfo = true }: {
  albums: AlbumGroup[]
  selectedIndex: number
  onSelect: (index: number) => void
  onExpand: () => void
  detailOpen: boolean
  compact?: boolean
  releaseYear?: string
  showInfo?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isLarge, setIsLarge] = useState(false)
  const selectedIndexRef = useRef(selectedIndex)
  useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640)
      setIsLarge(window.innerWidth >= 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isMobile) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); onSelect(Math.max(0, selectedIndex - 1)) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onSelect(Math.min(albums.length - 1, selectedIndex + 1)) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, albums.length, onSelect, isMobile])

  useEffect(() => {
    if (!isMobile) return
    const container = containerRef.current
    if (!container) return
    let startX: number | null = null
    let startY: number | null = null
    let startIdx = 0
    let isHoriz: boolean | null = null
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; startIdx = selectedIndexRef.current; isHoriz = null }
    const onMove = (e: TouchEvent) => {
      if (startX === null || startY === null) return
      const dx = Math.abs(e.touches[0].clientX - startX)
      const dy = Math.abs(e.touches[0].clientY - startY)
      if (isHoriz === null && (dx > 8 || dy > 8)) isHoriz = dx > dy * 1.5
      if (isHoriz) e.preventDefault()
    }
    const onEnd = (e: TouchEvent) => {
      if (startX === null || !isHoriz) { startX = null; startY = null; isHoriz = null; return }
      const diff = startX - (e.changedTouches[0]?.clientX ?? startX)
      if (Math.abs(diff) > 40) {
        if (diff > 0) onSelect(Math.min(albums.length - 1, startIdx + 1))
        else onSelect(Math.max(0, startIdx - 1))
      }
      startX = null; startY = null; isHoriz = null
    }
    container.addEventListener('touchstart', onStart, { passive: true })
    container.addEventListener('touchmove', onMove, { passive: false })
    container.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      container.removeEventListener('touchstart', onStart)
      container.removeEventListener('touchmove', onMove)
      container.removeEventListener('touchend', onEnd)
    }
  }, [isMobile, albums.length, onSelect])

  if (albums.length === 0) return null

  const selectedAlbum = albums[selectedIndex]
  const albumSize = compact
    ? (isMobile ? 118 : 148)
    : (isMobile ? 224 : isLarge ? 316 : 280)
  const translateXMultiplier = compact
    ? (isMobile ? 50 : 62)
    : (isMobile ? 92 : isLarge ? 132 : 116)
  const containerH = compact
    ? 'h-[140px] sm:h-[172px]'
    : 'h-[272px] sm:h-[316px] lg:h-[356px]'

  return (
    <div className="relative">
      {/* 3D carousel */}
      <div
        ref={containerRef}
        className={`relative ${containerH} flex items-center justify-center`}
        style={{ perspective: '1200px' }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {albums.map((album, index) => {
            const offset = index - selectedIndex
            const isCenter = offset === 0
            const isLeft = offset < 0
            const absOffset = Math.abs(offset)
            if (absOffset > 3) return null
            const rotateY = isCenter ? 0 : (isLeft ? (isMobile ? 50 : 55) : (isMobile ? -50 : -55))
            const translateX = isCenter ? 0 : (offset * translateXMultiplier)
            const translateZ = isCenter ? 80 : (-80 - absOffset * (isMobile ? 15 : 20))
            const scale = isCenter ? 1 : (isMobile ? 0.65 - absOffset * 0.06 : 0.7 - absOffset * 0.04)
            const opacity = isCenter ? 1 : Math.max(0, isMobile ? 0.7 - absOffset * 0.25 : 0.8 - absOffset * 0.2)
            return (
              <button
                key={`${album.album}-${album.artist}-${index}`}
                onClick={() => isCenter ? onExpand() : onSelect(index)}
                className="absolute cursor-pointer focus:outline-none"
                style={{
                  width: albumSize, height: albumSize,
                  zIndex: 20 - absOffset,
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  backfaceVisibility: 'hidden',
                  willChange: 'transform, opacity',
                  transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s ease, width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), height 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                }}
              >
                <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ${isCenter ? 'ring-2 ring-white/20 ring-offset-2 ring-offset-transparent' : ''}`}>
                  {album.artwork ? (
                    <Image
                      src={getHighResArtwork(album.artwork, 600) ?? ''}
                      alt={album.album}
                      fill
                      sizes="(max-width: 768px) 60vw, 480px"
                      draggable={false}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                  )}

                  {/* Expand affordance — always in DOM, opacity-driven to avoid repaint flashes */}
                  <div
                    className="absolute bottom-0 inset-x-0 flex justify-center pb-2.5 pointer-events-none"
                    style={{ opacity: isCenter ? 1 : 0, transition: 'opacity 0.25s ease' }}
                  >
                    <motion.div
                      animate={{ y: detailOpen ? 0 : [0, 3, 0] }}
                      transition={detailOpen ? {} : { duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                      className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm flex items-center gap-1"
                    >
                      <svg
                        className="w-3 h-3 text-white/55 transition-transform duration-300"
                        style={{ transform: detailOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                      <span className="text-[9px] text-white/45 tracking-[0.14em] uppercase" style={MONO}>
                        {detailOpen ? 'close' : 'tracks'}
                      </span>
                    </motion.div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Album info below carousel — hidden when parent renders it in sidebar */}
      {showInfo && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`text-center px-4 ${compact ? 'mt-2' : 'mt-4'}`}
          >
            <h3
              className="font-black text-white leading-tight line-clamp-1"
              style={{ ...DRUK, fontSize: compact ? '0.95rem' : '1.125rem' }}
            >
              {selectedAlbum?.album || 'Unknown Album'}
            </h3>
            {!compact && (
              <p className="text-sm text-white/40 mt-1">
                {selectedAlbum?.artist || 'Unknown Artist'}{releaseYear && ` · ${releaseYear}`}
              </p>
            )}
            <button
              onClick={onExpand}
              className="inline-flex items-center gap-1.5 mt-1.5 group"
            >
              <span className="text-[11px] text-[#fc3c44]" style={MONO}>
                {selectedAlbum?.totalPlays} {selectedAlbum?.totalPlays === 1 ? 'play' : 'plays'}
              </span>
              <svg
                className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-all duration-300"
                style={{ transform: detailOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Position counter + arrows */}
      <div className={`flex items-center justify-center gap-3 ${compact ? 'mt-2' : 'mt-3'}`}>
        <button
          onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
          disabled={selectedIndex === 0}
          className="w-6 h-6 rounded-full border border-white/[0.08] flex items-center justify-center hover:border-white/15 transition-colors disabled:opacity-20"
        >
          <svg className="w-2.5 h-2.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span className="text-[10px] text-white/22 tabular-nums select-none min-w-[60px] text-center" style={MONO}>
          {String(selectedIndex + 1).padStart(2, '0')} / {String(albums.length).padStart(2, '0')}
        </span>
        <button
          onClick={() => onSelect(Math.min(albums.length - 1, selectedIndex + 1))}
          disabled={selectedIndex >= albums.length - 1}
          className="w-6 h-6 rounded-full border border-white/[0.08] flex items-center justify-center hover:border-white/15 transition-colors disabled:opacity-20"
        >
          <svg className="w-2.5 h-2.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface GroupedTrack {
  track: HistoryTrack
  playCount: number
  mostRecentPlay: number
}

function groupTracksByName(tracks: HistoryTrack[]): GroupedTrack[] {
  const trackMap = new Map<string, GroupedTrack>()
  for (const track of tracks) {
    const key = `${track.name}:::${track.artist}`
    if (!trackMap.has(key)) trackMap.set(key, { track, playCount: 0, mostRecentPlay: 0 })
    const group = trackMap.get(key)!
    group.playCount++
    if (track.playedAt > group.mostRecentPlay) { group.mostRecentPlay = track.playedAt; group.track = track }
  }
  return Array.from(trackMap.values()).sort((a, b) => b.mostRecentPlay - a.mostRecentPlay)
}

function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-5 flex-shrink-0">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-[#fc3c44] rounded-full"
          animate={isPlaying ? { height: ['30%', '100%', '55%', '85%', '30%'] } : { height: '30%' }}
          transition={isPlaying ? { duration: 0.75 + i * 0.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.09 } : { duration: 0.3 }}
          style={{ height: '30%', minHeight: 3 }}
        />
      ))}
    </div>
  )
}

function AudioProgressBar({ progress, currentTime, duration, onSeek }: {
  progress: number; currentTime: number; duration: number; onSeek: (progress: number) => void
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }
  return (
    <div className="w-full">
      <div className="relative h-2 bg-white/[0.08] rounded-full cursor-pointer group" onClick={handleClick}>
        <div className="absolute left-0 top-0 h-full bg-[#fc3c44] rounded-full" style={{ width: `${progress * 100}%`, transition: 'width 300ms linear' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#fc3c44] rounded-full opacity-0 group-hover:opacity-100 shadow-lg" style={{ left: `calc(${progress * 100}% - 7px)`, transition: 'left 300ms linear, opacity 150ms ease' }} />
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-white/28 tabular-nums" style={MONO}>
        <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
      </div>
    </div>
  )
}

// ─── Album detail panel (no artwork — carousel IS the artwork) ────────────────

function AlbumDetailPanel({ album, isPlaying, onPlayToggle, previewUrl, onPlayTrack, currentTrackName, loadingPreview, audioProgress, audioCurrentTime, audioDuration, onSeek, noPreviewAvailable }: {
  album: AlbumGroup
  isPlaying: boolean
  onPlayToggle: () => void
  previewUrl: string | null
  onPlayTrack: (trackName: string, artist: string) => void
  currentTrackName: string | null
  loadingPreview: boolean
  audioProgress: number
  audioCurrentTime: number
  audioDuration: number
  onSeek: (progress: number) => void
  noPreviewAvailable: boolean
}) {
  const groupedTracks = useMemo(() => groupTracksByName(album.tracks), [album.tracks])
  const uniqueTrackCount = groupedTracks.length
  const repeatPlays = album.totalPlays - uniqueTrackCount
  const repeatRate = Math.round((repeatPlays / Math.max(album.totalPlays, 1)) * 100)
  const mostReplayed = groupedTracks.length > 0
    ? groupedTracks.reduce((best, gt) => gt.playCount > best.playCount ? gt : best, groupedTracks[0])
    : null
  const totalDurationMs = album.tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0)
  const albumListenMinutes = Math.round(totalDurationMs / 60000)

  const storedSpotifyId = album.tracks.find(t => t.spotifyId)?.spotifyId ?? null
  const [resolvedSpotifyUrl, setResolvedSpotifyUrl] = useState<string | null>(
    storedSpotifyId ? `https://open.spotify.com/track/${storedSpotifyId}` : null
  )

  useEffect(() => {
    setResolvedSpotifyUrl(storedSpotifyId ? `https://open.spotify.com/track/${storedSpotifyId}` : null)
    if (storedSpotifyId) return
    const firstTrack = album.tracks[0]
    if (!firstTrack) return
    fetch(`/api/spotify/search?term=${encodeURIComponent(`${firstTrack.name} ${album.artist}`)}&type=track`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.url) setResolvedSpotifyUrl(d.url) })
      .catch(() => {})
  }, [album.album, album.artist]) // eslint-disable-line react-hooks/exhaustive-deps

  const statItems = [
    { label: 'Plays', value: String(album.totalPlays) },
    { label: 'Tracks', value: String(uniqueTrackCount) },
    ...(albumListenMinutes > 0 ? [{ label: 'Time', value: formatMinutes(albumListenMinutes) }] : []),
    ...(repeatRate > 0 ? [{ label: 'Repeat', value: `${repeatRate}%` }] : []),
  ]

  const showAudioPlayer = !!(currentTrackName && !noPreviewAvailable)

  return (
    <div className="flex flex-col gap-3">

      {/* Top bar: play + preview state + external links */}
      <div className="flex items-center gap-3.5 px-1">
        <button
          onClick={onPlayToggle}
          disabled={(!previewUrl && !loadingPreview) || loadingPreview}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
            loadingPreview
              ? 'bg-white/[0.06] text-[#fc3c44]'
              : previewUrl
                ? isPlaying ? 'bg-[#fc3c44] text-white shadow-lg' : 'bg-white/[0.09] hover:bg-white/[0.14] text-white'
                : 'bg-white/[0.04] text-white/25 cursor-not-allowed'
          }`}
        >
          {loadingPreview
            ? <div className="w-4 h-4 border-2 border-[#fc3c44] border-t-transparent rounded-full animate-spin" />
            : isPlaying
              ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
        </button>

        <div className="flex-1 min-w-0">
          {showAudioPlayer ? (
            <div className="flex items-center gap-2.5">
              <AudioVisualizer isPlaying={isPlaying} />
              <span className="text-[13px] text-[#fc3c44] truncate font-semibold tracking-tight">{currentTrackName}</span>
            </div>
          ) : noPreviewAvailable ? (
            <span className="text-[11px] text-white/35" style={MONO}>No preview available</span>
          ) : loadingPreview ? (
            <span className="text-[11px] text-white/35" style={MONO}>Finding preview...</span>
          ) : null}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {album.tracks[0]?.url && (
            <a href={album.tracks[0].url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
              style={MONO}>
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="#fc3c44">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              Apple Music
            </a>
          )}
          <a
            href={resolvedSpotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(`${album.tracks[0]?.name || album.album} ${album.artist}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
            style={MONO}
          >
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            {resolvedSpotifyUrl ? 'Spotify' : 'Search Spotify'}
          </a>
        </div>
      </div>

      {/* Audio progress bar */}
      <AnimatePresence>
        {showAudioPlayer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-1"
          >
            <AudioProgressBar progress={audioProgress} currentTime={audioCurrentTime} duration={audioDuration} onSeek={onSeek} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats grid */}
      <div
        className="grid gap-px rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)', gridTemplateColumns: `repeat(${statItems.length}, 1fr)` }}
      >
        {statItems.map((s) => (
          <div key={s.label} className="px-4 py-3.5" style={{ background: '#0a0a0f' }}>
            <p className="tabular-nums leading-none text-white font-black whitespace-nowrap"
              style={{ ...DRUK, fontSize: 'clamp(1.15rem, 3vw, 1.6rem)' }}>
              {s.value}
            </p>
            <p className="text-[9px] text-white/42 uppercase tracking-[0.2em] mt-1.5" style={MONO}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Most replayed */}
      {mostReplayed && mostReplayed.playCount > 1 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[9px] text-white/40 uppercase tracking-[0.16em] shrink-0" style={MONO}>Most replayed</p>
          <p className="text-[12px] font-bold text-white/70 truncate flex-1">{mostReplayed.track.name}</p>
          <span className="text-[10px] font-bold text-[#fc3c44] shrink-0" style={MONO}>×{mostReplayed.playCount}</span>
        </div>
      )}

      {/* Track list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-[9px] text-white/40 uppercase tracking-[0.2em]" style={MONO}>Tracks</span>
          <span className="text-[9px] text-white/20 uppercase tracking-[0.15em]" style={MONO}>{groupedTracks.length}</span>
        </div>
        <div>
          {groupedTracks.slice(0, 20).map((groupedTrack) => {
            const { track, playCount, mostRecentPlay } = groupedTrack
            const isCurrentTrack = currentTrackName === track.name && isPlaying
            const isCurrentTrackPaused = currentTrackName === track.name && !isPlaying
            const isActive = isCurrentTrack || isCurrentTrackPaused
            return (
              <button
                key={track.name}
                onClick={() => { if (isActive) onPlayToggle(); else onPlayTrack(track.name, album.artist) }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.025]'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isCurrentTrack ? 'bg-[#fc3c44]' : isCurrentTrackPaused ? 'bg-[#fc3c44]/25' : 'bg-white/[0.05]'
                }`}>
                  {isCurrentTrack
                    ? <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                    : <svg className="w-2.5 h-2.5 ml-px text-white/30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className={`text-[13px] font-semibold truncate leading-snug ${isCurrentTrack ? 'text-[#fc3c44]' : 'text-white/85'}`}>
                      {track.name}
                    </p>
                    {playCount > 1 && (
                      <span className="text-[9px] font-bold text-[#fc3c44]/70 shrink-0" style={MONO}>×{playCount}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/38" style={MONO}>
                    {formatTimeAgo(mostRecentPlay)}{track.durationMs && ` · ${formatDuration(track.durationMs)}`}
                  </p>
                </div>
                {track.url && (
                  <a href={track.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="p-1 text-white/12 hover:text-white/35 transition-colors flex-shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                )}
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Now Playing strip ────────────────────────────────────────────────────────

interface NowPlayingTrack {
  name: string
  artist: string
  album?: string | null
  artwork?: string | null
  setAt: number
}

function NowPlayingStrip({ track }: { track: NowPlayingTrack }) {
  const directUrl = getHighResArtwork(track.artwork ?? null, 200)
  const [artworkUrl, setArtworkUrl] = useState<string | null>(directUrl)
  const [imgError, setImgError] = useState(false)

  // Whenever the track changes, reset to the direct URL (or null).
  // Must include `directUrl` in deps so the reset uses the fresh value
  // when the new track happens to ship a different artwork URL.
  useEffect(() => {
    setArtworkUrl(directUrl)
    setImgError(false)
  }, [track.name, track.artist, directUrl])

  // If we have no direct URL (or it errored), hit iTunes as a backup
  useEffect(() => {
    if (artworkUrl && !imgError) return
    const term = encodeURIComponent(`${track.name} ${track.artist}`)
    fetch(`/api/apple-music/search?term=${term}&type=song`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const art: string | undefined = d?.results?.[0]?.artwork
        if (art) setArtworkUrl(getHighResArtwork(art, 200))
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkUrl, imgError])

  return (
    <div className="flex items-center gap-3.5 py-3 border-b border-white/[0.06]">
      {/* Album art — always shows something; iTunes fallback fires on missing/broken URLs */}
      {artworkUrl && !imgError ? (
        <img
          src={artworkUrl}
          alt=""
          className="flex-shrink-0 w-10 h-10 rounded-xl object-cover"
          style={{ boxShadow: '0 3px 14px rgba(0,0,0,0.55)' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
          <svg className="w-4 h-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
      )}

      {/* Waveform bars */}
      <div className="flex items-end gap-[3px] h-4 flex-shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{ background: '#fc3c44', height: '35%' }}
            animate={{ height: ['35%', '100%', '55%', '85%', '35%'] }}
            transition={{ duration: 0.65 + i * 0.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
          />
        ))}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white leading-tight truncate">{track.name}</p>
        <p className="text-[11px] text-white/38 leading-tight truncate mt-0.5" style={MONO}>{track.artist}</p>
      </div>

      {/* Live pulse */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <motion.div
          className="w-[5px] h-[5px] rounded-full"
          style={{ background: '#fc3c44' }}
          animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="text-[9px] text-white/30 tracking-[0.22em] uppercase" style={MONO}>live</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MusicHistoryPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ListeningStats | null>(null)
  // Track by stable key (album+artist) so background data refreshes
  // can't shift the array and show the wrong album in the detail panel.
  const [selectedAlbumKey, setSelectedAlbumKey] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [nowPlaying, setNowPlaying] = useState<NowPlayingTrack | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentTrackName, setCurrentTrackName] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [noPreviewAvailable, setNoPreviewAvailable] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(30)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [releaseYears, setReleaseYears] = useState<Map<string, string>>(new Map())
  const [resolvedArtworks, setResolvedArtworks] = useState<Map<string, string>>(new Map())
  const processedAlbumsRef = useRef<AlbumGroup[]>([])

  // Poll /api/now-playing — the iOS app pings this when a track starts.
  // Falls back to null if nothing is actively playing or the signal is stale.
  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch('/api/now-playing', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const track = data.track
      if (track && track.name && track.artist) {
        setNowPlaying({
          name:    track.name,
          artist:  track.artist,
          album:   track.album ?? null,
          artwork: track.artwork ?? null,
          setAt:   track.setAt ?? Date.now(),
        })
      } else {
        setNowPlaying(null)
      }
    } catch {}
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchData()
    fetchNowPlaying()
    const nowPlayingInterval = setInterval(fetchNowPlaying, 15_000)
    // Silent background refresh — picks up new scrobbles without a loading state
    const historyInterval = setInterval(fetchDataSilent, 45_000)
    return () => {
      clearInterval(nowPlayingInterval)
      clearInterval(historyInterval)
    }
  }, [fetchNowPlaying])

  useEffect(() => {
    return () => { audioRef.current?.pause(); audioRef.current = null }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/apple-music/history?t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) setStats(await res.json())
    } catch (e) { console.error('Fetch error:', e) }
    setLoading(false)
  }

  // Silent refresh — updates track list in the background without spinner
  const fetchDataSilent = async () => {
    try {
      const res = await fetch(`/api/apple-music/history?t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) setStats(await res.json())
    } catch {}
  }

  const processedData = useMemo(() => {
    if (!stats?.history) return { albums: [], uniqueTracks: 0, uniqueArtists: 0, totalPlays: 0, totalMinutes: 0 }
    const albums = groupByAlbum(stats.history)
    const uniqueTracks = stats.uniqueTracks ?? new Set(stats.history.map(t => t.name)).size
    return {
      albums,
      uniqueTracks,
      uniqueArtists: stats.uniqueArtists ?? 0,
      totalPlays: stats.totalTracks || stats.history.length,
      totalMinutes: stats.totalMinutes || 0,
    }
  }, [stats])

  // Merge iTunes-resolved artworks into albums so carousel and detail panel see them
  const albumsWithArtwork = useMemo(() =>
    processedData.albums.map(album => {
      if (isValidArtwork(album.artwork)) return album
      const resolved = resolvedArtworks.get(`${album.album}-${album.artist}`)
      return resolved ? { ...album, artwork: resolved } : album
    }),
    [processedData.albums, resolvedArtworks]
  )

  useEffect(() => { processedAlbumsRef.current = albumsWithArtwork }, [albumsWithArtwork])

  // Derive numeric index from the stable key — survives array reorders on refresh.
  // Declared here (before any useEffect that references it) to avoid TDZ errors in the bundle.
  const selectedAlbumIndex = useMemo(() => {
    if (!selectedAlbumKey || albumsWithArtwork.length === 0) return 0
    const idx = albumsWithArtwork.findIndex(
      a => `${a.album}|||${a.artist}` === selectedAlbumKey
    )
    return idx >= 0 ? idx : 0
  }, [albumsWithArtwork, selectedAlbumKey])

  // Initialise key when albums first load
  useEffect(() => {
    if (selectedAlbumKey === null && albumsWithArtwork.length > 0) {
      const first = albumsWithArtwork[0]
      setSelectedAlbumKey(`${first.album}|||${first.artist}`)
    }
  }, [albumsWithArtwork, selectedAlbumKey])

  const handleAlbumSelect = useCallback((index: number) => {
    const album = albumsWithArtwork[index]
    if (album) setSelectedAlbumKey(`${album.album}|||${album.artist}`)
  }, [albumsWithArtwork])

  useEffect(() => {
    if (albumsWithArtwork.length === 0) return
    const album = albumsWithArtwork[selectedAlbumIndex]
    if (!album) return
    const cacheKey = `${album.album}-${album.artist}`
    if (releaseYears.has(cacheKey)) return
    fetch(`/api/apple-music/search?term=${encodeURIComponent(`${album.album} ${album.artist}`)}&type=album`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results?.[0]) return
        const result = d.results[0]
        if (result.releaseDate) setReleaseYears(prev => new Map(prev).set(cacheKey, new Date(result.releaseDate).getFullYear().toString()))
      })
      .catch(() => {})
  }, [selectedAlbumIndex, albumsWithArtwork, releaseYears])

  // For all albums missing artwork, fetch from iTunes — staggered to avoid rate limiting
  useEffect(() => {
    const missing = processedData.albums.filter(album => {
      if (isValidArtwork(album.artwork)) return false
      return !resolvedArtworks.has(`${album.album}-${album.artist}`)
    })
    missing.forEach((album, i) => {
      const cacheKey = `${album.album}-${album.artist}`
      setTimeout(() => {
        fetch(`/api/apple-music/search?term=${encodeURIComponent(`${album.album} ${album.artist}`)}&type=album`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            const art = d?.results?.[0]?.artwork
            if (art) setResolvedArtworks(prev => new Map(prev).set(cacheKey, art))
          })
          .catch(() => {})
      }, i * 300) // 300ms between each request — keeps us well under iTunes rate limits
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedData.albums])

  const fetchPreviewUrl = useCallback(async (album: AlbumGroup) => {
    setLoadingPreview(true)
    try {
      for (const track of album.tracks.slice(0, 5)) {
        try {
          const res = await fetch(`/api/apple-music/search?term=${encodeURIComponent(`${track.name} ${album.artist}`)}&type=song`)
          if (res.ok) {
            const data = await res.json()
            // Check all results, not just the first — iTunes doesn't always put the
            // best match first, and some results may have previewUrl while others don't
            const match = (data.results || []).find((r: { previewUrl?: string }) => r.previewUrl)
            if (match) {
              setPreviewUrl(match.previewUrl)
              setCurrentTrackName(track.name)
              return
            }
          }
        } catch {}
      }
      setNoPreviewAvailable(true)
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const albumsLoaded = processedData.albums.length > 0
  useEffect(() => {
    if (!albumsLoaded) return
    audioRef.current?.pause()
    setIsPlaying(false)
    setPreviewUrl(null)
    setCurrentTrackName(null)
    setNoPreviewAvailable(false)
    setAudioProgress(0)
    setAudioCurrentTime(0)
    const timer = setTimeout(() => {
      const album = processedAlbumsRef.current[selectedAlbumIndex]
      if (album) fetchPreviewUrl(album)
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedAlbumIndex, albumsLoaded, fetchPreviewUrl])

  const fetchAndPlayPreview = useCallback(async (trackName: string, artist: string) => {
    setLoadingPreview(true)
    setNoPreviewAvailable(false)
    try {
      const res = await fetch(`/api/apple-music/search?term=${encodeURIComponent(`${trackName} ${artist}`)}&type=song`)
      if (res.ok) {
        const data = await res.json()
        if (data.results?.[0]?.previewUrl) {
          const url = data.results[0].previewUrl
          audioRef.current?.pause()
          audioRef.current = null
          setAudioProgress(0); setAudioCurrentTime(0)
          setPreviewUrl(url); setCurrentTrackName(trackName)
          const audio = new Audio(url)
          audio.volume = 0.3
          audio.onended = () => { setIsPlaying(false); setAudioProgress(0); setAudioCurrentTime(0) }
          audio.onerror = () => setIsPlaying(false)
          audio.ontimeupdate = () => { if (audio.duration) { setAudioProgress(audio.currentTime / audio.duration); setAudioCurrentTime(audio.currentTime) } }
          audio.onloadedmetadata = () => setAudioDuration(audio.duration || 30)
          audioRef.current = audio
          try { await audio.play(); setIsPlaying(true) } catch { setIsPlaying(false) }
        } else {
          setCurrentTrackName(trackName)
          setNoPreviewAvailable(true)
          setPreviewUrl(null)
        }
      }
    } catch { setNoPreviewAvailable(true) }
    setLoadingPreview(false)
  }, [])

  const handlePlayToggle = useCallback(async () => {
    if (!previewUrl) return
    if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false) }
    else {
      if (!audioRef.current) {
        const audio = new Audio(previewUrl)
        audio.volume = 0.3
        audio.onended = () => { setIsPlaying(false); setAudioProgress(0); setAudioCurrentTime(0) }
        audio.onerror = () => setIsPlaying(false)
        audio.ontimeupdate = () => { if (audio.duration) { setAudioProgress(audio.currentTime / audio.duration); setAudioCurrentTime(audio.currentTime) } }
        audio.onloadedmetadata = () => setAudioDuration(audio.duration || 30)
        audioRef.current = audio
      } else { audioRef.current.src = previewUrl }
      audioRef.current.volume = 0.3
      try { await audioRef.current.play(); setIsPlaying(true) } catch { setIsPlaying(false) }
    }
  }, [isPlaying, previewUrl])

  const handleSeek = useCallback((progress: number) => {
    if (audioRef.current?.duration) {
      const t = progress * audioRef.current.duration
      audioRef.current.currentTime = t; setAudioCurrentTime(t); setAudioProgress(progress)
    }
  }, [])

  if (!mounted) return (
    <div className="h-[100dvh] flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="w-5 h-5 border border-white/15 border-t-white/50 rounded-full animate-spin" />
    </div>
  )

  const selectedAlbum = albumsWithArtwork[selectedAlbumIndex]
  const currentReleaseYear = releaseYears.get(`${selectedAlbum?.album}-${selectedAlbum?.artist}`)

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col" style={{ background: '#0a0a0f', color: 'rgba(255,255,255,0.92)' }}>

      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <AnimatePresence>
          {isValidArtwork(selectedAlbum?.artwork) && (
            <motion.div
              key={`bg-${selectedAlbumIndex}`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            >
              <img
                src={getHighResArtwork(selectedAlbum!.artwork, 600) ?? undefined}
                alt=""
                className="absolute object-cover"
                style={{ inset: '-8%', width: '116%', height: '116%', filter: 'blur(60px) saturate(1.8)', opacity: 0.14 }}
              />
              <img
                src={getHighResArtwork(selectedAlbum!.artwork, 400) ?? undefined}
                alt=""
                className="absolute object-cover"
                style={{ top: '-25%', right: '-10%', width: '60%', height: '60%', filter: 'blur(80px) saturate(2.2)', opacity: 0.1 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,15,0.5) 0%, transparent 22%, transparent 62%, #0a0a0f 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,10,15,0.55) 0%, transparent 20%, transparent 80%, rgba(10,10,15,0.55) 100%)' }} />
      </div>

      {/* Shell — viewport-locked; only the detail panel scrolls internally */}
      <div className="no-scrollbar relative z-10 flex-1 overflow-hidden flex flex-col max-w-4xl w-full mx-auto px-6 pb-6">

        {/* Nav */}
        <div className="flex-shrink-0 flex items-center justify-between pt-5 pb-3">
          <div className="flex items-center gap-5">
            <span className="leading-none tracking-[-0.04em] text-white select-none" style={{ ...DRUK, fontSize: '1.15rem' }}>
              c<span style={{ color: '#fc3c44' }}>.</span>
            </span>
            <Link href="/"
              className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors"
              style={{ ...MONO, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
              home
            </Link>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center hover:border-white/15 transition-colors disabled:opacity-40">
            <svg className={`w-3.5 h-3.5 text-white/35 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            </svg>
          </button>
        </div>

        {/* Title — collapses when detail panel is open to reclaim vertical space */}
        <AnimatePresence initial={false}>
          {!detailOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex-shrink-0 overflow-hidden"
            >
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#fc3c44">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                  <span className="text-[#fc3c44] text-[10px] tracking-[0.25em] uppercase" style={MONO}>Apple Music</span>
                </div>
                <h1 className="leading-[0.88] tracking-[-0.03em] text-white"
                  style={{ ...DRUK, fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)' }}>
                  Recently Played
                </h1>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-6 h-6 border border-white/15 border-t-white/50 rounded-full animate-spin mx-auto mb-5" />
              <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase" style={MONO}>Loading history</p>
            </div>
          </div>
        ) : !stats || processedData.albums.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/30 mb-2">Nothing here yet</p>
              <p className="text-[10px] text-white/18 tracking-[0.2em] uppercase" style={MONO}>Play some music first</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">

            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08 }}
              className="flex-shrink-0 flex items-baseline gap-2 mt-1.5 pb-3 border-b border-white/[0.06]"
            >
              <span className="tabular-nums text-white/80" style={{ ...DRUK, fontSize: '1.05rem' }}>{processedData.totalPlays.toLocaleString()}</span>
              <span className="text-[9px] text-white/35 uppercase tracking-[0.18em]" style={MONO}>plays</span>
              <span className="text-white/10 mx-0.5">·</span>
              <span className="tabular-nums text-white/80" style={{ ...DRUK, fontSize: '1.05rem' }}>{processedData.uniqueTracks.toLocaleString()}</span>
              <span className="text-[9px] text-white/35 uppercase tracking-[0.18em]" style={MONO}>tracks</span>
              <span className="text-white/10 mx-0.5">·</span>
              <span className="tabular-nums text-white/80" style={{ ...DRUK, fontSize: '1.05rem' }}>{formatMinutes(processedData.totalMinutes)}</span>
              <span className="text-[9px] text-white/35 uppercase tracking-[0.18em]" style={MONO}>listened</span>
              <a
                href="https://developer.apple.com/documentation/applemusicapi"
                target="_blank" rel="noopener noreferrer"
                className="ml-auto text-[9px] text-white/25 hover:text-white/40 tracking-[0.16em] uppercase transition-colors"
                style={MONO}
              >
                Apple Music API
              </a>
            </motion.div>

            {/* Now playing */}
            <AnimatePresence>
              {nowPlaying && (
                <motion.div
                  key="now-playing"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <NowPlayingStrip track={nowPlaying} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Expanded: compact carousel stacked above detail panel ── */}
            {detailOpen && selectedAlbum ? (
              <div className="flex flex-col flex-1 min-h-0 mt-3 overflow-y-auto no-scrollbar">

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <CoverFlow
                    albums={albumsWithArtwork}
                    selectedIndex={selectedAlbumIndex}
                    onSelect={handleAlbumSelect}
                    onExpand={() => setDetailOpen(d => !d)}
                    detailOpen={detailOpen}
                    compact
                    releaseYear={currentReleaseYear}
                  />
                </motion.div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedAlbumIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="pb-4"
                  >
                    <AlbumDetailPanel
                      album={selectedAlbum}
                      isPlaying={isPlaying}
                      onPlayToggle={handlePlayToggle}
                      previewUrl={previewUrl}
                      onPlayTrack={fetchAndPlayPreview}
                      currentTrackName={currentTrackName}
                      loadingPreview={loadingPreview}
                      audioProgress={audioProgress}
                      audioCurrentTime={audioCurrentTime}
                      audioDuration={audioDuration}
                      onSeek={handleSeek}
                      noPreviewAvailable={noPreviewAvailable}
                    />
                  </motion.div>
                </AnimatePresence>

              </div>

            ) : (

              /* ── Collapsed: full carousel centred, fills remaining height ── */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`flex-shrink-0 ${nowPlaying ? 'pt-3' : 'pt-5'}`}
              >
                <CoverFlow
                  albums={albumsWithArtwork}
                  selectedIndex={selectedAlbumIndex}
                  onSelect={handleAlbumSelect}
                  onExpand={() => setDetailOpen(d => !d)}
                  detailOpen={detailOpen}
                  releaseYear={currentReleaseYear}
                />
              </motion.div>

            )}
          </div>
        )}
      </div>
    </div>
  )
}
