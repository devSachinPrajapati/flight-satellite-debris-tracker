import { useEffect, useRef, useState } from "react";

/**
 * Simple useFPS hook that estimates frames per second.
 * Returns a small-integer FPS value updated every `sampleIntervalMs`.
 */
export default function useFPS(sampleIntervalMs = 500) {
  const [fps, setFps] = useState<number>(0);
  const framesRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      framesRef.current += 1;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const id = setInterval(() => {
      if (!mounted) return;
      setFps(Math.max(0, Math.round((framesRef.current * 1000) / sampleIntervalMs)));
      framesRef.current = 0;
    }, sampleIntervalMs);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(id);
    };
  }, [sampleIntervalMs]);

  return fps;
}
