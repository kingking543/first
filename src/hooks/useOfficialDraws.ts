import { useCallback, useEffect, useRef, useState } from 'react';
import bundledData from '../data/official-draws.json';
import { DRAW_CACHE_KEY, DRAW_COUNT, fetchPublishedSnapshot, parseSnapshot, selectSnapshot } from '../lib/draws.ts';

const bundledSnapshot = parseSnapshot(bundledData);

function loadInitialSnapshot() {
  try {
    return selectSnapshot(bundledSnapshot, localStorage.getItem(DRAW_CACHE_KEY));
  } catch {
    return bundledSnapshot;
  }
}

export function useOfficialDraws() {
  const [snapshot, setSnapshot] = useState(loadInitialSnapshot);
  const currentSnapshot = useRef(snapshot);
  const [status, setStatus] = useState<'syncing' | 'live' | 'saved'>('syncing');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refresh = useCallback(() => setRefreshVersion(version => version + 1), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    setStatus('syncing');
    fetchPublishedSnapshot(new URL('data/official-draws.json', document.baseURI).href, controller.signal).then(incoming => {
      if (!active) return;
      if (Number(incoming.draws[0].period) < Number(currentSnapshot.current.draws[0].period) ||
          incoming.draws.length !== DRAW_COUNT) {
        throw new Error('官方响应早于已保存的开奖数据');
      }
      const selected = selectSnapshot(currentSnapshot.current, JSON.stringify(incoming));
      currentSnapshot.current = selected;
      setSnapshot(selected);
      setStatus('live');
      try {
        localStorage.setItem(DRAW_CACHE_KEY, JSON.stringify(selected));
      } catch {
        // Storage restrictions must not prevent live data from being displayed.
      }
    }).catch(() => {
      if (active) setStatus('saved');
    }).finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshVersion]);

  return { snapshot, status, refresh };
}
