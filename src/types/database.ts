// ============================================================
// Supabase Database Types for "Torneitos de Trankis"
// Auto-generated structure matching the project schema
// ============================================================

export type TipoTorneo = 'champions' | 'mundial' | 'liga' | 'libre';
export type EstadoTorneo = 'borrador' | 'inscripciones' | 'en_curso' | 'finalizado';
export type EstadoPartido = 'pendiente' | 'en_curso' | 'finalizado';
export type FasePartido = 'grupos' | 'octavos' | 'cuartos' | 'semifinal' | 'tercer_puesto' | 'final';
export type EstadoInscripcion = 'pendiente' | 'confirmada' | 'rechazada';
export type TipoNotificacion = 'cruce' | 'grupo' | 'resultado' | 'recordatorio' | 'inscripciones' | 'equipo_confirmado';
export type RolUsuario = 'admin' | 'jugador';

export interface Jugador {
  id: string;
  nombre: string;
  foto_url: string | null;
  email: string;
  rol: RolUsuario;
  created_at: string;
}

export interface CatalogoEquipo {
  id: string;
  nombre: string;
  escudo_url: string | null;
  tipo_torneo: TipoTorneo;
  liga?: string | null;
}

export interface Equipo {
  id: string;
  nombre: string;
  escudo_url: string | null;
  jugador_id: string;
  created_at: string;
}

export interface Torneo {
  id: string;
  nombre: string;
  tipo: TipoTorneo;
  estado: EstadoTorneo;
  criterios_json: CriteriosClasificacion;
  max_jugadores: number;
  permite_cambio_equipo: boolean;
  created_by: string;
  fecha_inicio?: string | null;
  created_at: string;
}

export interface CriteriosClasificacion {
  orden: string[];
  puntos_victoria: number;
  puntos_empate: number;
  puntos_derrota: number;
  clasificados_por_grupo: number;
  hay_tercero_cuarto: boolean;
  ida_vuelta: boolean;                    // Fase de grupos: ¿ida y vuelta?
  partido_unico_eliminatorias: boolean;   // Fase eliminatoria: ¿partido único?
  fechas_habilitadas?: string[];          // Fechas/Jornadas que están abiertas para jugar
}

export interface TorneoInscripcion {
  id: string;
  torneo_id: string;
  jugador_id: string;
  catalogo_equipo_id: string;
  estado: EstadoInscripcion;
  created_at: string;
}

export interface Grupo {
  id: string;
  torneo_id: string;
  nombre: string;
}

export interface GrupoJugador {
  id: string;
  grupo_id: string;
  jugador_id: string;
}

export interface Partido {
  id: string;
  torneo_id: string;
  grupo_id: string | null;
  jugador_local_id: string;
  jugador_visitante_id: string;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: EstadoPartido;
  fase: FasePartido;
  fecha?: string | null;
  created_at: string;
}

export interface Notificacion {
  id: string;
  jugador_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  jugador_id: string;
  endpoint: string;
  keys_json: Record<string, string>;
}

export interface TrofeoSalonFama {
  id: string;
  jugador_id: string;
  torneo_id: string | null;
  titulo: string;
  descripcion: string | null;
  tipo_trofeo: string;
  created_at: string;
  jugador?: { nombre: string; foto_url: string | null };
  torneo?: { nombre: string };
}

// Supabase Database interface for typed client
export interface Database {
  public: {
    Tables: {
      jugadores: {
        Row: Jugador;
        Insert: any;
        Update: any;
      };
      catalogos_equipos: {
        Row: CatalogoEquipo;
        Insert: any;
        Update: any;
      };
      equipos: {
        Row: Equipo;
        Insert: any;
        Update: any;
      };
      torneos: {
        Row: Torneo;
        Insert: any;
        Update: any;
      };
      torneo_inscripciones: {
        Row: TorneoInscripcion;
        Insert: any;
        Update: any;
      };
      grupos: {
        Row: Grupo;
        Insert: any;
        Update: any;
      };
      grupo_jugadores: {
        Row: GrupoJugador;
        Insert: any;
        Update: any;
      };
      partidos: {
        Row: Partido;
        Insert: any;
        Update: any;
      };
      notificaciones: {
        Row: Notificacion;
        Insert: any;
        Update: any;
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: any;
        Update: any;
      };
      salon_fama: {
        Row: TrofeoSalonFama;
        Insert: any;
        Update: any;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tipo_torneo: TipoTorneo;
      estado_torneo: EstadoTorneo;
      estado_partido: EstadoPartido;
      fase_partido: FasePartido;
      estado_inscripcion: EstadoInscripcion;
      tipo_notificacion: TipoNotificacion;
      rol_usuario: RolUsuario;
    };
  };
}
