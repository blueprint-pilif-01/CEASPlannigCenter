import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Bell, User, LogOut, Menu, X, Sun, Moon, FileText, Calendar } from 'lucide-react';
import { getUser, clearAuth, apiCall } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';

export default function PlannerNav() {
  const location = useLocation();
  const [user, setUser] = useState(getUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await apiCall('/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/planner/dashboard';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const userInitial = user?.full_name?.charAt(0) || user?.username?.charAt(0) || '?';

  return (
    <>
      <nav className="planner-nav">
        <div className="nav-brand">
          <img src="/logo.jpeg" alt="Logo" className="logo-mini" />
          <span className="brand-name">Planning Center</span>
        </div>

        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <Link to="/planner/dashboard" className={location.pathname === '/planner/dashboard' ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/planner/events" className={`nav-events ${location.pathname.startsWith('/planner/events') ? 'active' : ''}`}>
            <Calendar size={16} style={{ marginRight: '4px' }} />
            Evenimente
          </Link>
          <Link to="/planner/contracts" className={`nav-contracts ${location.pathname.startsWith('/planner/contracts') ? 'active' : ''}`}>
            <FileText size={16} style={{ marginRight: '4px' }} />
            Contracte
          </Link>
          <Link to="/planner/admin/users" className={location.pathname.startsWith('/planner/admin') ? 'active' : ''}>
            Admin
          </Link>
        </div>

        <div className="nav-right">
          <Link to="/planner/notifications" className="notification-bell">
            <Bell size={20} style={{ color: '#4CAF50' }} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </Link>
          <button onClick={toggleTheme} className="theme-toggle" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="user-info">
            <div className="user-avatar">{userInitial}</div>
            <span className="user-name">{user?.full_name || user?.username}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} style={{ marginRight: '4px' }} />
            <span className="logout-text">Logout</span>
          </button>
        </div>

        <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          <Menu size={24} />
        </button>

        <style>{`
        .planner-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: var(--bg-secondary);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-primary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 1000;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-mini {
          height: 40px;
        }

        .brand-name {
          font-weight: 800;
          font-size: 18px;
          color: var(--text-primary);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-links a {
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          padding: 8px 12px;
          border-radius: 8px;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .nav-links a:hover,
        .nav-links a.active {
          background: var(--hover-bg);
        }

        .nav-events {
          display: flex !important;
          align-items: center;
        }

        .nav-events.active {
          background: var(--hover-bg) !important;
        }

        .nav-contracts {
          display: flex !important;
          align-items: center;
        }

        .nav-contracts.active {
          background: rgba(33,150,243,0.1) !important;
          color: #2196F3 !important;
        }
        
        .nav-right { 
          display: flex; 
          gap: 12px; 
          align-items: center;
          position: relative;
          z-index: 5;
        }
        
        .notification-bell { 
          position: relative;
          display: flex;
          align-items: center;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .notification-bell:hover {
          background: rgba(76, 175, 80, 0.1);
        }

        .notification-bell .badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #f44336;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 10px;
          animation: pulse 2s infinite;
        }

        .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #FFC107;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .theme-toggle:hover {
          background: rgba(255,193,7,0.1);
          border-color: rgba(255,193,7,0.3);
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--card-bg);
          border-radius: 8px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--text-primary);
        }

        .user-name {
          color: var(--text-primary);
          font-weight: 600;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          padding: 8px 14px;
          background: rgba(255,0,0,0.1);
          border: 1px solid rgba(255,0,0,0.3);
          color: var(--text-primary);
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .logout-btn:hover {
          background: rgba(255,0,0,0.2);
        }
        
        
        .btn-send-email {
          padding: 8px 14px !important;
          background: rgba(33,150,243,0.1) !important;
          border: 1px solid rgba(33,150,243,0.3) !important;
          color: #2196F3 !important;
          border-radius: 8px;
          font-weight: 700;
          transition: all 0.2s;
          display: flex !important;
          align-items: center;
        }
        
        .btn-send-email:hover {
          background: rgba(33,150,243,0.2) !important;
        }
        
        .hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: var(--text-primary);
          z-index: 10;
          flex-shrink: 0;
        }

        /* Full Screen Mobile Menu - HIGHEST Z-INDEX */
        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-primary);
          z-index: 99999 !important;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .mobile-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--border-primary);
        }

        .mobile-menu-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-logo {
          height: 32px;
        }

        .mobile-menu-brand span {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .btn-close-menu {
          background: var(--card-bg);
          border: 1px solid var(--border-primary);
          color: var(--text-primary);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-menu-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          gap: 8px;
          overflow-y: auto;
        }

        .mobile-menu-content a {
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 700;
          font-size: 18px;
          padding: 16px 20px;
          border-radius: 12px;
          transition: all 0.2s;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
        }

        .mobile-menu-content a:hover,
        .mobile-menu-content a.active {
          background: rgba(76,175,80,0.1);
          border-color: rgba(76,175,80,0.3);
          color: #4CAF50;
        }
        
        .mobile-create-service {
          background: rgba(76,175,80,0.1) !important;
          border-color: rgba(76,175,80,0.3) !important;
          color: #4CAF50 !important;
        }

        .mobile-contracts {
          background: rgba(33,150,243,0.1) !important;
          border-color: rgba(33,150,243,0.3) !important;
          color: #2196F3 !important;
        }
        
        .mobile-menu-footer {
          margin-top: auto;
          padding: 20px;
          border-top: 1px solid var(--border-primary);
        }

        .mobile-user-info {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 16px;
          background: var(--card-bg);
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .mobile-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
        }

        .mobile-user-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .mobile-user-email {
          font-size: 13px;
          color: var(--text-tertiary);
        }
        
        .mobile-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          background: rgba(244,67,54,0.1);
          border: 1px solid rgba(244,67,54,0.3);
          color: #f44336;
          border-radius: 12px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
        }
        
        .mobile-logout:hover {
          background: rgba(244,67,54,0.2);
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .planner-nav {
            padding: 0 16px;
            height: 70px;
          }
          
          .nav-links {
            gap: 4px;
          }
          
          .nav-links a {
            font-size: 14px;
            padding: 6px 10px;
          }
          
          .brand-name {
            font-size: 16px;
          }
          
          .logo-mini {
            height: 35px;
          }
          
          .nav-right {
            gap: 8px;
          }
          
          .user-name {
            display: none;
          }
          
          .logout-text {
            display: none;
          }
          
          .logout-btn {
            padding: 8px;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .planner-nav {
            height: 64px;
            padding: 0 12px;
          }
          
          .logo-mini {
            height: 30px;
          }
          
          .brand-name {
            font-size: 14px;
          }
          
          .nav-links {
            display: none;
          }
          
          .hamburger {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .nav-right {
            gap: 6px;
          }
          
          .nav-brand {
            flex-shrink: 0;
          }
          
          .nav-right {
            flex-shrink: 0;
          }
          
          .user-info {
            padding: 6px 8px;
          }
          
          .user-avatar {
            width: 28px;
            height: 28px;
            font-size: 14px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .planner-nav {
            height: 56px;
            padding: 0 8px;
          }
          
          .logo-mini {
            height: 26px;
          }
          
          .brand-name {
            font-size: 13px;
          }
          
          
          .notification-bell {
            padding: 6px;
          }
          
          .user-info {
            padding: 4px 6px;
          }
          
          .user-avatar {
            width: 26px;
            height: 26px;
            font-size: 13px;
          }
          
          .logout-btn {
            padding: 6px;
          }
        }
      `}</style>
      </nav>

      {/* Full Screen Mobile Menu */}
      {isMenuOpen && (
        <div className="mobile-menu-overlay">
          <div className="mobile-menu-header">
            <div className="mobile-menu-brand">
              <img src="/logo.jpeg" alt="Logo" className="mobile-logo" />
              <span>Planning Center</span>
            </div>
            <button className="btn-close-menu" onClick={toggleMenu}>
              <X size={28} />
            </button>
          </div>
          
          <div className="mobile-menu-content">
            <Link to="/planner/dashboard" className={location.pathname === '/planner/dashboard' ? 'active' : ''}>
              Dashboard
            </Link>
            <Link to="/planner/events" className="mobile-create-service">
              Evenimente
            </Link>
            <Link to="/planner/contracts" className={`mobile-contracts ${location.pathname.startsWith('/planner/contracts') ? 'active' : ''}`}>
              Contracte
            </Link>
            <Link to="/planner/admin/users" className={location.pathname.startsWith('/planner/admin') ? 'active' : ''}>
              Admin
            </Link>
            
            <div className="mobile-menu-footer">
              <div className="mobile-user-info">
                <div className="mobile-avatar">{userInitial}</div>
                <div>
                  <div className="mobile-user-name">{user?.full_name || user?.username}</div>
                  <div className="mobile-user-email">{user?.email}</div>
                </div>
              </div>
              <button onClick={handleLogout} className="mobile-logout">
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
