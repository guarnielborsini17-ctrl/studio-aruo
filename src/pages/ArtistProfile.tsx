import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { WorkShowcaseCard } from '../components/WorkShowcaseCard';
import { useAuth } from '../contexts/AuthContext';
import { createCollaboration, fetchArtist } from '../lib/platformApi';
import type { PlatformUser, PricingItem, Review, Work } from '../types/platform';

export function ArtistProfile() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [artist, setArtist] = useState<PlatformUser | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [title, setTitle] = useState('效果图合作');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchArtist(id)
      .then((data) => {
        if (cancelled) return;
        setArtist(data.artist);
        setWorks(data.works);
        setPricing(data.pricing);
        setReviews(data.reviews);
      })
      .catch(() => {
        if (!cancelled) setMessage('绘图员信息暂时无法加载。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const startCollaboration = async () => {
    if (!user) {
      setMessage('请先登录设计师账号。');
      return;
    }

    if (user.role !== 'designer') {
      setMessage('只有设计师账号可以发起合作。');
      return;
    }

    try {
      await createCollaboration({ artistId: id, title, note });
      setMessage('合作已创建，可回到设计师工作台继续评价或加鸡腿。');
      setNote('');
    } catch {
      setMessage('合作创建失败，请稍后再试。');
    }
  };

  if (loading) {
    return <div className="text-white">加载中...</div>;
  }

  if (!artist) {
    return (
      <PageTransition>
        <section className="max-w-5xl mx-auto text-text-secondary">没有找到这位绘图员。</section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="max-w-6xl mx-auto">
        <Link to="/artists" className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          返回排行榜
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-text-secondary">Artist</p>
            <h2 className="mb-4 text-4xl text-white md:text-5xl">{artist.displayName}</h2>
            <p className="mb-8 max-w-2xl text-text-secondary">{artist.bio || '这位绘图员还没有填写简介。'}</p>

            <div className="mb-10">
              <h3 className="mb-4 text-xl text-white">展示作品</h3>
              {works.length === 0 ? (
                <p className="text-text-secondary">暂时还没有上传作品。</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {works.map((work) => (
                    <WorkShowcaseCard key={work.id} work={work} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-4 text-xl text-white">设计师评价</h3>
              {reviews.length === 0 ? (
                <p className="text-text-secondary">暂无评价。</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-lg border border-glass-border bg-white/[0.035] p-4">
                      <div className="mb-2 flex items-center gap-2 text-accent-orange">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{review.rating}/5</span>
                        <span className="text-sm text-text-secondary">来自 {review.designerName || '设计师'}</span>
                      </div>
                      <p className="text-text-primary">{review.content}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-glass-border bg-white/[0.035] p-5">
              <h3 className="mb-4 text-lg text-white">套餐价格</h3>
              {pricing.length === 0 ? (
                <p className="text-sm text-text-secondary">绘图员还没有设置价格。</p>
              ) : (
                <div className="space-y-3">
                  {pricing.map((item) => (
                    <div key={item.id || item.name} className="flex justify-between gap-4 border-b border-glass-border pb-3 text-sm last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-white">{item.name}</p>
                        <p className="text-text-secondary">{item.description}</p>
                      </div>
                      <p className="whitespace-nowrap text-white">¥{item.price}/{item.unit}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-glass-border bg-white/[0.035] p-5">
              <h3 className="mb-4 text-lg text-white">发起合作</h3>
              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="合作标题"
                />
                <textarea
                  className="min-h-24 w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="项目需求备注"
                />
                <button onClick={startCollaboration} className="w-full rounded-lg bg-white py-2 font-medium text-black">
                  创建合作
                </button>
                {message ? <p className="text-sm text-accent-blue">{message}</p> : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PageTransition>
  );
}
