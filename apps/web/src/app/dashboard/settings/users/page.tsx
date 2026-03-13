'use client';

import { useState } from 'react';
import { Plus, UserCheck, UserX, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useUsers,
  useCreateUser,
  useDeleteUser,
  type User,
} from '@/hooks/use-users';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function UsersManagementPage() {
  const [showNew, setShowNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [celular, setCelular] = useState('');
  const [cedula, setCedula] = useState('');
  const [formError, setFormError] = useState('');

  const { data: users, isLoading, error } = useUsers();
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();

  const handleCreate = async () => {
    setFormError('');
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !password) {
      setFormError('Nombre, apellido, email y contraseña son requeridos');
      return;
    }
    try {
      await createMutation.mutateAsync({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        password,
        celular: celular.trim() || undefined,
        cedulaProfesional: cedula.trim() || undefined,
      });
      setShowNew(false);
      setNombre('');
      setApellido('');
      setEmail('');
      setPassword('');
      setCelular('');
      setCedula('');
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear usuario');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Administración de usuarios y permisos</p>
        </div>
        <Button className="h-10 font-medium shadow-sm" onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">Error al cargar usuarios</p>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No hay usuarios registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Nombre</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Cédula</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Roles</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Creado</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-accent/50 transition-colors">
                    <TableCell className="font-medium">
                      {user.nombre} {user.apellido}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.cedulaProfesional || '—'}
                    </TableCell>
                    <TableCell>
                      {user.roles?.length
                        ? user.roles.map((r) => (
                            <Badge key={r.role.id} variant="secondary" className="mr-1 text-[10px]">
                              {r.role.name}
                            </Badge>
                          ))
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                          <UserCheck className="h-3 w-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 border-red-200">
                          <UserX className="h-3 w-3" /> Inactivo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(user)}
                      >
                        Desactivar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New User Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre <span className="text-destructive">*</span></Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido <span className="text-destructive">*</span></Label>
                <Input value={apellido} onChange={(e) => setApellido(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña <span className="text-destructive">*</span></Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Celular</Label>
                <Input value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="+52 55 1234 5678" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Cédula profesional</Label>
                <Input value={cedula} onChange={(e) => setCedula(e.target.value)} className="h-11" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar a{' '}
              <strong>{deleteTarget?.nombre} {deleteTarget?.apellido}</strong>?
              El usuario no podrá acceder al sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Desactivando...' : 'Desactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
