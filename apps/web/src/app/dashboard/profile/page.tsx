'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user, login, token } = useAuthStore();

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [email, setEmail] = useState(user?.email || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/users/${user.id}`, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
      });
      // Update local store
      if (token) {
        login(token, { ...user, nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim() });
      }
      setSuccess('Perfil actualizado correctamente');
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 6) {
      setPwError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden');
      return;
    }

    try {
      await api.put(`/users/${user?.id}`, {
        password: newPassword,
      });
      setPwSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err?.message || 'Error al cambiar contraseña');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Mi Perfil</h2>
        <p className="text-muted-foreground">
          Administra tu información personal
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* User info card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {user.nombre.charAt(0)}{user.apellido.charAt(0)}
                </span>
              </div>
              <div>
                <CardTitle>{user.nombre} {user.apellido}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex gap-1 mt-1">
                  {user.roles?.map((r) => (
                    <Badge key={r.role.name} variant="secondary">{r.role.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Edit profile */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
              )}
              {success && (
                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-700">{success}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-700">{pwSuccess}</div>
              )}
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                />
              </div>
              <Button type="submit">Cambiar Contraseña</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
