import type {
  CreateStoreInput,
  StorePlansResponse,
  StoreRecord,
  UpdateStoreInput
} from "@bazaarlink/contracts";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { useAuth } from "@/auth/provider";

import {
  createStore as createStoreRequest,
  getPlans,
  listStores,
  publishStore as publishStoreRequest,
  StoreApiError,
  updateStore as updateStoreRequest
} from "./api";

type StoreStateStatus = "idle" | "loading" | "ready" | "error";

interface StoreContextValue {
  status: StoreStateStatus;
  stores: StoreRecord[];
  currentStore: StoreRecord | null;
  plans: StorePlansResponse["plans"];
  error: StoreApiError | null;
  selectStore: (storeId: string) => void;
  refresh: () => Promise<void>;
  createStore: (input: CreateStoreInput) => Promise<StoreRecord>;
  updateStore: (
    storeId: string,
    input: UpdateStoreInput
  ) => Promise<StoreRecord>;
  publishStore: (storeId: string) => Promise<StoreRecord>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const {
    status: authStatus,
    sessionToken,
    refreshSession
  } = useAuth();

  const [status, setStatus] = useState<StoreStateStatus>("idle");
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [plans, setPlans] = useState<StorePlansResponse["plans"]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [error, setError] = useState<StoreApiError | null>(null);

  const refresh = useCallback(async () => {
    if (authStatus !== "signedIn" || !sessionToken) {
      setStores([]);
      setPlans([]);
      setCurrentStoreId(null);
      setError(null);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const [storeResponse, planResponse] = await Promise.all([
        listStores(sessionToken),
        getPlans(sessionToken)
      ]);

      setStores(storeResponse.stores);
      setPlans(planResponse.plans);
      setCurrentStoreId((current) => {
        if (
          current &&
          storeResponse.stores.some((store) => store.id === current)
        ) {
          return current;
        }

        return storeResponse.stores[0]?.id ?? null;
      });
      setStatus("ready");
    } catch (requestError) {
      const safeError =
        requestError instanceof StoreApiError
          ? requestError
          : new StoreApiError("service_unavailable");

      setError(safeError);
      setStatus("error");
    }
  }, [authStatus, sessionToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const replaceStore = useCallback((next: StoreRecord) => {
    setStores((current) => {
      const found = current.some((store) => store.id === next.id);

      return found
        ? current.map((store) => (store.id === next.id ? next : store))
        : [...current, next];
    });
    setCurrentStoreId(next.id);
  }, []);

  const createStore = useCallback(
    async (input: CreateStoreInput) => {
      if (!sessionToken) {
        throw new StoreApiError("invalid_session");
      }

      const created = await createStoreRequest(sessionToken, input);
      replaceStore(created);
      setStatus("ready");
      await refreshSession();
      return created;
    },
    [sessionToken, replaceStore, refreshSession]
  );

  const updateStore = useCallback(
    async (storeId: string, input: UpdateStoreInput) => {
      if (!sessionToken) {
        throw new StoreApiError("invalid_session");
      }

      const updated = await updateStoreRequest(
        sessionToken,
        storeId,
        input
      );
      replaceStore(updated);
      return updated;
    },
    [sessionToken, replaceStore]
  );

  const publishStore = useCallback(
    async (storeId: string) => {
      if (!sessionToken) {
        throw new StoreApiError("invalid_session");
      }

      const published = await publishStoreRequest(sessionToken, storeId);
      replaceStore(published);
      return published;
    },
    [sessionToken, replaceStore]
  );

  const currentStore = useMemo(
    () =>
      stores.find((store) => store.id === currentStoreId) ??
      stores[0] ??
      null,
    [stores, currentStoreId]
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      status,
      stores,
      currentStore,
      plans,
      error,
      selectStore: setCurrentStoreId,
      refresh,
      createStore,
      updateStore,
      publishStore
    }),
    [
      status,
      stores,
      currentStore,
      plans,
      error,
      refresh,
      createStore,
      updateStore,
      publishStore
    ]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStores() {
  const value = useContext(StoreContext);

  if (!value) {
    throw new Error("useStores must be used inside StoreProvider");
  }

  return value;
}

export function getStoreError(error: unknown): StoreApiError {
  return error instanceof StoreApiError
    ? error
    : new StoreApiError("service_unavailable");
}
