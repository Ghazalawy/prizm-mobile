import { useState, useEffect, useCallback } from "react";

type UseApiResult<T> = {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useApi<T>(fetcher: () => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setIsError(true);
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, isError, error, refetch };
}
