import React from 'react';
import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';

export function DesignerDashboard() {
  const { user } = useAuth();

  return (
    <PageTransition>
      <section className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Designer</p>
        <h2 className="text-4xl text-white mb-4">设计师工作台</h2>
        <p className="text-text-secondary mb-8">
          {user?.displayName || '设计师'}，完整工作台会在下一步接入。
        </p>
        <Link className="text-accent-blue" to="/artists">
          先去查看绘图员排行
        </Link>
      </section>
    </PageTransition>
  );
}
