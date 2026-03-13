'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user, login, token } = useAuthStore();

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [email, setEmail] = useState(user?.email || '');

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
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err?.message || 'Error al cambiar contraseña');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const initials = `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mi Perfil</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Administra tu información personal
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* User info card */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-lg font-bold text-white">{initials}</span>
              </div>
              <div>
                <h3 className="text-base font-semibold">{user.nombre} {user.apellido}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex gap-1 mt-1.5">
                  {user.roles?.map((r) => (
                    <Badge key={r.role.name} variant="secondary" className="text-[10px]">{r.role.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit profile */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Información Personal</h3>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{success}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label>Apellido</Label>
                  <Input value={apellido} onChange={(e) => setApellido(e.target.value)} className="h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
              </div>
              <Button type="submit" className="h-11 font-medium" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Lock className="h-4 w-4 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Cambiar Contraseña</h3>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{pwSuccess}</div>
              )}
              <div className="space-y-1.5">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                  className="h-11"
                />
              </div>
              <Button type="submit" className="h-11 font-medium">Cambiar Contraseña</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
