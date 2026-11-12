// Gestion du bouton retour du téléphone : chaque écran peut déclarer ce qu'il faut faire au retour.
import { useEffect, useRef } from 'react';
const handlers = [];
export function runBack() { const h = handlers[handlers.length - 1]; if (h && h.current) { h.current(); return true; } return false; }
export function useBack(fn) {
  const ref = useRef(fn); ref.current = fn; const on = !!fn;
  useEffect(() => { if (!on) return undefined; handlers.push(ref); return () => { const i = handlers.lastIndexOf(ref); if (i >= 0) handlers.splice(i, 1); }; }, [on]);
}
