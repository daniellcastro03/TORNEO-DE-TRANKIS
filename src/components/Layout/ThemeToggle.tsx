import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="btn btn-ghost btn-sm theme-toggle"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{ padding: '0.4rem', borderRadius: '50%' }}
      aria-label="Toggle theme"
      id="btn-theme-toggle"
    >
      {theme === 'dark'
        ? <Sun size={18} style={{ color: '#FFB800' }} />
        : <Moon size={18} style={{ color: '#4B5563' }} />
      }
    </button>
  );
}
