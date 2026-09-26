/**
 * useTransfers Hook
 *
 * Server-driven hook for listing internal transfers with pagination,
 * debounced search, status filter, and live location path enrichment.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { transfersApi } from '../api';
import { locationsApi } from '@/features/warehouses/api';
import type { ApiTransfer, ApiTransferStatus, ApiPagination } from '../types';
import { ApiError } from '@/lib/apiClient';

const STATUS_MAP: Record<string, ApiTransferStatus | undefined> = {
  draft: 'DRAFT',
  waiting: 'WAITING',
  ready: 'READY',
  done: 'DONE',
  cancelled: 'CANCELED',
  canceled: 'CANCELED',
};

export interface UseTransfersOptions {
  search?: string;
  status?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  pageSize?: number;
}

export interface UseTransfersReturn {
  transfers: ApiTransfer[];
  locationsMap: Record<string, { name: string; fullPath: string; warehouseId?: string | null }>;
  pagination: ApiPagination | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  refetch: () => void;
  updateTransferStatus: (id: string, newStatus: ApiTransferStatus) => void;
}

export function useTransfers(options: UseTransfersOptions = {}): UseTransfersReturn {
  const {
    search = '',
    status = 'all',
    sourceLocationId = 'all',
    destinationLocationId = 'all',
    pageSize = 10,
  } = options;

  const [transfers, setTransfers] = useState<ApiTransfer[]>([]);
  const [locationsMap, setLocationsMap] = useState<
    Record<string, { name: string; fullPath: string; warehouseId?: string | null }>
  >({});
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchId = useRef(0);

  // Load locations metadata once to enrich list cards
  useEffect(() => {
    let isCancelled = false;
    locationsApi
      .list({ limit: 100 })
      .then((res) => {
        if (!isCancelled && res.data) {
          const map: Record<string, { name: string; fullPath: string; warehouseId?: string | null }> = {};
          res.data.forEach((loc) => {
            map[loc.id] = {
              name: loc.name,
              fullPath: loc.fullPath,
              warehouseId: loc.warehouseId,
            };
          });
          setLocationsMap(map);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  const fetchTransfers = useCallback(
    async (page: number) => {
      const id = ++fetchId.current;
      setIsLoading(true);
      setError(null);

      try {
        const apiStatus = status !== 'all' ? STATUS_MAP[status.toLowerCase()] : undefined;
        const apiSrcLoc = sourceLocationId !== 'all' ? sourceLocationId : undefined;
        const apiDstLoc = destinationLocationId !== 'all' ? destinationLocationId : undefined;

        const res = await transfersApi.list({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          status: apiStatus,
          sourceLocationId: apiSrcLoc,
          destinationLocationId: apiDstLoc,
        });

        if (id !== fetchId.current) return;

        setTransfers(res.data);
        setPagination(res.pagination || res.meta);
      } catch (err) {
        if (id !== fetchId.current) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load internal transfers. Please check your network connection.');
        }
      } finally {
        if (id === fetchId.current) {
          setIsLoading(false);
        }
      }
    },
    [search, status, sourceLocationId, destinationLocationId, pageSize]
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const delay = search ? 300 : 0;
    debounceTimer.current = setTimeout(() => {
      fetchTransfers(currentPage);
    }, delay);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchTransfers, currentPage, search]);

  const updateTransferStatus = useCallback((id: string, newStatus: ApiTransferStatus) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  }, []);

  const refetch = useCallback(() => {
    fetchTransfers(currentPage);
  }, [fetchTransfers, currentPage]);

  return {
    transfers,
    locationsMap,
    pagination,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    refetch,
    updateTransferStatus,
  };
}
