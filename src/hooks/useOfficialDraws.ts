import { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawLoadStatus } from '../lib/draws.ts';
import bundledData from '../data/official-draws.json';
import { DRAW_CACHE_KEY, parseSnapshot, selectSnapshot, snapshotFreshness } from '../lib/draws.ts';
import { syncPublishedSnapshot } from '../lib/draw-sync.ts';

const bundledSnapshot = parseSnapshot(bundledData);
function loadInitialSnapshot() {
  try { return selectSnapshot(bundledSnapshot, localStorage.getItem(DRAW_CACHE_KEY)); }
  catch { return bundledSnapshot; }
}

export function useOfficialDraws() {
  const [snapshot, setSnapshot] = useState(loadInitialSnapshot);
  const currentSnapshot = useRef(snapshot);
  const [status, setStatus] = useState<DrawLoadStatus>('syncing');
  const [now, setNow] = useState(Date.now);
  const refreshAction = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshAction.current(), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let lastAttempt = 0;
    let request: { controller: AbortController; timer: number } | null = null;
    const sync = async (force = false) => {
      if (!active || request || (!force && Date.now() - lastAttempt < 5000)) return;
      lastAttempt = Date.now();
      const controller = new AbortController();
      const currentRequest = { controller, timer: window.setTimeout(() => controller.abort(), 12000) };
      request = currentRequest;
      setStatus('syncing');
      try {
        const incoming = await syncPublishedSnapshot(currentSnapshot.current, document.baseURI, controller.signal);
        if (!active) return;
        currentSnapshot.current = incoming;
        setSnapshot(incoming);
        setNow(Date.now());
        setStatus('live');
        try { localStorage.setItem(DRAW_CACHE_KEY, JSON.stringify(incoming)); }
        catch { /* Storage restrictions must not block live data. */ }
      } catch {
        if (active) setStatus('saved');
      } finally {
        window.clearTimeout(currentRequest.timer);
        if (request === currentRequest) request = null;
      }
    };
    const onReturn = () => { if (document.visibilityState === 'visible') void sync(); };
    const onOnline = () => { if (document.visibilityState === 'visible') void sync(true); };
    refreshAction.current = () => { void sync(true); };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('online', onOnline);
    void sync(true);
    return () => {
      active = false;
      refreshAction.current = () => {};
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('online', onOnline);
      if (request) {
        window.clearTimeout(request.timer);
        request.controller.abort();
      }
    };
  }, []);
  return { snapshot, status, refresh, freshness: snapshotFreshness(snapshot, now) };
}
