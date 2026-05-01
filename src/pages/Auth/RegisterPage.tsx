import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import './Auth.css';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, nombre.trim());

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.needsConfirmation) {
      setNeedsConfirmation(true);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    }
  };

  // Email confirmation screen
  if (needsConfirmation) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="fade-in">
            <Mail size={64} color="var(--color-neon)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: 'var(--color-neon)', marginBottom: '0.5rem' }}>Revisa tu correo</h2>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Hemos enviado un enlace de confirmación a<br />
              <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Haz click en el enlace del correo para activar tu cuenta.<br />
              Después podrás iniciar sesión.
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Ir a Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="fade-in">
            <CheckCircle2 size={64} color="var(--color-neon)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: 'var(--color-neon)', marginBottom: '0.5rem' }}>¡Cuenta creada!</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Bienvenido a Torneitos de Trankis. Redirigiendo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⚽</span>
          <h1>CREAR CUENTA</h1>
          <p>Únete a los torneos de eFootball</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          {error && (
            <div className="auth-error fade-in">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="auth-field">
            <input
              id="register-nombre"
              type="text"
              placeholder="Tu nombre de jugador"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoFocus
              minLength={2}
              maxLength={50}
            />
            <User size={18} className="field-icon" />
          </div>

          <div className="auth-field">
            <input
              id="register-email"
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Mail size={18} className="field-icon" />
          </div>

          <div className="auth-field">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
            <Lock size={18} className="field-icon" />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="auth-field">
            <input
              id="register-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
            <Lock size={18} className="field-icon" />
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-block btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            id="register-submit"
          >
            Crear Cuenta
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
