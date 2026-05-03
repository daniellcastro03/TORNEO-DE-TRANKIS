import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, enterGuestMode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">⚽</span>
          <h1>TORNEITOS DE TRANKIS</h1>
          <p>Gestión de torneos eFootball</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          {error && (
            <div className="auth-error fade-in">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="auth-field">
            <input
              id="login-email"
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            <Mail size={18} className="field-icon" />
          </div>

          <div className="auth-field">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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

          <button
            type="submit"
            className={`btn btn-primary btn-block btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            id="login-submit"
          >
            Iniciar Sesión
          </button>

          <div className="auth-divider">o</div>

          <button
            type="button"
            className="btn btn-secondary btn-block btn-lg"
            onClick={() => {
              enterGuestMode();
              navigate('/');
            }}
          >
            Acceder como invitado
          </button>
        </form>

        <div className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link to="/registro">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
}
