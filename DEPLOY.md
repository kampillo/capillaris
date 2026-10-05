# Deploy Guide — Capillaris

Stack:
- **Frontend** (Next.js 14) → **Vercel**
- **Backend** (NestJS 10) → **Railway**
- **Database** (PostgreSQL) → **Neon** (already migrated)
- Object storage (S3/R2): **deshabilitado por ahora** — uploads de imágenes no funcionarán hasta configurar `S3_*`. El resto del sistema sí funciona.

## Compilación de la librería compartida

`@capillaris/shared` expone JavaScript CommonJS y declaraciones desde `dist`, con objetivo ES2022 y Node >=20. No requiere carga de TypeScript en producción. `npm install` y `npm ci` ejecutan `prepare` en la raíz para compilarla; Turbo vuelve a construirla antes de API/web por su dependencia `^build`. Una instalación con `--ignore-scripts` necesita ejecutar explícitamente `npm run --workspace @capillaris/shared build` antes de tipos, tests o arranque.

Para validar el release, usar una instalación limpia con `npm ci --include=dev`, generar Prisma desde `apps/api/prisma/schema.prisma`, ejecutar `node --test scripts/tests/*.test.cjs` y `npm run build`. El comando de Railway sigue siendo `node apps/api/dist/src/main`. El build web descarga Instrument Serif de Google Fonts; requiere acceso a ese proveedor durante compilación. Confirmar la versión Node efectiva del servicio antes de publicar; el runtime local disponible para la comprobación aislada es Node 24.

---

## 0. Secrets a generar / tener listos

| Variable | Cómo obtenerlo |
|----------|----------------|
| `JWT_SECRET` | `openssl rand -base64 48` |
| `DATABASE_URL` | Neon dashboard → Connection string → Pooled |
| `GOOGLE_CLIENT_ID/SECRET` | Google Cloud Console (si usas Calendar) |

---

## 1. Backend en Railway

1. Crear proyecto nuevo en https://railway.app/new.
2. **Deploy from GitHub repo** → seleccionar el repo de Capillaris.
3. Service settings:
   - **Root directory:** dejar vacío (raíz del repo).
   - Railway detecta `railway.json` y aplica build/start commands.
4. **Variables** (Settings → Variables):

   ```env
   NODE_ENV=production
   PORT=3001
   # DATABASE_URL: referencia al secreto DATABASE_URL configurado en el entorno de despliegue.
   JWT_SECRET=<el secret generado>
   JWT_EXPIRATION=24h
   CORS_ORIGIN=https://capillaris-web.vercel.app
   # Google (opcional, si usan Calendar)
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_REDIRECT_URI=https://<railway-domain>/api/v1/google/callback
   ```

   > Object storage (S3/R2) deshabilitado por ahora — agregar `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION` cuando se quieran habilitar uploads.

5. Después del primer deploy, Railway expone una URL tipo `https://capillaris-api-production.up.railway.app`. Toma esa URL y úsala en Vercel (paso 2).

   En Settings → Networking → **Generate Domain** si no hay una.

6. Verifica el healthcheck: `https://<railway-url>/api/v1/health` debe devolver `{"status":"ok",...}`.

---

## 2. Frontend en Vercel

1. **Import Project** en https://vercel.com/new → seleccionar el mismo repo.
2. **Configure Project**:
   - **Framework Preset:** Next.js (auto-detectado).
   - **Root Directory:** `apps/web`.
   - **Build Command:** dejar default (`next build`).
   - **Install Command:** dejar default (Vercel maneja workspaces).
3. **Environment Variables**:

   ```env
   NEXT_PUBLIC_API_URL=https://<railway-domain>/api/v1
   ```

4. Deploy. Vercel dará una URL tipo `https://capillaris-web.vercel.app`.

---

## 3. Conectar los dos

Una vez tengas las dos URLs, **vuelve a Railway** y actualiza:

```env
CORS_ORIGIN=https://capillaris-web.vercel.app
```

(Reemplazando con tu URL real de Vercel). Railway hace redeploy automático.

> Cada origen del navegador, también previews de Vercel, debe aparecer de forma exacta en `CORS_ORIGIN`; se pueden separar varios orígenes con comas.

---

## 4. Smoke test

1. Abre la URL de Vercel.
2. Login con `suadmin@gmail.com` / la contraseña real.
3. Lista de pacientes (4,674) debe cargar.
4. Click en un paciente → ver sus consultas/procedimientos.
5. Reportes → KPIs deben mostrar volúmenes reales.
6. Revisar Network tab: las requests van a `https://<railway-domain>/api/v1/...`.

---

## 5. Cuando tengas el dominio (después)

DNS:
- `controlcapillaris.com` → CNAME a Vercel (`cname.vercel-dns.com`).
- `api.controlcapillaris.com` → CNAME a Railway (Railway lo dará al agregar custom domain).

Update env vars:
- En Vercel: `NEXT_PUBLIC_API_URL=https://api.controlcapillaris.com/api/v1`.
- En Railway: `CORS_ORIGIN=https://controlcapillaris.com`.
- Si usan Google: `GOOGLE_REDIRECT_URI=https://api.controlcapillaris.com/api/v1/google/callback` y actualizar redirect URIs en Google Cloud Console.

---

## Troubleshooting

- **CORS error en browser console**: `CORS_ORIGIN` en Railway no incluye la URL exacta de Vercel.
- **502/503 en Railway**: revisa logs de Railway. Si dice "prisma client not generated", el buildCommand falló — verifica que `npm ci` completó.
- **Login devuelve "credenciales inválidas"** y la contraseña es correcta: si la BD nunca pasó por el fix bcrypt prefix `$2y$ → $2a$`, los hashes no validan. El step 02 de migración ya lo corrige; si la BD venía de antes, correr el UPDATE manual:
  ```sql
  UPDATE users SET password_hash = '$2a$' || SUBSTRING(password_hash FROM 5) WHERE password_hash LIKE '$2y$%';
  ```
- **Cold start del backend Railway** (~3-5s primer request): normal en plan free. Plan Pro ($5) elimina sleep.
