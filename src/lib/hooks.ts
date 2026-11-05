import { useEffect, useRef, useState } from 'react'

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Flips to true right after the first paint so CSS transitions can run from the initial state. */
export function useMounted(): boolean {
  const [m, setM] = useState(prefersReducedMotion())
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setM(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return m
}

/** Animates a number from its previous value to `target` (ease-out). */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0)
  const from = useRef(prefersReducedMotion() ? target : 0)
  useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1)
      const v = p >= 1 ? target : a + (target - a) * (1 - Math.pow(1 - p, 3))
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export function useHashPage<T extends string>(pages: readonly T[], fallback: T): [T, (p: T) => void] {
  const read = (): T => {
    const h = window.location.hash.replace(/^#\/?/, '') as T
    return pages.includes(h) ? h : fallback
  }
  const [page, setPage] = useState<T>(read)
  useEffect(() => {
    const on = () => setPage(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return [page, (p) => (window.location.hash = `/${p}`)]
}
