import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
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
        if (!cancelled) setMessage('绘图员信息暂时无法加载');
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
      setMessage('请先登录设计师账号');
      return;
    }

    if (user.role !== 'designer') {
      setMessage('只有设计师账号可以发起合作');
      return;
    }

    try {
      await createCollaboration({ artistId: id, title, note });
      setMessage('合作已创建，可回到设计师工作台继续评价或加鸡腿');
      setNote('');
    } catch {
      setMessage('合作创建失败，请稍后再试');
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
        <Link to="/artists" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" />
          返回排行榜
        </Link>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Artist</p>
            <h2 className="text-4xl md:text-5xl text-white mb-4">{artist.displayName}</h2>
            <p className="text-text-secondary max-w-2xl mb-8">{artist.bio || '这位绘图员还没有填写简介。'}</p>

            <div className="mb-10">
              <h3 className="text-xl text-white mb-4">展示作品</h3>
              {works.length === 0 ? (
                <p className="text-text-secondary">暂时还没有上传作品。</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {works.map((work) => (
                    <article key={work.id} className="border border-glass-border rounded-lg overflow-hidden bg-white/[0.035]">
                      <img src={work.imageUrl} alt={work.title} className="w-full aspect-[4/3] object-cover" />
                      <div className="p-4">
                        <h4 className="text-white">{work.title}</h4>
                        <p className="text-sm text-text-secondary mt-1">{work.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl text-white mb-4">设计师评价</h3>
              {reviews.length === 0 ? (
                <p className="text-text-secondary">暂无评价。</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <article key={review.id} className="border border-glass-border rounded-lg p-4 bg-white/[0.035]">
                      <div className="flex items-center gap-2 text-accent-orange mb-2">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{review.rating}/5</span>
                        <span className="text-text-secondary text-sm">来自 {review.designerName || '设计师'}</span>
                      </div>
                      <p className="text-text-primary">{review.content}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
              <h3 className="text-lg text-white mb-4">套餐价格</h3>
              {pricing.length === 0 ? (
                <p className="text-sm text-text-secondary">绘图员还没有设置价格。</p>
              ) : (
                <div className="space-y-3">
                  {pricing.map((item) => (
                    <div key={item.id || item.name} className="flex justify-between gap-4 text-sm border-b border-glass-border pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-white">{item.name}</p>
                        <p className="text-text-secondary">{item.description}</p>
                      </div>
                      <p className="text-white whitespace-nowrap">¥{item.price}/{item.unit}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
              <h3 className="text-lg text-white mb-4">发起合作</h3>
              <div className="space-y-3">
                <input
                  className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="合作标题"
                />
                <textarea
                  className="w-full min-h-24 bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="项目需求备注"
                />
                <button onClick={startCollaboration} className="w-full bg-white text-black rounded-lg py-2 font-medium">
                  创建合作
                </button>
                {message && <p className="text-sm text-accent-blue">{message}</p>}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PageTransition>
  );
}
