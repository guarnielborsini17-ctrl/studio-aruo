import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogOut, Plus, Save } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCollaborations,
  fetchPricing,
  fetchWorks,
  savePricing,
  updateProfile,
} from '../lib/platformApi';
import type { Collaboration, PricingItem, Work } from '../types/platform';

const EMPTY_PRICING: PricingItem = {
  name: '',
  description: '',
  price: 0,
  unit: 'item',
};

export function ArtistDashboard() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [works, setWorks] = useState<Work[]>([]);
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'artist') return;
    setDisplayName(user.displayName);
    setBio(user.bio || '');
    setAvatarUrl(user.avatarUrl || '');
    Promise.all([fetchWorks(user.id), fetchPricing(user.id), fetchCollaborations()])
      .then(([workData, pricingData, collaborationData]) => {
        setWorks(workData);
        setPricing(pricingData.length ? pricingData : [{ ...EMPTY_PRICING, name: '单张效果图', price: 300 }]);
        setCollaborations(collaborationData);
      })
      .catch(() => setNotice('工作台数据暂时无法加载'));
  }, [user]);

  if (loading) return <div className="text-white">加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'artist') return <Navigate to="/dashboard/designer" replace />;

  const saveProfile = async () => {
    try {
      await updateProfile({ displayName, bio, avatarUrl });
      await refreshUser();
      setNotice('资料已保存');
    } catch {
      setNotice('资料保存失败');
    }
  };

  const savePriceList = async () => {
    const validItems = pricing
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        unit: item.unit || 'item',
        price: Number(item.price || 0),
      }))
      .filter((item) => item.name);

    try {
      setPricing(await savePricing(validItems));
      setNotice('套餐价格已保存');
    } catch {
      setNotice('套餐价格保存失败');
    }
  };

  const updatePricingItem = (index: number, next: Partial<PricingItem>) => {
    setPricing((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)));
  };

  const addPricingItem = () => {
    setPricing((items) => [...items, { ...EMPTY_PRICING }]);
  };

  return (
    <PageTransition>
      <section className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-glass-border pb-8 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Render Artist</p>
            <h2 className="text-4xl md:text-5xl text-white mb-3">绘图员工作台</h2>
            <p className="text-text-secondary">{user.displayName}，这里用于维护展示资料、套餐价格和合作状态。</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white">
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </header>

        {notice && <p className="mb-5 text-sm text-accent-blue">{notice}</p>}

        <div className="grid lg:grid-cols-[360px_1fr] gap-8">
          <aside className="space-y-5">
            <div className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
              <h3 className="text-lg text-white mb-4">展示资料</h3>
              <div className="space-y-3">
                <input
                  className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="展示名"
                />
                <input
                  className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="头像 URL"
                />
                <textarea
                  className="w-full min-h-28 bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="简介"
                />
                <button onClick={saveProfile} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm">
                  <Save className="w-4 h-4" />
                  保存资料
                </button>
              </div>
            </div>

            <div className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
              <h3 className="text-lg text-white mb-4">合作记录</h3>
              {collaborations.length === 0 ? (
                <p className="text-sm text-text-secondary">还没有合作记录。</p>
              ) : (
                <div className="space-y-3">
                  {collaborations.map((item) => (
                    <div key={item.id} className="border-b border-glass-border pb-3 last:border-b-0 last:pb-0">
                      <p className="text-white">{item.title}</p>
                      <p className="text-xs text-text-secondary">设计师：{item.designerName} · {item.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-8">
            <div className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg text-white">套餐价格</h3>
                <button onClick={addPricingItem} className="inline-flex items-center gap-2 text-sm text-accent-blue">
                  <Plus className="w-4 h-4" />
                  增加套餐
                </button>
              </div>

              <div className="space-y-3">
                {pricing.map((item, index) => (
                  <div key={item.id || index} className="grid md:grid-cols-[1fr_1fr_120px_120px] gap-3">
                    <input
                      className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                      value={item.name}
                      onChange={(event) => updatePricingItem(index, { name: event.target.value })}
                      placeholder="套餐名称"
                    />
                    <input
                      className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                      value={item.description || ''}
                      onChange={(event) => updatePricingItem(index, { description: event.target.value })}
                      placeholder="说明"
                    />
                    <input
                      className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(event) => updatePricingItem(index, { price: Number(event.target.value) })}
                      placeholder="价格"
                    />
                    <select
                      className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none"
                      value={item.unit}
                      onChange={(event) => updatePricingItem(index, { unit: event.target.value })}
                    >
                      <option value="item">item</option>
                      <option value="piece">piece</option>
                      <option value="set">set</option>
                      <option value="hour">hour</option>
                      <option value="day">day</option>
                    </select>
                  </div>
                ))}
              </div>

              <button onClick={savePriceList} className="mt-5 px-4 py-2 bg-white text-black rounded-lg text-sm">
                保存套餐价格
              </button>
            </div>

            <div className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
              <h3 className="text-lg text-white mb-4">展示作品</h3>
              {works.length === 0 ? (
                <p className="text-sm text-text-secondary">作品上传控件会在下一步接入 Vercel Blob。</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {works.map((work) => (
                    <article key={work.id} className="border border-glass-border rounded-lg overflow-hidden">
                      <img src={work.imageUrl} alt={work.title} className="w-full aspect-[4/3] object-cover" />
                      <div className="p-3">
                        <p className="text-white">{work.title}</p>
                        <p className="text-xs text-text-secondary">{work.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
