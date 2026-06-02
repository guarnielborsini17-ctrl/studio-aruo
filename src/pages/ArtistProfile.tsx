import React from 'react';
import { PageTransition } from '../components/PageTransition';

export function ArtistProfile() {
  return (
    <PageTransition>
      <section className="max-w-5xl mx-auto">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Artist</p>
        <h2 className="text-4xl text-white mb-4">绘图员详情</h2>
        <p className="text-text-secondary">绘图员详情会在下一步接入。</p>
      </section>
    </PageTransition>
  );
}
