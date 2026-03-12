'use client';

import { useState } from 'react';
import { Plus, UserCheck, UserX } from 'lucide-react';
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

  // New user form
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
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administración de usuarios y permisos</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive">Error al cargar usuarios</p>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No hay usuarios registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
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
                            <Badge key={r.role.id} variant="secondary" className="mr-1">
                              {r.role.name}
                            </Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="default">
                          <UserCheck className="mr-1 h-3 w-3" /> Activo
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <UserX className="mr-1 h-3 w-3" /> Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Apellido *</Label>
                <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="+52 55 1234 5678" />
              </div>
              <div className="space-y-2">
                <Label>Cédula profesional</Label>
                <Input value={cedula} onChange={(e) => setCedula(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar a{' '}
              <strong>{deleteTarget?.nombre} {deleteTarget?.apellido}</strong>?
              El usuario no podrá acceder al sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
