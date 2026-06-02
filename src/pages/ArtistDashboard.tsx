import React from 'react';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';

export function ArtistDashboard() {
  const { user } = useAuth();

  return (
    <PageTransition>
      <section className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Render Artist</p>
        <h2 className="text-4xl text-white mb-4">绘图员工作台</h2>
        <p className="text-text-secondary">
          {user?.displayName || '绘图员'}，作品上传和套餐编辑会在下一步接入。
        </p>
      </section>
    </PageTransition>
  );
}
