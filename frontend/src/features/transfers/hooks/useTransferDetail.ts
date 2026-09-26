/**
 * useTransferDetail Hook
 *
 * Handles fetching, status mutation, cancellation, and validation
 * for a single internal transfer document.
 */
import { useState, useEffect, useCallback } from 'react';
import { transfersApi } from '../api';
import type { ApiTransfer } from '../types';
import { ApiError } from '../../../lib/apiClient';

export interface UseTransferDetailReturn {
  transfer: ApiTransfer | null;
  isLoading: boolean;
  isProcessing: boolean;
  isCancelling: boolean;
  isValidating: boolean;
  error: string | null;
  isNotFound: boolean;
  refetch: () => Promise<void>;
  processTransfer: () => Promise<boolean>;
  validateTransfer: () => Promise<boolean>;
  cancelTransfer: () => Promise<boolean>;
}

export function useTransferDetail(id?: string): UseTransferDetailReturn {
  const [transfer, setTransfer] = useState<ApiTransfer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(id));
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const res = await transfersApi.getById(id);
      setTransfer(res.data);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setIsNotFound(true);
        setError('Transfer movement order not found.');
      } else {
        setError(err?.message || 'Failed to load transfer details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const validateTransfer = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setIsValidating(true);
    setError(null);

    try {
      const res = await transfersApi.validate(id);
      if (res.data && 'transfer' in res.data && res.data.transfer) {
        setTransfer(res.data.transfer);
      } else {
        await fetchDetail();
      }
      return true;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to validate internal transfer.';
      setError(msg);
      throw err;
    } finally {
      setIsValidating(false);
    }
  }, [id, fetchDetail]);

  const processTransfer = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await transfersApi.process(id);
      setTransfer(res.data);
      return true;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to process internal transfer.';
      setError(msg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [id]);

  const cancelTransfer = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    setIsCancelling(true);
    setError(null);

    try {
      const res = await transfersApi.cancel(id);
      setTransfer(res.data);
      return true;
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to cancel internal transfer.';
      setError(msg);
      throw err;
    } finally {
      setIsCancelling(false);
    }
  }, [id]);

  return {
    transfer,
    isLoading,
    isProcessing,
    isCancelling,
    isValidating,
    error,
    isNotFound,
    refetch: fetchDetail,
    processTransfer,
    validateTransfer,
    cancelTransfer,
  };
}
