import type {
  CatalogCategoryRecord,
  CatalogProductRecord,
  CatalogUsage,
  CreateCategoryInput,
  CreateProductImageInput,
  CreateProductInput,
  CreateProductVariantInput,
  InventoryAdjustmentInput,
  InventoryLowStockItem,
  InventoryMovementRecord,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateProductVariantInput
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
import { useStores } from "@/store/provider";

import {
  addImage as addImageRequest,
  addVariant as addVariantRequest,
  adjustInventory as adjustInventoryRequest,
  CatalogApiError,
  categoryAction,
  createCategory as createCategoryRequest,
  createProduct as createProductRequest,
  deleteImage as deleteImageRequest,
  deleteVariant as deleteVariantRequest,
  getProduct as getProductRequest,
  inventoryHistory as inventoryHistoryRequest,
  listCategories,
  lowStockInventory,
  listProducts,
  productAction,
  updateCategory as updateCategoryRequest,
  updateProduct as updateProductRequest,
  updateVariant as updateVariantRequest
} from "./api";

type CatalogStatus = "idle" | "loading" | "ready" | "error";

interface CatalogContextValue {
  status: CatalogStatus;
  categories: CatalogCategoryRecord[];
  products: CatalogProductRecord[];
  usage: CatalogUsage | null;
  lowStockItems: InventoryLowStockItem[];
  hasMore: boolean;
  loadingMore: boolean;
  error: CatalogApiError | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  getProduct: (productId: string) => Promise<CatalogProductRecord>;
  createCategory: (input: CreateCategoryInput) => Promise<CatalogCategoryRecord>;
  updateCategory: (
    categoryId: string,
    input: UpdateCategoryInput
  ) => Promise<CatalogCategoryRecord>;
  archiveCategory: (categoryId: string) => Promise<CatalogCategoryRecord>;
  restoreCategory: (categoryId: string) => Promise<CatalogCategoryRecord>;
  createProduct: (input: CreateProductInput) => Promise<CatalogProductRecord>;
  updateProduct: (
    productId: string,
    input: UpdateProductInput
  ) => Promise<CatalogProductRecord>;
  archiveProduct: (productId: string) => Promise<CatalogProductRecord>;
  restoreProduct: (productId: string) => Promise<CatalogProductRecord>;
  publishProduct: (productId: string) => Promise<CatalogProductRecord>;
  addImage: (
    productId: string,
    input: CreateProductImageInput
  ) => Promise<CatalogProductRecord>;
  deleteImage: (
    productId: string,
    imageId: string
  ) => Promise<CatalogProductRecord>;
  addVariant: (
    productId: string,
    input: CreateProductVariantInput
  ) => Promise<CatalogProductRecord>;
  updateVariant: (
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput
  ) => Promise<CatalogProductRecord>;
  deleteVariant: (
    productId: string,
    variantId: string
  ) => Promise<CatalogProductRecord>;
  adjustInventory: (
    productId: string,
    input: InventoryAdjustmentInput
  ) => Promise<CatalogProductRecord>;
  inventoryHistory: (productId: string) => Promise<InventoryMovementRecord[]>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);
const PAGE_SIZE = 20;

export function CatalogProvider({ children }: PropsWithChildren) {
  const { status: authStatus, sessionToken } = useAuth();
  const { currentStore } = useStores();

  const [status, setStatus] = useState<CatalogStatus>("idle");
  const [categories, setCategories] = useState<CatalogCategoryRecord[]>([]);
  const [products, setProducts] = useState<CatalogProductRecord[]>([]);
  const [usage, setUsage] = useState<CatalogUsage | null>(null);
  const [lowStockItems, setLowStockItems] = useState<InventoryLowStockItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<CatalogApiError | null>(null);

  const credentials = useCallback(() => {
    if (!sessionToken || !currentStore) {
      throw new CatalogApiError("invalid_session");
    }

    return {
      token: sessionToken,
      storeId: currentStore.id
    };
  }, [sessionToken, currentStore]);

  const replaceProduct = useCallback((next: CatalogProductRecord) => {
    setProducts((current) => {
      const found = current.some((product) => product.id === next.id);
      return found
        ? current.map((product) => (product.id === next.id ? next : product))
        : [next, ...current];
    });
  }, []);

  const refresh = useCallback(async () => {
    if (authStatus !== "signedIn" || !sessionToken || !currentStore) {
      setCategories([]);
      setProducts([]);
      setUsage(null);
      setLowStockItems([]);
      setHasMore(false);
      setError(null);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const [categoryResponse, productResponse, lowStockResponse] =
        await Promise.all([
          listCategories(sessionToken, currentStore.id),
          listProducts(sessionToken, currentStore.id, 0, PAGE_SIZE),
          lowStockInventory(sessionToken, currentStore.id)
        ]);

      setCategories(categoryResponse.categories);
      setProducts(productResponse.products);
      setUsage(productResponse.usage);
      setLowStockItems(lowStockResponse.items);
      setHasMore(productResponse.pageInfo.hasMore);
      setStatus("ready");
    } catch (requestError) {
      const safeError =
        requestError instanceof CatalogApiError
          ? requestError
          : new CatalogApiError("service_unavailable");

      setError(safeError);
      setStatus("error");
    }
  }, [authStatus, sessionToken, currentStore]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    const { token, storeId } = credentials();
    setLoadingMore(true);

    try {
      const response = await listProducts(
        token,
        storeId,
        products.length,
        PAGE_SIZE
      );

      setProducts((current) => {
        const known = new Set(current.map((product) => product.id));
        return [
          ...current,
          ...response.products.filter((product) => !known.has(product.id))
        ];
      });
      setUsage(response.usage);
      setHasMore(response.pageInfo.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [credentials, hasMore, loadingMore, products.length]);

  const getProduct = useCallback(
    async (productId: string) => {
      const { token, storeId } = credentials();
      const product = await getProductRequest(token, storeId, productId);
      replaceProduct(product);
      return product;
    },
    [credentials, replaceProduct]
  );

  const createCategory = useCallback(
    async (input: CreateCategoryInput) => {
      const { token, storeId } = credentials();
      const category = await createCategoryRequest(token, storeId, input);
      setCategories((current) => [...current, category]);
      await refresh();
      return category;
    },
    [credentials, refresh]
  );

  const updateCategory = useCallback(
    async (categoryId: string, input: UpdateCategoryInput) => {
      const { token, storeId } = credentials();
      const category = await updateCategoryRequest(
        token,
        storeId,
        categoryId,
        input
      );
      setCategories((current) =>
        current.map((item) => (item.id === category.id ? category : item))
      );
      return category;
    },
    [credentials]
  );

  const mutateCategoryStatus = useCallback(
    async (categoryId: string, action: "archive" | "restore") => {
      const { token, storeId } = credentials();
      const category = await categoryAction(
        token,
        storeId,
        categoryId,
        action
      );
      setCategories((current) =>
        current.map((item) => (item.id === category.id ? category : item))
      );
      await refresh();
      return category;
    },
    [credentials, refresh]
  );

  const createProduct = useCallback(
    async (input: CreateProductInput) => {
      const { token, storeId } = credentials();
      const product = await createProductRequest(token, storeId, input);
      replaceProduct(product);
      await refresh();
      return product;
    },
    [credentials, refresh, replaceProduct]
  );

  const updateProduct = useCallback(
    async (productId: string, input: UpdateProductInput) => {
      const { token, storeId } = credentials();
      const product = await updateProductRequest(
        token,
        storeId,
        productId,
        input
      );
      replaceProduct(product);
      await refresh();
      return product;
    },
    [credentials, refresh, replaceProduct]
  );

  const mutateProductStatus = useCallback(
    async (
      productId: string,
      action: "archive" | "restore" | "publish"
    ) => {
      const { token, storeId } = credentials();
      const product = await productAction(
        token,
        storeId,
        productId,
        action
      );
      replaceProduct(product);
      await refresh();
      return product;
    },
    [credentials, refresh, replaceProduct]
  );

  const addImage = useCallback(
    async (productId: string, input: CreateProductImageInput) => {
      const { token, storeId } = credentials();
      const product = await addImageRequest(
        token,
        storeId,
        productId,
        input
      );
      replaceProduct(product);
      return product;
    },
    [credentials, replaceProduct]
  );

  const deleteImage = useCallback(
    async (productId: string, imageId: string) => {
      const { token, storeId } = credentials();
      const product = await deleteImageRequest(
        token,
        storeId,
        productId,
        imageId
      );
      replaceProduct(product);
      return product;
    },
    [credentials, replaceProduct]
  );

  const addVariant = useCallback(
    async (productId: string, input: CreateProductVariantInput) => {
      const { token, storeId } = credentials();
      const product = await addVariantRequest(
        token,
        storeId,
        productId,
        input
      );
      replaceProduct(product);
      await refresh();
      return product;
    },
    [credentials, refresh, replaceProduct]
  );

  const updateVariant = useCallback(
    async (
      productId: string,
      variantId: string,
      input: UpdateProductVariantInput
    ) => {
      const { token, storeId } = credentials();
      const product = await updateVariantRequest(
        token,
        storeId,
        productId,
        variantId,
        input
      );
      replaceProduct(product);
      await refresh();
      return product;
    },
    [credentials, refresh, replaceProduct]
  );

  const deleteVariant = useCallback(
    async (productId: string, variantId: string) => {
      const { token, storeId } = credentials();
      const product = await deleteVariantRequest(
        token,
        storeId,
        productId,
        variantId
      );
      replaceProduct(product);
      await refresh();
      return product;
    },
    [credentials, refresh, replaceProduct]
  );

  const adjustInventory = useCallback(
    async (productId: string, input: InventoryAdjustmentInput) => {
      const { token, storeId } = credentials();
      const product = await adjustInventoryRequest(
        token,
        storeId,
        productId,
        input
      );
      replaceProduct(product);
      await refresh();
      return product;
    },
    [credentials, refresh, replaceProduct]
  );

  const inventoryHistory = useCallback(
    async (productId: string) => {
      const { token, storeId } = credentials();
      const response = await inventoryHistoryRequest(
        token,
        storeId,
        productId
      );
      return response.movements;
    },
    [credentials]
  );

  const value = useMemo<CatalogContextValue>(
    () => ({
      status,
      categories,
      products,
      usage,
      lowStockItems,
      hasMore,
      loadingMore,
      error,
      refresh,
      loadMore,
      getProduct,
      createCategory,
      updateCategory,
      archiveCategory: (categoryId) =>
        mutateCategoryStatus(categoryId, "archive"),
      restoreCategory: (categoryId) =>
        mutateCategoryStatus(categoryId, "restore"),
      createProduct,
      updateProduct,
      archiveProduct: (productId) =>
        mutateProductStatus(productId, "archive"),
      restoreProduct: (productId) =>
        mutateProductStatus(productId, "restore"),
      publishProduct: (productId) =>
        mutateProductStatus(productId, "publish"),
      addImage,
      deleteImage,
      addVariant,
      updateVariant,
      deleteVariant,
      adjustInventory,
      inventoryHistory
    }),
    [
      status,
      categories,
      products,
      usage,
      lowStockItems,
      hasMore,
      loadingMore,
      error,
      refresh,
      loadMore,
      getProduct,
      createCategory,
      updateCategory,
      mutateCategoryStatus,
      createProduct,
      updateProduct,
      mutateProductStatus,
      addImage,
      deleteImage,
      addVariant,
      updateVariant,
      deleteVariant,
      adjustInventory,
      inventoryHistory
    ]
  );

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const value = useContext(CatalogContext);

  if (!value) {
    throw new Error("useCatalog must be used inside CatalogProvider");
  }

  return value;
}

export function getCatalogError(error: unknown): CatalogApiError {
  return error instanceof CatalogApiError
    ? error
    : new CatalogApiError("service_unavailable");
}
