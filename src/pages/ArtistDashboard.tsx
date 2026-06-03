import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ImagePlus, LogOut, Plus, Save, Upload } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';
import {
  createWork,
  fetchCollaborations,
  fetchPricing,
  fetchWorks,
  savePricing,
  updateProfile,
  uploadAvatarImage,
  uploadWorkImage,
} from '../lib/platformApi';
import type { Collaboration, PricingItem, Work } from '../types/platform';

const EMPTY_PRICING: PricingItem = {
  name: '',
  description: '',
  price: 0,
  unit: 'item',
};

const actionButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-glass-border bg-white/[0.035] px-4 py-2 text-sm text-white transition-colors hover:border-accent-blue/60 hover:bg-accent-blue/10 disabled:cursor-not-allowed disabled:opacity-50';

export function ArtistDashboard() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [works, setWorks] = useState<Work[]>([]);
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [workTitle, setWorkTitle] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
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

  const uploadAvatar = async () => {
    if (!avatarFile || avatarUploading) {
      setNotice('请先选择头像图片');
      return;
    }

    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const blob = await uploadAvatarImage(avatarFile, setAvatarProgress);
      setAvatarUrl(blob.url);
      setAvatarFile(null);
      setNotice('头像已上传，记得保存资料');
    } catch {
      setNotice('头像上传失败，请检查 Vercel Blob 配置');
    } finally {
      setAvatarUploading(false);
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

  const uploadWork = async () => {
    if (!workFile || !workTitle.trim() || uploading) {
      setNotice('请先选择图片并填写作品标题');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const blob = await uploadWorkImage(workFile, setUploadProgress);
      const work = await createWork({
        title: workTitle.trim(),
        description: workDescription,
        imageUrl: blob.url,
        imagePath: blob.pathname,
      });
      setWorks((items) => [work, ...items]);
      setWorkTitle('');
      setWorkDescription('');
      setWorkFile(null);
      setNotice('作品已上传');
    } catch {
      setNotice('作品上传失败，请检查 Vercel Blob 配置');
    } finally {
      setUploading(false);
    }
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
                  className="w-full bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="展示名"
                />

                <div className="flex items-center gap-3 rounded-lg border border-glass-border bg-white/5 p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-glass-border bg-black/30">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="头像预览" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">头像</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-accent-blue hover:text-white">
                      <Upload className="w-4 h-4" />
                      选择头像图片
                      <input
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="mt-1 truncate text-xs text-text-secondary">{avatarFile?.name || '未选择图片'}</p>
                  </div>
                  <button onClick={uploadAvatar} disabled={avatarUploading} className={actionButtonClass}>
                    {avatarUploading ? `${Math.round(avatarProgress)}%` : '上传'}
                  </button>
                </div>

                <textarea
                  className="w-full min-h-28 bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="简介"
                />
                <button onClick={saveProfile} className={actionButtonClass}>
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
                <button onClick={addPricingItem} className="inline-flex items-center gap-2 text-sm text-accent-blue hover:text-white">
                  <Plus className="w-4 h-4" />
                  增加套餐
                </button>
              </div>

              <div className="space-y-3">
                {pricing.map((item, index) => (
                  <div key={item.id || index} className="grid md:grid-cols-[1fr_1fr_120px_120px] gap-3">
                    <input
                      className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      value={item.name}
                      onChange={(event) => updatePricingItem(index, { name: event.target.value })}
                      placeholder="套餐名称"
                    />
                    <input
                      className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      value={item.description || ''}
                      onChange={(event) => updatePricingItem(index, { description: event.target.value })}
                      placeholder="说明"
                    />
                    <input
                      className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(event) => updatePricingItem(index, { price: Number(event.target.value) })}
                      placeholder="价格"
                    />
                    <select
                      className="bg-[#1b1b20] border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      value={item.unit}
                      onChange={(event) => updatePricingItem(index, { unit: event.target.value })}
                    >
                      <option value="item">按项 / item</option>
                      <option value="piece">按张 / piece</option>
                      <option value="set">按套 / set</option>
                      <option value="hour">按小时 / hour</option>
                      <option value="day">按天 / day</option>
                      <option value="sqm">按平方 / ㎡</option>
                    </select>
                  </div>
                ))}
              </div>

              <button onClick={savePriceList} className={`mt-5 ${actionButtonClass}`}>
                保存套餐价格
              </button>
            </div>

            <div className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
              <div className="flex items-center gap-2 text-white mb-4">
                <ImagePlus className="w-5 h-5" />
                <h3 className="text-lg">展示作品</h3>
              </div>

              <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 mb-5">
                <input
                  className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                  value={workTitle}
                  onChange={(event) => setWorkTitle(event.target.value)}
                  placeholder="作品标题"
                />
                <input
                  className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                  value={workDescription}
                  onChange={(event) => setWorkDescription(event.target.value)}
                  placeholder="作品说明"
                />
                <label className="px-4 py-2 border border-glass-border rounded-lg text-sm text-white cursor-pointer text-center hover:border-accent-blue/60 hover:bg-accent-blue/10">
                  选择图片
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setWorkFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <button onClick={uploadWork} disabled={uploading} className={actionButtonClass}>
                  {uploading ? `上传中 ${Math.round(uploadProgress)}%` : '上传作品'}
                </button>
                <span className="text-sm text-text-secondary truncate">{workFile?.name || '未选择图片'}</span>
              </div>

              {works.length === 0 ? (
                <p className="text-sm text-text-secondary">还没有上传作品。</p>
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
