import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LogOut, Star } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';
import { createReview, fetchCollaborations, updateCollaborationStatus } from '../lib/platformApi';
import type { Collaboration } from '../types/platform';

type ReviewDraft = { rating: number; content: string };

export function DesignerDashboard() {
  const { user, loading, logout } = useAuth();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [notice, setNotice] = useState('');

  const loadCollaborations = async () => {
    const data = await fetchCollaborations();
    setCollaborations(data);
  };

  useEffect(() => {
    if (user?.role !== 'designer') return;
    loadCollaborations().catch(() => setNotice('合作列表暂时无法加载'));
  }, [user?.role]);

  if (loading) return <div className="text-white">加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'designer') return <Navigate to="/dashboard/artist" replace />;

  const draftFor = (id: string) => drafts[id] || { rating: 5, content: '' };
  const updateDraft = (id: string, next: Partial<ReviewDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...draftFor(id), ...next } }));
  };

  const complete = async (id: string) => {
    try {
      await updateCollaborationStatus(id, 'completed');
      await loadCollaborations();
      setNotice('合作已标记完成');
    } catch {
      setNotice('合作状态更新失败');
    }
  };

  const submitReview = async (collaborationId: string) => {
    const draft = draftFor(collaborationId);
    try {
      await createReview({ collaborationId, rating: draft.rating, content: draft.content });
      updateDraft(collaborationId, { content: '' });
      setNotice('评价已提交');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setNotice(code === 'review_exists' ? '这个合作已经评价过' : '评价提交失败');
    }
  };

  return (
    <PageTransition>
      <section className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-glass-border pb-8 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Designer</p>
            <h2 className="text-4xl md:text-5xl text-white mb-3">设计师工作台</h2>
            <p className="text-text-secondary">{user.displayName}，你可以挑选绘图员、管理合作并提交评价。</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white">
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </header>

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <aside className="space-y-5">
            <Link to="/artists" className="block border border-glass-border rounded-lg p-5 bg-white/[0.035] hover:border-white/40">
              <h3 className="text-white mb-2">挑选绘图员</h3>
              <p className="text-sm text-text-secondary">进入排行榜，查看作品、价格和设计师评价。</p>
            </Link>
          </aside>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-white">我的合作</h3>
              {notice && <span className="text-sm text-accent-blue">{notice}</span>}
            </div>

            {collaborations.length === 0 ? (
              <div className="border border-glass-border rounded-lg p-8 bg-white/[0.035] text-text-secondary">
                还没有合作。先去排行榜挑一位绘图员吧。
              </div>
            ) : (
              <div className="space-y-4">
                {collaborations.map((item) => {
                  const draft = draftFor(item.id);
                  return (
                    <article key={item.id} className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                        <div>
                          <h4 className="text-lg text-white">{item.title}</h4>
                          <p className="text-sm text-text-secondary">绘图员：{item.artistName}</p>
                          <p className="text-sm text-text-secondary mt-1">{item.note}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs uppercase tracking-widest text-text-secondary">{item.status}</span>
                          {item.status === 'active' && (
                            <button onClick={() => complete(item.id)} className="px-3 py-1.5 bg-white text-black rounded-lg text-sm">
                              标记完成
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-w-2xl space-y-3">
                          <div className="flex items-center gap-2 text-white">
                            <Star className="w-4 h-4" />
                            <span>写评价</span>
                          </div>
                          <input
                            className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                            type="number"
                            min={1}
                            max={5}
                            value={draft.rating}
                            onChange={(event) => updateDraft(item.id, { rating: Number(event.target.value) })}
                          />
                          <textarea
                            className="w-full min-h-24 bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                            value={draft.content}
                            onChange={(event) => updateDraft(item.id, { content: event.target.value })}
                            placeholder="写下这次合作体验"
                          />
                          <button onClick={() => submitReview(item.id)} className="px-4 py-2 bg-white text-black rounded-lg text-sm">
                            提交评价
                          </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
