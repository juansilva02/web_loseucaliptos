import { useEffect, useState, useSyncExternalStore } from 'react'

function subscribeReducedMotion(callback) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function reducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => false)
}

// Rotación automática de un índice 0..length-1 cada intervalMs.
// Devuelve [index, setIndex] para poder fijarlo manualmente (hover, dots).
export function useAutoRotate(length, intervalMs, paused = false) {
  const [index, setIndex] = useState(0)
  const reducedMotion = usePrefersReducedMotion()
  useEffect(() => {
    if (paused || reducedMotion || length <= 0) return undefined
    const id = window.setInterval(() => setIndex((i) => (i + 1) % length), intervalMs)
    return () => window.clearInterval(id)
  }, [length, intervalMs, paused, reducedMotion])
  return [index, setIndex]
}

// true cuando el scroll vertical supera `threshold` (para el header sticky).
export function useScrolled(threshold = 0) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}
