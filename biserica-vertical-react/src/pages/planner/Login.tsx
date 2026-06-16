import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall, setAuth, isAuthenticated, API_BASE_URL } from '../../utils/api';

export default function PlannerLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthenticated()) {
      navigate('/planner/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (data.error) {
        throw new Error(data.error);
      }

      // Check if user needs to change password
      if (data.forcePasswordChange) {
        setTempToken(data.token);
        setShowPasswordChange(true);
        setLoading(false);
      } else {
        // Save auth data
        setAuth(data.token, data.user);

        // Redirect to dashboard
        navigate('/planner/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la conectare. Verifică datele și încearcă din nou.');
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    if (newPassword.length < 12) {
      setError('Parola trebuie să aibă minim 12 caractere');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/first-time-password-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Get user info with new token
      const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${tempToken}`
        }
      });

      const meData = await meResponse.json();

      // Save auth data
      setAuth(tempToken, meData.user);

      // Redirect to dashboard
      navigate('/planner/dashboard');
    } catch (err: any) {
      setError(err.message || 'Eroare la schimbarea parolei');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo.jpeg" alt="CEAS Planning Center" />
          </div>
          <h1>Planning Center</h1>
          <p>{showPasswordChange ? 'Setează o parolă nouă' : 'Conectează-te pentru a accesa planificarea'}</p>
        </div>

        {error && (
          <div className="error-message show">
            {error}
          </div>
        )}

        {!showPasswordChange ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Utilizator</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Parolă</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Se conectează...' : 'Intră în cont'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordChange}>
            <div className="info-box">
              <p>🔒 Trebuie să îți schimbi parola la prima autentificare.</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                Parola trebuie să aibă minim 12 caractere, cu litere mari, mici, cifre și caractere speciale.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Parolă nouă</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Minim 12 caractere"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmă parola</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repetă parola"
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Se setează parola...' : 'Setează parola'}
            </button>
          </form>
        )}

        <div className="login-footer">
          <a href="/">← Înapoi la site</a>
        </div>
      </div>

      <style>{`
        .login-page {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .login-container {
          max-width: 420px;
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #191919;
          border-radius: 18px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0,0,0,.5);
        }
        .login-header { text-align: center; margin-bottom: 32px; }
        .login-logo { width: 80px; height: 80px; margin: 0 auto 16px; background: #111; border-radius: 12px; padding: 12px; }
        .login-logo img { width: 100%; height: 100%; object-fit: contain; }
        .login-header h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 800; }
        .login-header p { margin: 0; color: #b7b7b7; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 700; font-size: 14px; color: #e0e0e0; }
        .form-group input { width: 100%; padding: 12px 16px; background: #0e0e0e; border: 1px solid #1e1e1e; border-radius: 10px; color: #fff; font-size: 16px; outline: none; }
        .form-group input:focus { border-color: #2a2a2a; }
        .btn-login { width: 100%; padding: 14px; background: #fff; color: #000; border: none; border-radius: 10px; font-weight: 800; font-size: 16px; cursor: pointer; transition: all 0.2s; }
        .btn-login:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,255,255,0.2); }
        .btn-login:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .error-message { background: rgba(244,67,54,0.1); border: 1px solid rgba(244,67,54,0.3); color: #f44336; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; display: none; }
        .error-message.show { display: block; }
        .info-box { background: rgba(33,150,243,0.1); border: 1px solid rgba(33,150,243,0.3); color: #2196f3; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .login-footer { margin-top: 32px; text-align: center; padding-top: 20px; border-top: 1px solid #191919; }
        .login-footer a { color: #b7b7b7; text-decoration: none; font-size: 14px; }
        .login-footer a:hover { color: #fff; }
      `}</style>
    </div>
  );
}
