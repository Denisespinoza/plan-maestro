# CEO MODELTEX - Centro de Operaciones Modeltex

Sistema de gestión integral para Modeltex con módulos de pedidos, clientes, inventario, biblioteca de moldes, catálogo interno y personal.

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Vercel](https://vercel.com) (para deploy)

## Configuración Local

1. Clonar el repositorio

```bash
git clone <repository-url>
cd <project-folder>
```

2. Instalar dependencias

```bash
npm install
```

3. Crear archivo `.env` basado en `.env.example`

```bash
cp .env.example .env
```

4. Configurar variables de entorno en `.env`

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

5. Iniciar servidor de desarrollo

```bash
npm run dev
```

## Deploy en Vercel

### Paso 1: Obtener credenciales de Supabase

1. Ingresá a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccioná tu proyecto (o creá uno nuevo)
3. Andá a **Settings** (icono de engranaje) > **API**
4. Copiá los siguientes valores:
   - **Project URL** (ejemplo: `https://xyzabc123.supabase.co`)
   - **anon public** key (clave pública anónima)

### Paso 2: Configurar variables en Vercel

1. Ingresá a [Vercel Dashboard](https://vercel.com)
2. Seleccioná tu proyecto (o importá este repositorio)
3. Andá a **Settings** > **Environment Variables**
4. Agregá las siguientes variables:

| Nombre | Valor | Ambiente |
|--------|-------|----------|
| `VITE_SUPABASE_URL` | `https://tu-proyecto.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `tu-clave-anon-publica` | Production, Preview, Development |

5. Hacé clic en **Save**

### Paso 3: Desplegar

Si el proyecto ya estaba desplegado:

1. Andá a la pestaña **Deployments**
2. Buscá el último deployment
3. Hacé clic en los **tres puntos (...)** > **Redeploy**
4. Confirmá el redeploy

Si es un proyecto nuevo:

1. Hacé clic en **Import Project**
2. Conectá tu repositorio de Git
3. Vercel detectará automáticamente que es un proyecto Vite
4. Las variables de entorno se aplicarán automáticamente

### Verificar el deploy

- Abrí la URL de tu proyecto en Vercel
- La app debería iniciar sin pantalla blanca
- Si ves un error de configuración, verificá que las variables estén correctas

## Módulos incluidos

- **Dashboard**: Vista general con métricas y accesos rápidos
- **Pedidos**: Gestión completa de pedidos con estados y seguimiento
- **Clientes**: Base de datos de clientes con contactos y WhatsApp
- **Inventario**: Control de modelos y stock
- **Biblioteca**: Biblioteca de moldes digitales
- **Catálogo Interno**: Catálogo de productos con fotos
- **Personal**: Gestión de empleados, asistencia y pagos
- **Finanzas**: Control de pagos y facturación

## Tecnologías

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage)
- Lucide React (iconos)

## Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run preview   # Vista previa del build
npm run lint      # Linter ESLint
npm run typecheck # Verificación de tipos TypeScript
```

## Solución de problemas

### Pantalla blanca al abrir la app

**Causa**: Faltan variables de entorno de Supabase.

**Solución**:
1. Verificá que las variables estén configuradas en Vercel
2. Asegurate de que los nombres sean exactamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. Redesplegá el proyecto después de agregar las variables

### Error de conexión a Supabase

**Causa**: Credenciales incorrectas o proyecto pausado.

**Solución**:
1. Verificá que la URL y la key sean correctas en Supabase Dashboard
2. Asegurate de que el proyecto no esté pausado en Supabase
3. Verificá que la key sea la **anon public** y no la service_role

### Las imágenes no se cargan

**Causa**: Storage buckets no configurados.

**Solución**:
1. En Supabase Dashboard, andá a Storage
2. Verificá que existan los buckets: `catalog-images`, `mold-files`, `order-files`
3. Verificá que las políticas de acceso estén configuradas

## Seguridad

- La clave `anon public` de Supabase está diseñada para ser expuesta en el frontend
- Nunca uses la clave `service_role` en el frontend
- Las políticas RLS (Row Level Security) protegen los datos en la base de datos
- Siempre validá permisos en el backend si agregás funcionalidades críticas

## Licencia

Privado - Uso interno Modeltex
