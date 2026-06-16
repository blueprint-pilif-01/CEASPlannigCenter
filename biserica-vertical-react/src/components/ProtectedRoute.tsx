import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { verifyToken, isAuthenticated } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verify = async () => {
      // Quick check first
      if (!isAuthenticated()) {
        setIsVerifying(false);
        setIsValid(false);
        return;
      }

      // Verify token with backend
      const valid = await verifyToken();
      setIsValid(valid);
      setIsVerifying(false);
    };

    verify();
  }, [location.pathname]);

  if (isVerifying) {
    return <LoadingSpinner fullScreen message="Verificare autentificare..." />;
  }

  if (!isValid) {
    return <Navigate to="/planner/login" replace />;
  }

  return <>{children}</>;
}
