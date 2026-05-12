'use client';

import { useEffect, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useReactivateUser,
  type User,
} from '@/hooks/use-users';
import { useRoles } from '@/hooks/use-roles';
import { useRequireRole } from '@/hooks/use-has-role';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function UsersManagementPage() {
  const authorized = useRequireRole('admin');
  const [showNew, setShowNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [celular, setCelular] = useState('');
  const [cedula, setCedula] = useState('');
  const [roleId, setRoleId] = useState('');
  const [formError, setFormError] = useState('');

  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCelular, setEditCelular] = useState('');
  const [editCedula, setEditCedula] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editError, setEditError] = useState('');

  const { data: users, isLoading, error } = useUsers();
  const { data: roles } = useRoles();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const reactivateMutation = useReactivateUser();

  const filteredUsers = (users ?? []).filter((u) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return u.isActive;
    return !u.isActive;
  });
  const activeCount = (users ?? []).filter((u) => u.isActive).length;
  const inactiveCount = (users ?? []).filter((u) => !u.isActive).length;

  useEffect(() => {
    if (!editTarget) return;
    setEditNombre(editTarget.nombre);
    setEditApellido(editTarget.apellido);
    setEditEmail(editTarget.email);
    setEditCelular(editTarget.celular ?? '');
    setEditCedula(editTarget.cedulaProfesional ?? '');
    setEditRoleId(editTarget.roles[0]?.id ?? '');
    setEditError('');
  }, [editTarget]);

  const resetForm = () => {
    setNombre('');
    setApellido('');
    setEmail('');
    setPassword('');
    setCelular('');
    setCedula('');
    setRoleId('');
    setFormError('');
  };

  const handleCreate = async () => {
    setFormError('');
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !password) {
      setFormError('Nombre, apellido, email y contraseña son requeridos');
      return;
    }
    if (!roleId) {
      setFormError('Debes seleccionar un rol');
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
        roleId,
      });
      setShowNew(false);
      resetForm();
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear usuario');
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditError('');
    if (!editNombre.trim() || !editApellido.trim() || !editEmail.trim()) {
      setEditError('Nombre, apellido y email son requeridos');
      return;
    }
    if (!editRoleId) {
      setEditError('Debes seleccionar un rol');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        data: {
          nombre: editNombre.trim(),
          apellido: editApellido.trim(),
          email: editEmail.trim(),
          celular: editCelular.trim() || undefined,
          cedulaProfesional: editCedula.trim() || undefined,
          roleId: editRoleId,
        },
      });
      setEditTarget(null);
    } catch (err: any) {
      setEditError(err?.message || 'Error al actualizar usuario');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleReactivate = async () => {
    if (!reactivateTarget) return;
    await reactivateMutation.mutateAsync(reactivateTarget.id);
    setReactivateTarget(null);
  };

  if (!authorized) return null;

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

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {(
          [
            { value: 'active', label: 'Activos', count: activeCount },
            { value: 'inactive', label: 'Inactivos', count: inactiveCount },
            { value: 'all', label: 'Todos', count: (users ?? []).length },
          ] as { value: StatusFilter; label: string; count: number }[]
        ).map((t) => {
          const active = statusFilter === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatusFilter(t.value)}
              className={
                '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors ' +
                (active
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground')
              }
            >
              {t.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                {t.count}
              </span>
            </button>
          );
        })}
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
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'inactive'
                  ? 'No hay usuarios inactivos'
                  : 'No hay usuarios registrados'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Nombre</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Cédula</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Rol</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Creado</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className={
                      'hover:bg-accent/50 transition-colors ' +
                      (user.isActive ? '' : 'opacity-60')
                    }
                  >
                    <TableCell className="font-medium">
                      {user.nombre} {user.apellido}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.cedulaProfesional || '—'}
                    </TableCell>
                    <TableCell>
                      {user.roles.length > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {user.roles[0].displayName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
                        className="h-8 text-xs"
                        onClick={() => setEditTarget(user)}
                      >
                        Editar
                      </Button>
                      {user.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-emerald-700 hover:text-emerald-700"
                          onClick={() => setReactivateTarget(user)}
                        >
                          Reactivar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New User Dialog */}
      <Dialog
        open={showNew}
        onOpenChange={(open) => {
          setShowNew(open);
          if (!open) resetForm();
        }}
      >
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
            <div className="space-y-1.5">
              <Label>Rol <span className="text-destructive">*</span></Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              {editTarget?.nombre} {editTarget?.apellido}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre <span className="text-destructive">*</span></Label>
                <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido <span className="text-destructive">*</span></Label>
                <Input value={editApellido} onChange={(e) => setEditApellido(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol <span className="text-destructive">*</span></Label>
              <Select value={editRoleId} onValueChange={setEditRoleId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Celular</Label>
                <Input value={editCelular} onChange={(e) => setEditCelular(e.target.value)} placeholder="+52 55 1234 5678" className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Cédula profesional</Label>
                <Input value={editCedula} onChange={(e) => setEditCedula(e.target.value)} className="h-11" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar a{' '}
              <strong>{deleteTarget?.nombre} {deleteTarget?.apellido}</strong>?
              El usuario no podrá acceder al sistema. Podrás reactivarlo más adelante.
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

      {/* Reactivate Dialog */}
      <Dialog open={!!reactivateTarget} onOpenChange={() => setReactivateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reactivar Usuario</DialogTitle>
            <DialogDescription>
              ¿Reactivar a{' '}
              <strong>{reactivateTarget?.nombre} {reactivateTarget?.apellido}</strong>?
              Podrá iniciar sesión nuevamente con sus credenciales anteriores.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReactivateTarget(null)}>Cancelar</Button>
            <Button onClick={handleReactivate} disabled={reactivateMutation.isPending}>
              {reactivateMutation.isPending ? 'Reactivando...' : 'Reactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
