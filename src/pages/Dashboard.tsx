import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-white">加载中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'designer' ? '/coming-soon' : '/dashboard/artist'} replace />;
}
