<div align="center">

# 🏆 Torneitos de Trankis

**Plataforma completa de gestión de torneos de eFootball**  
Crea, administra y sigue en tiempo real torneos con fase de grupos y eliminatorias estilo Mundial FIFA.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=flat-square&logo=vercel)](https://vercel.com/)

</div>

---

## 📸 Vista General

> Plataforma tipo *Pro Clubs* pero para torneos locales de eFootball. Diseño oscuro con acento neón verde `#39FF14`, tipografía **Orbitron** para headings y **Outfit** para el cuerpo. Experiencia premium y responsiva desde móvil.

---

## ✨ Características principales

### 🎮 Para Jugadores
- **Registro e inicio de sesión** con email/contraseña (Supabase Auth)
- **Perfil personalizable** con foto de avatar (crop integrado)
- **Inscripción a torneos** — elige tu selección/equipo del catálogo
- **Mis partidos** — historial completo con estadísticas (PJ, PG, PE, PP, GF, GC)
- **Notificaciones en tiempo real** — cuando te asignan grupo, se genera un cruce o se registra un resultado
- **Salón de la Fama** — trofeos y logros permanentes de los campeones

### 🛡️ Para Administradores
- **Crear torneos** configurando:
  - Tipo: Champions League, Mundial, Liga específica, o Libre
  - Fase de grupos: ida y vuelta, puntos por victoria/empate, clasificados por grupo
  - Fase eliminatoria: partido único o ida y vuelta, partido por 3er/4to lugar
- **Gestión de inscripciones** — confirmar, rechazar o reactivar solicitudes
- **Sorteo de grupos automático** — distribución equitativa tipo Mundial con round-robin
- **Sistema de Jornadas** — habilitar/bloquear jornadas manualmente para controlar el ritmo
- **Registrar resultados** — con notificación automática a ambos jugadores
- **Generar eliminatoria** — cruces estilo Copa del Mundo (A1 vs B2, etc.)
- **Avanzar fases** — de Octavos → Cuartos → Semifinal → Final
- **Catálogo de equipos** — administrar escudos y equipos disponibles por tipo de torneo

---

## 🗂️ Flujo completo de un torneo

```
Borrador
   │ ← Admin abre inscripciones
Inscripciones
   │ ← Jugadores eligen su equipo
   │ ← Admin confirma/rechaza
   │ ← Admin sortea grupos
En Curso
   │
   ├─ Fase de Grupos ──────────────────────────────────
   │   Jornada 1 → Admin habilita → Jugadores juegan → Admin sube resultado
   │   Jornada 2 → ... (hasta completar todos los partidos)
   │
   ├─ Fase Eliminatoria ──────────────────────────────
   │   Octavos de Final (si hay ≥9 clasificados)
   │   Cuartos de Final
   │   Semifinal
   │   3er Puesto (opcional)
   │   Final 🏆
   │
Finalizado
   │ ← Admin registra campeón en Salón de la Fama
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Uso |
|---|---|---|
| **Frontend** | React 18 + TypeScript | UI y lógica de presentación |
| **Build Tool** | Vite 5 | Bundler ultrarrápido, HMR |
| **Estilos** | Vanilla CSS + Custom Properties | Sistema de diseño propio sin frameworks |
| **Routing** | React Router v6 | SPA con rutas protegidas |
| **Backend** | Supabase (PostgreSQL) | Base de datos, Auth, Storage, Realtime |
| **Realtime** | Supabase Channels | Actualizaciones en tiempo real por dispositivo |
| **Deploy** | Vercel | CI/CD automático desde GitHub |

### 🎨 Sistema de Diseño

- **Tema oscuro** por defecto (`#0A0A0A` bg + `#39FF14` neon) con soporte de **tema claro**
- **Tipografía**: [Orbitron](https://fonts.google.com/specimen/Orbitron) (headings) + [Outfit](https://fonts.google.com/specimen/Outfit) (body)
- **Glassmorphism** y micro-animaciones en cards y transiciones
- Diseño **mobile-first** totalmente responsivo

---

## 🗄️ Esquema de Base de Datos

```
jugadores          ─── auth.users (1:1)
torneos            ─── created_by → jugadores
torneo_inscripciones ─ torneo_id, jugador_id, catalogo_equipo_id
catalogos_equipos  ─── tipo_torneo, liga
grupos             ─── torneo_id
grupo_jugadores    ─── grupo_id, jugador_id
partidos           ─── torneo_id, grupo_id?, jugador_local_id, jugador_visitante_id
                       fase: grupos|octavos|cuartos|semifinal|tercer_puesto|final
notificaciones     ─── jugador_id
equipos            ─── jugador_id (1:1, equipo personal)
salon_fama         ─── jugador_id, torneo_id
```

Row Level Security (RLS) activado en todas las tablas. Los admins tienen políticas `FOR ALL`, los jugadores solo pueden gestionar sus propios datos.

---

## 🚀 Instalación y uso local

### Prerrequisitos
- Node.js ≥ 18
- Una cuenta en [Supabase](https://supabase.com/) (free tier funciona)

### 1. Clonar el repositorio

```bash
git clone https://github.com/daniellcastro03/TORNEO-DE-TRANKIS.git
cd TORNEO-DE-TRANKIS
npm install
```

### 2. Configurar Supabase

1. Crea un nuevo proyecto en [supabase.com](https://supabase.com/)
2. Ve al **SQL Editor** y ejecuta en orden:
   ```
   supabase/schema.sql              ← Tablas, ENUMs, índices, RLS
   supabase/schema_salon_fama.sql   ← Tabla salón de la fama
   supabase/storage_avatars.sql     ← Bucket para fotos de perfil
   supabase/storage_equipos.sql     ← Bucket para escudos de equipos
   supabase/seed_admin.sql          ← Usuario administrador inicial
   supabase/seed_equipos.sql        ← Catálogo de equipos (Champions, Mundial...)
   supabase/fix_fecha_partidos.sql  ← Fix columna fecha TEXT (IMPORTANTE)
   ```
3. En **Authentication → URL Configuration**, añade `http://localhost:5173` a las URLs permitidas.

### 3. Variables de entorno

Crea un archivo `.env` en la raíz (copia `.env.example`):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 4. Arrancar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## 📁 Estructura del proyecto

```
src/
├── components/
│   ├── AvatarCropModal.tsx     # Recorte de foto de perfil
│   ├── TeamSelector.tsx        # Selector de equipo del catálogo
│   └── Layout/                 # Navbar, sidebar, layout principal
├── context/
│   └── AuthContext.tsx         # Estado global de autenticación
├── hooks/
│   ├── useTorneos.ts           # CRUD torneos + inscripciones
│   ├── useGrupos.ts            # Grupos, clasificación, sorteo, round-robin
│   ├── useBracket.ts           # Lógica eliminatoria estilo Mundial
│   ├── useMisPartidos.ts       # Partidos y estadísticas del jugador
│   └── useNotificaciones.ts    # Sistema de notificaciones
├── pages/
│   ├── Admin/
│   │   ├── CrearTorneoPage.tsx       # Formulario de creación
│   │   ├── InscripcionesAdminPage.tsx # Gestión de inscripciones
│   │   ├── ResultadosPage.tsx        # Registro de resultados
│   │   └── JugadoresAdminPage.tsx    # Gestión de jugadores
│   ├── Torneos/
│   │   ├── TorneoDetallePage.tsx     # Vista detalle del torneo
│   │   ├── GruposSection.tsx         # Tabs con clasificación por grupo
│   │   └── BracketSection.tsx        # Bracket eliminatorio visual
│   └── ...
├── types/
│   └── database.ts             # Tipos TypeScript del esquema
└── lib/
    └── supabase.ts             # Cliente Supabase con DEVICE_ID
```

---

## ⚙️ Algoritmos clave

### Round-Robin (fase de grupos)
Implementación del **algoritmo de rotación circular** — fija al jugador 0 y rota el resto en cada jornada. Garantiza que cada par de jugadores se enfrente exactamente una vez (o dos, si se activa ida y vuelta).

### Sorteo estilo Mundial (fase eliminatoria)
- Los **primeros de cada grupo** nunca se cruzan entre sí en la primera ronda
- Los cruces siguen el patrón FIFA: A1 vs B2, B1 vs A2, C1 vs D2...
- Se incluyen los **mejores terceros** cuando el número de clasificados no es potencia de 2

### Clasificación en tiempo real
Tabla calculada **en cliente** con todos los partidos finalizados del grupo:
`Puntos → Diferencia de goles → Goles a favor → Enfrentamiento directo`

---

## 🔒 Seguridad

- **Row Level Security** en 100% de las tablas — ningún usuario puede leer/modificar datos de otro
- Tokens JWT gestionados por Supabase Auth
- Las políticas de admin verifican `rol = 'admin'` directamente en la tabla `jugadores`
- Storage con políticas de bucket separadas para avatares y escudos

---

## 📦 Deploy en Vercel

El repositorio está configurado para deploy automático. El archivo `vercel.json` incluye el rewrite necesario para SPA routing:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

---

## 🏅 Créditos

Desarrollado con ❤️ por **Daniel Castro** para la comunidad **Trankis eFootball**.

---

<div align="center">
  <sub>⚡ Powered by React · Supabase · Vite · Vercel</sub>
</div>
