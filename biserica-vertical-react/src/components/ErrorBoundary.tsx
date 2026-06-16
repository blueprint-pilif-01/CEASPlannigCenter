import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { clearAuth } from '../utils/api';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private errorTimestamp: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 Error Boundary caught an error:', error, errorInfo);

    // Detect rapid repeated errors (possible infinite loop)
    const now = Date.now();
    const timeSinceLastError = now - this.errorTimestamp;

    if (timeSinceLastError < 1000) {
      // Multiple errors within 1 second
      this.setState(prevState => ({
        errorCount: prevState.errorCount + 1,
      }));

      if (this.state.errorCount > 3) {
        console.error('🔴 CRITICAL: Rapid repeated errors detected - possible infinite loop');

        // Clear everything and force reload
        alert(
          '⚠️ Eroare critică detectată\n\n' +
          'Aplicația va fi resetată.\n' +
          'Dacă problema persistă, șterge cache-ul browserului.'
        );

        // Clear auth and reload
        clearAuth();
        localStorage.clear();
        setTimeout(() => {
          window.location.href = '/planner/login';
        }, 1000);
      }
    }

    this.errorTimestamp = now;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: '#fff',
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
          }}>
            <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</h1>
            <h2 style={{ marginBottom: '20px' }}>Oops! Ceva nu a mers bine</h2>
            <p style={{ marginBottom: '30px', color: '#999' }}>
              {this.state.error?.message || 'A apărut o eroare neașteptată'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorCount: 0 });
                  window.location.href = '/planner/dashboard';
                }}
                style={{
                  padding: '12px 24px',
                  background: '#4CAF50',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Înapoi la Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                style={{
                  padding: '12px 24px',
                  background: '#f44336',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Șterge Cache & Reîncarcă
              </button>
            </div>
            {import.meta.env.DEV && (
              <details style={{ marginTop: '40px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#4CAF50' }}>
                  Detalii tehnice (development)
                </summary>
                <pre style={{
                  marginTop: '10px',
                  padding: '15px',
                  background: '#000',
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}>
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
