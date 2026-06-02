import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Drumstick, Images, Users } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { fetchArtists } from '../lib/platformApi';
import type { ArtistRank } from '../types/platform';

function metric(label: string, value: string | number, Icon: React.ComponentType<{ className?: string }>) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <Icon className="w-3.5 h-3.5" />
      {label} {value}
    </span>
  );
}

export function ArtistRanking() {
  const [artists, setArtists] = useState<ArtistRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchArtists()
      .then((data) => {
        if (!cancelled) setArtists(data);
      })
      .catch(() => {
        if (!cancelled) setError('排行榜暂时无法加载');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageTransition>
      <section className="max-w-6xl mx-auto">
        <header className="border-b border-glass-border pb-8 mb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Ranking</p>
          <h2 className="text-4xl md:text-5xl text-white mb-3">绘图员排行榜</h2>
          <p className="text-text-secondary max-w-2xl">
            排名会优先参考合作过的设计师评价，其次参考鸡腿、合作次数和作品数量。
          </p>
        </header>

        {loading && <p className="text-text-secondary">加载中...</p>}
        {error && <p className="text-accent-orange">{error}</p>}

        {!loading && !error && artists.length === 0 && (
          <div className="border border-glass-border rounded-lg p-8 bg-white/5 text-text-secondary">
            还没有绘图员注册。创建一个绘图员账号后，这里会出现排名。
          </div>
        )}

        <div className="space-y-4">
          {artists.map((artist, index) => (
            <Link
              key={artist.id}
              to={`/artists/${artist.id}`}
              className="grid md:grid-cols-[72px_1fr_auto] gap-5 items-center border border-glass-border rounded-lg bg-white/[0.035] p-5 hover:border-white/40 transition-colors"
            >
              <div className="text-3xl font-mono text-white/80">#{index + 1}</div>
              <div>
                <h3 className="text-xl text-white mb-2">{artist.displayName}</h3>
                <p className="text-sm text-text-secondary line-clamp-2">{artist.bio || '这位绘图员还没有填写简介。'}</p>
                <div className="flex flex-wrap gap-4 mt-4">
                  {metric('评分', artist.averageRating.toFixed(1), Star)}
                  {metric('评价', artist.reviewCount, Users)}
                  {metric('鸡腿', artist.chickenLegTotal, Drumstick)}
                  {metric('作品', artist.workCount, Images)}
                </div>
              </div>
              <span className="text-sm text-accent-blue">查看详情</span>
            </Link>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
