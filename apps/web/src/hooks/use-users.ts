import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  celular?: string;
  cedulaProfesional?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles?: { role: { id: string; name: string } }[];
}

export interface CreateUserData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  celular?: string;
  cedulaProfesional?: string;
  isActive?: boolean;
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserData) =>
      api.post<User>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateUserData> }) =>
      api.put<User>(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
