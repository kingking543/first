import { useCallback, useEffect, useRef, useState } from 'react';

export function useClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    request.current++;
    clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (id: string, text: string) => {
    const version = ++request.current;
    clearTimeout(timer.current);
    setCopiedId(null);
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      if (version !== request.current) return;
      setCopiedId(id);
      timer.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      if (version === request.current) setError('复制未成功，请检查浏览器权限后重试。');
    }
  }, []);

  return { copiedId, error, copy };
}
