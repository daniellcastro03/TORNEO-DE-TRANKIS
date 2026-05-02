import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', backgroundColor: '#111', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ff3333' }}>Algo salió mal en la aplicación.</h1>
          <p>Por favor, envía una captura de pantalla de este error al desarrollador:</p>
          <pre style={{ backgroundColor: '#222', padding: '1rem', overflow: 'auto', borderRadius: '4px', fontSize: '12px' }}>
            {this.state.error?.message}
            <br />
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            style={{ padding: '10px 20px', background: '#00ff00', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}
          >
            Limpiar Datos y Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
