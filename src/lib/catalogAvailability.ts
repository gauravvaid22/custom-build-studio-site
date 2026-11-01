import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import staticProducts, { type CatalogProduct } from '../data/catalog';
import staticCollections from '../../commerce/collections.json';
import staticRows from '../../commerce/admin-rows.json';
import bakedRevisionData from '../../commerce/catalog-revision.json';

export type CatalogCollection = (typeof staticCollections)[number];
export type CatalogRow = {
  id: string;
  title: string;
  description: string;
  productIds: string[];
  enabled: boolean;
  kind?: string;
  startAt?: string;
  endAt?: string;
};

export type LiveCatalogState = {
  products: CatalogProduct[];
  collections: CatalogCollection[];
  rows: CatalogRow[];
  archived: string[];
  revision: number;
  isLiveOverride: boolean;
  refreshCatalog: (force?: boolean) => Promise<void>;
};

const BAKED_REVISION = Number.isSafeInteger(bakedRevisionData?.revision) ? bakedRevisionData.revision : 0;
const STORAGE_KEY = 'cbs-live-catalog-v1';
const CHANNEL_NAME = 'cbs-catalog-sync';

const defaultRows = (staticRows as unknown as CatalogRow[]) || [];

let moduleLiveProducts: CatalogProduct[] = staticProducts;
let moduleLiveCollections: CatalogCollection[] = staticCollections;

export function getCurrentLiveProducts(): CatalogProduct[] {
  return typeof window === 'undefined' ? staticProducts : moduleLiveProducts;
}

export function getCurrentLiveCollections(): CatalogCollection[] {
  return typeof window === 'undefined' ? staticCollections : moduleLiveCollections;
}

const LiveCatalogContext = createContext<LiveCatalogState>({
  products: staticProducts,
  collections: staticCollections,
  rows: defaultRows,
  archived: [],
  revision: BAKED_REVISION,
  isLiveOverride: false,
  refreshCatalog: async () => {},
});

export function notifyCatalogUpdated(revision?: number) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('cbs-catalog-updated', { detail: { revision } }));
  } catch {}
  try {
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'catalog-updated', revision, at: Date.now() });
      ch.close();
    }
  } catch {}
}

export function LiveCatalogProvider({ children }: { children: ReactNode }) {
  const [catalogState, setCatalogState] = useState<{
    products: CatalogProduct[];
    collections: CatalogCollection[];
    rows: CatalogRow[];
    revision: number;
    isLiveOverride: boolean;
  }>({
    products: staticProducts,
    collections: staticCollections,
    rows: defaultRows,
    revision: BAKED_REVISION,
    isLiveOverride: false,
  });
  const [archived, setArchived] = useState<string[]>([]);
  const currentRevisionRef = useRef<number>(BAKED_REVISION);
  const inflightRef = useRef<Promise<void> | null>(null);

  const applyOverride = useCallback((payload: {
    revision: number;
    products: CatalogProduct[];
    collections: CatalogCollection[];
    rows?: CatalogRow[];
  }) => {
    moduleLiveProducts = payload.products;
    moduleLiveCollections = payload.collections;
    currentRevisionRef.current = payload.revision;
    setCatalogState({
      products: payload.products,
      collections: payload.collections,
      rows: Array.isArray(payload.rows) ? payload.rows : defaultRows,
      revision: payload.revision,
      isLiveOverride: true,
    });
  }, []);

  const refreshCatalog = useCallback(async (force = false) => {
    if (typeof window === 'undefined') return;
    if (inflightRef.current && !force) return inflightRef.current;

    const task = (async () => {
      try {
        const availRes = await fetch('/.netlify/functions/shop-catalog?action=availability', {
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        if (!availRes.ok) return;
        const avail = await availRes.json();
        if (Array.isArray(avail?.archived)) {
          setArchived(avail.archived);
        }
        const liveRevision = Number.isSafeInteger(avail?.revision) ? (avail.revision as number) : BAKED_REVISION;

        if (liveRevision <= BAKED_REVISION) {
          if (currentRevisionRef.current !== BAKED_REVISION) {
            moduleLiveProducts = staticProducts;
            moduleLiveCollections = staticCollections;
            currentRevisionRef.current = BAKED_REVISION;
            setCatalogState({
              products: staticProducts,
              collections: staticCollections,
              rows: defaultRows,
              revision: BAKED_REVISION,
              isLiveOverride: false,
            });
          }
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {}
          return;
        }

        if (!force && currentRevisionRef.current === liveRevision) {
          return;
        }

        if (!force) {
          try {
            const rawCached = sessionStorage.getItem(STORAGE_KEY);
            if (rawCached) {
              const parsed = JSON.parse(rawCached);
              if (
                parsed?.revision === liveRevision &&
                Array.isArray(parsed?.products) &&
                Array.isArray(parsed?.collections)
              ) {
                applyOverride(parsed);
                return;
              }
            }
          } catch {}
        }

        const pubRes = await fetch('/.netlify/functions/shop-catalog?action=public', {
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
        if (!pubRes.ok) return;
        const pub = await pubRes.json();
        if (!Array.isArray(pub?.products) || !Array.isArray(pub?.collections)) return;

        const nextPayload = {
          revision: Number.isSafeInteger(pub.revision) ? (pub.revision as number) : liveRevision,
          products: pub.products as CatalogProduct[],
          collections: pub.collections as CatalogCollection[],
          rows: Array.isArray(pub.rows) ? (pub.rows as CatalogRow[]) : defaultRows,
        };
        applyOverride(nextPayload);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextPayload));
        } catch {}
      } catch {
        /* Keep static fallback catalog if offline or temporarily unreachable */
      } finally {
        inflightRef.current = null;
      }
    })();

    inflightRef.current = task;
    return task;
  }, [applyOverride]);

  useEffect(() => {
    void refreshCatalog(false);
    const onFocus = () => void refreshCatalog(false);
    const onCustomUpdate = () => void refreshCatalog(true);
    window.addEventListener('focus', onFocus);
    window.addEventListener('cbs-catalog-updated', onCustomUpdate);

    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = () => void refreshCatalog(true);
      }
    } catch {}

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('cbs-catalog-updated', onCustomUpdate);
      try {
        channel?.close();
      } catch {}
    };
  }, [refreshCatalog]);

  const value = useMemo<LiveCatalogState>(
    () => ({
      products: catalogState.products,
      collections: catalogState.collections,
      rows: catalogState.rows,
      archived,
      revision: catalogState.revision,
      isLiveOverride: catalogState.isLiveOverride,
      refreshCatalog,
    }),
    [catalogState, archived, refreshCatalog],
  );

  return createElement(LiveCatalogContext.Provider, { value }, children);
}

export function useLiveCatalog(): LiveCatalogState {
  return useContext(LiveCatalogContext);
}

export function useCatalogAvailability(): string[] {
  return useContext(LiveCatalogContext).archived;
}

export async function assertCatalogAvailable(ids: string[]) {
  const response = await fetch('/.netlify/functions/shop-catalog?action=availability', {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Unable to verify product availability. Please try checkout again shortly.');
  const data = await response.json();
  if (data.pricingUpdating) throw new Error('Prices are being updated. Please return shortly to complete checkout.');
  if (!Array.isArray(data.archived)) throw new Error('Unable to verify product availability.');
  if (ids.some(id => data.archived.includes(id))) {
    throw new Error('An item has been removed from the shop. Remove it from your cart before checkout.');
  }
}
