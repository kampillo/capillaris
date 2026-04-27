import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse } from './use-patients';

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface StockBalance {
  id: string;
  productId: string;
  currentQuantity: number;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  categoryId?: string;
  content?: number;
  unit?: string;
  unitPrice?: number;
  isMedicine: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
  minStockAlert: number;
  createdAt: string;
  updatedAt: string;
  category?: ProductCategory;
  stockBalance?: StockBalance;
}

export interface StockMovement {
  id: string;
  productId: string;
  movementType: string;
  reason: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  product?: Product;
}

export interface CreateProductData {
  name: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  content?: number;
  unit?: string;
  unitPrice?: number;
  isMedicine?: boolean;
  requiresPrescription?: boolean;
  minStockAlert?: number;
  initialStock?: number;
  initialStockReason?: string;
}

export interface CreateStockMovementData {
  productId: string;
  movementType: string;
  reason: string;
  quantity: number;
  notes?: string;
}

export function useProducts(
  page = 1,
  pageSize = 20,
  filters: { isMedicine?: boolean } = {},
) {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };
  if (filters.isMedicine !== undefined) {
    params.isMedicine = String(filters.isMedicine);
  }
  return useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', page, pageSize, filters],
    queryFn: () => api.get('/products', { params }),
  });
}

/** Convenience hook: fetches all medicines (active products with isMedicine=true). */
export function useMedicines() {
  return useQuery<Product[]>({
    queryKey: ['products', 'medicines'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Product>>('/products', {
        params: { page: '1', pageSize: '500', isMedicine: 'true' },
      });
      return res.data.filter((p) => p.isActive);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductData) =>
      api.post<Product>('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductData> }) =>
      api.put<Product>(`/products/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Inventory / Stock
export interface InventoryBalance {
  id: string;
  productId: string;
  currentQuantity: number;
  product: Product;
}

export function useInventoryBalances(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<InventoryBalance>>({
    queryKey: ['inventory', page, pageSize],
    queryFn: () =>
      api.get('/inventory', {
        params: { page: String(page), pageSize: String(pageSize) },
      }),
  });
}

export function useLowStock() {
  return useQuery<InventoryBalance[]>({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => api.get('/inventory/low-stock'),
  });
}

export function useStockMovements(productId: string, page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<StockMovement>>({
    queryKey: ['inventory', 'movements', productId, page, pageSize],
    queryFn: () =>
      api.get(`/inventory/movements/${productId}`, {
        params: { page: String(page), pageSize: String(pageSize) },
      }),
    enabled: !!productId,
  });
}

export function useAllMovements(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<StockMovement>>({
    queryKey: ['inventory', 'movements', 'all', page, pageSize],
    queryFn: () =>
      api.get('/inventory/movements', {
        params: { page: String(page), pageSize: String(pageSize) },
      }),
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStockMovementData) =>
      api.post<StockMovement>('/inventory/movements', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
    },
  });
}
