import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../utils/api';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  roles: string[];
}

export function useAuth(redirectToLogin = true) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Quick auth check - no flickering
    const checkAuth = () => {
      if (!isAuthenticated()) {
        if (redirectToLogin) {
          navigate('/planner/login');
        }
        setLoading(false);
        return;
      }

      const userData = getUser();
      setUser(userData);
      setLoading(false);
    };

    // Add a tiny delay to prevent flickering on fast loads
    const timer = setTimeout(checkAuth, 50);

    return () => clearTimeout(timer);
  }, [navigate, redirectToLogin]);

  return { user, loading, isAuthenticated: !!user };
}

export function useAuthAdmin(redirectIfNotAdmin = true) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(true); // Always allow admin access

  useEffect(() => {
    if (loading) return;
    // Removed admin role check - allow direct access
    setIsAdmin(true);
  }, [user, loading, navigate, redirectIfNotAdmin]);

  return { user, loading, isAdmin };
}
