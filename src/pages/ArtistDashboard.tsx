import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronDown, Copy, EyeOff, ImagePlus, Link2, LogOut, Plus, RefreshCw, Save, Upload } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { WorkShowcaseCard } from '../components/WorkShowcaseCard';
import { useAuth } from '../contexts/AuthContext';
import {
  createWork,
  disableShareLink,
  fetchPricing,
  fetchShareLink,
  fetchWorks,
  generateShareLink,
  savePricing,
  updateProfile,
  uploadAvatarImage,
  uploadWorkImage,
} from '../lib/platformApi';
import { uploadWorkBatch } from '../lib/batchWorkUpload';
import { cn } from '../lib/utils';
import { processWorkImage } from '../lib/workImageProcessing';
import type { PricingItem, ShareLinkState, Work } from '../types/platform';

const EMPTY_PRICING: PricingItem = {
  name: '',
  description: '',
  price: 0,
  unit: 'item',
};

const actionButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-glass-border bg-white/[0.035] px-4 py-2 text-sm text-white transition-colors hover:border-accent-blue/60 hover:bg-accent-blue/10 disabled:cursor-not-allowed disabled:opacity-50';

const stageLabels = {
  processing: '正在处理',
  uploading: '正在上传',
  saving: '正在保存',
} as const;

type CollapsiblePanelProps = {
  id: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
};

function CollapsiblePanel({
  id,
  title,
  icon,
  open,
  onToggle,
  children,
  className = '',
}: CollapsiblePanelProps) {
  const contentId = `${id}-content`;

  return (
    <div id={id} className={cn('rounded-lg border border-glass-border bg-white/[0.035] p-5', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className="flex min-w-0 items-center gap-2 text-lg text-white">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-text-secondary transition-transform', open ? 'rotate-180' : '')}
        />
      </button>
      {open ? (
        <div id={contentId} className="mt-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ArtistDashboard() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [pricingNote, setPricingNote] = useState('');
  const [isBusy, setIsBusy] = useState(true);
  const [availableDate, setAvailableDate] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [works, setWorks] = useState<Work[]>([]);
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [workFiles, setWorkFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPosition, setUploadPosition] = useState({ current: 0, total: 0 });
  const [uploadStage, setUploadStage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [share, setShare] = useState<ShareLinkState | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});

  const togglePanel = (panelId: string) => {
    setCollapsedPanels((panels) => ({ ...panels, [panelId]: !panels[panelId] }));
  };

  useEffect(() => {
    if (!user || user.role !== 'artist') return;
    setDisplayName(user.displayName);
    setBio(user.bio || '');
    setAvatarUrl(user.avatarUrl || '');
    setPricingNote(user.pricingNote || '');
    setIsBusy(user.isBusy ?? true);
    setAvailableDate(user.availableDate || new Date().toISOString().slice(0, 10));
    Promise.all([
      fetchWorks(user.id),
      fetchPricing(user.id),
      fetchShareLink().catch(() => null),
    ])
      .then(([workData, pricingData, shareData]) => {
        setWorks(workData);
        setPricing(pricingData.length ? pricingData : [{ ...EMPTY_PRICING, name: '单张效果图', price: 300 }]);
        setShare(shareData);
      })
      .catch(() => setNotice('工作台数据暂时无法加载。'));
  }, [user]);

  if (loading) return <div className="text-white">加载中...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'artist') return <Navigate to="/coming-soon" replace />;

  const saveProfile = async () => {
    try {
      await updateProfile({ displayName, bio, avatarUrl, pricingNote });
      await refreshUser();
      setNotice('资料已保存。');
    } catch {
      setNotice('资料保存失败。');
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || avatarUploading) {
      setNotice('请先选择头像图片。');
      return;
    }

    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const blob = await uploadAvatarImage(avatarFile, setAvatarProgress);
      setAvatarUrl(blob.url);
      setAvatarFile(null);
      setNotice('头像已上传，记得保存资料。');
    } catch {
      setNotice('头像上传失败，请检查 Blob 配置。');
    } finally {
      setAvatarUploading(false);
    }
  };

  const savePriceList = async () => {
    const validItems = pricing
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        unit: item.unit === 'item' || item.unit === 'day' ? 'piece' : item.unit || 'piece',
        price: Number(item.price || 0),
      }))
      .filter((item) => item.name);

    try {
      setPricing(await savePricing(validItems));
      await updateProfile({ displayName, bio, avatarUrl, pricingNote });
      await refreshUser();
      setNotice('套餐价格已保存。');
    } catch {
      setNotice('套餐价格保存失败。');
    }
  };

  const saveAvailability = async () => {
    if (!availableDate) {
      setNotice('请选择最早可排期日期。');
      return;
    }

    setSavingAvailability(true);
    try {
      await updateProfile({ isBusy, availableDate });
      await refreshUser();
      setNotice('接单状态已保存。');
    } catch {
      setNotice('接单状态保存失败。');
    } finally {
      setSavingAvailability(false);
    }
  };

  const updatePricingItem = (index: number, next: Partial<PricingItem>) => {
    setPricing((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)));
  };

  const addPricingItem = () => {
    setPricing((items) => [...items, { ...EMPTY_PRICING }]);
  };

  const generateShare = async () => {
    if (shareBusy) return;
    const replacing = Boolean(share?.token);
    setShareBusy(true);
    try {
      setShare(await generateShareLink());
      setNotice(replacing ? '已生成新的公开链接，旧链接已失效。' : '公开链接已生成。');
    } catch {
      setNotice('公开链接生成失败。');
    } finally {
      setShareBusy(false);
    }
  };

  const disableShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      setShare(await disableShareLink());
      setNotice('公开作品页已关闭。');
    } catch {
      setNotice('关闭分享失败。');
    } finally {
      setShareBusy(false);
    }
  };

  const copyShare = async () => {
    if (!share?.url || !share.enabled) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setNotice('公开链接已复制。');
    } catch {
      setNotice('自动复制失败，请手动复制下面的链接。');
    }
  };

  const uploadWork = async () => {
    if (workFiles.length === 0 || uploading) {
      setNotice('请先选择图片。');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadPosition({ current: 1, total: workFiles.length });
    try {
      const result = await uploadWorkBatch({
        files: workFiles,
        title: '',
        description: '',
        processImage: processWorkImage,
        uploadImage: uploadWorkImage,
        createWork,
        onProgress: ({ current, total, percentage, stage }) => {
          setUploadPosition({ current, total });
          setUploadProgress(percentage);
          setUploadStage(stageLabels[stage]);
        },
      });

      if (result.succeeded.length > 0) {
        setWorks((items) => [...result.succeeded].reverse().concat(items));
      }
      setWorkFiles([]);
      setUploadProgress(0);
      setUploadPosition({ current: 0, total: 0 });
      setUploadStage('');

      const summary = `${result.succeeded.length} 张上传成功${
        result.failed.length ? `，${result.failed.length} 张上传失败` : ''
      }。`;
      const failedNames = result.failed.map((item) => item.fileName).join('、');
      setNotice(failedNames ? `${summary} 失败文件：${failedNames}` : summary);
    } catch {
      setNotice('批量上传未能开始，请稍后再试。');
    } finally {
      setUploadStage('');
      setUploading(false);
    }
  };

  return (
    <PageTransition>
      <section className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-glass-border pb-8 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-text-secondary">Render Artist</p>
            <h2 className="mb-3 text-4xl text-white md:text-5xl">绘图员工作台</h2>
            <p className="text-text-secondary">{user.displayName}，这里用于维护展示资料、套餐价格和合作状态。</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white">
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </header>

        {notice ? <p className="mb-5 text-sm text-accent-blue">{notice}</p> : null}

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5">
            <CollapsiblePanel
              id="profile"
              title="展示资料"
              open={!collapsedPanels.profile}
              onToggle={() => togglePanel('profile')}
            >
              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
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
                  className="min-h-28 w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="简介"
                />
                <button onClick={saveProfile} className={actionButtonClass}>
                  <Save className="w-4 h-4" />
                  保存资料
                </button>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel
              id="availability"
              title="接单状态"
              open={!collapsedPanels.availability}
              onToggle={() => togglePanel('availability')}
            >
              <div className="space-y-4">
                <div>
                  <span className="mb-2 block text-sm text-text-secondary">当前状态</span>
                  <div className="grid grid-cols-2 rounded-lg border border-glass-border bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setIsBusy(true)}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm transition-colors',
                        isBusy ? 'bg-white text-black' : 'text-text-secondary hover:text-white'
                      )}
                    >
                      繁忙
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBusy(false)}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm transition-colors',
                        !isBusy ? 'bg-white text-black' : 'text-text-secondary hover:text-white'
                      )}
                    >
                      空闲可接单
                    </button>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm text-text-secondary">最早可排期日期</span>
                  <input
                    type="date"
                    value={availableDate}
                    onChange={(event) => setAvailableDate(event.target.value)}
                    className="w-full rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                  />
                </label>

                <button
                  type="button"
                  onClick={saveAvailability}
                  disabled={savingAvailability}
                  className={actionButtonClass}
                >
                  <Save className="h-4 w-4" />
                  {savingAvailability ? '正在保存...' : '保存接单状态'}
                </button>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel
              id="share"
              title="公开作品页"
              icon={<Link2 className="h-5 w-5 text-accent-blue" />}
              open={!collapsedPanels.share}
              onToggle={() => togglePanel('share')}
            >
              <p className="mb-4 text-sm leading-relaxed text-text-secondary">
                生成后可发给设计师查看你的资料、作品和价格，不包含登录或工作台。
              </p>

              {share?.url ? (
                <input
                  readOnly
                  value={share.url}
                  aria-label="公开作品页链接"
                  className="mb-3 w-full rounded-lg border border-glass-border bg-black/20 px-3 py-2 text-sm text-white outline-none"
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                {!share?.token ? (
                  <button type="button" onClick={generateShare} disabled={shareBusy} className={actionButtonClass}>
                    <Link2 className="h-4 w-4" />
                    生成公开链接
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={copyShare}
                      disabled={!share.enabled || shareBusy}
                      className={actionButtonClass}
                    >
                      <Copy className="h-4 w-4" />
                      复制链接
                    </button>
                    <button type="button" onClick={generateShare} disabled={shareBusy} className={actionButtonClass}>
                      <RefreshCw className="h-4 w-4" />
                      重新生成
                    </button>
                    {share.enabled ? (
                      <button type="button" onClick={disableShare} disabled={shareBusy} className={actionButtonClass}>
                        <EyeOff className="h-4 w-4" />
                        关闭分享
                      </button>
                    ) : (
                      <button type="button" onClick={generateShare} disabled={shareBusy} className={actionButtonClass}>
                        <Link2 className="h-4 w-4" />
                        重新开启
                      </button>
                    )}
                  </>
                )}
              </div>
            </CollapsiblePanel>

          </aside>

          <div className="space-y-8">
            <CollapsiblePanel
              id="pricing"
              title="套餐价格"
              open={!collapsedPanels.pricing}
              onToggle={() => togglePanel('pricing')}
            >
              <div className="mb-5 flex items-center justify-end">
                <button onClick={addPricingItem} className="inline-flex items-center gap-2 text-sm text-accent-blue hover:text-white">
                  <Plus className="w-4 h-4" />
                  增加套餐
                </button>
              </div>

              <div className="space-y-3">
                {pricing.map((item, index) => (
                  <div key={item.id || index} className="grid gap-3 md:grid-cols-[1fr_1fr_120px_120px]">
                    <input
                      className="rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      value={item.name}
                      onChange={(event) => updatePricingItem(index, { name: event.target.value })}
                      placeholder="套餐名称"
                    />
                    <input
                      className="rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      value={item.description || ''}
                      onChange={(event) => updatePricingItem(index, { description: event.target.value })}
                      placeholder="说明"
                    />
                    <input
                      className="rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(event) => updatePricingItem(index, { price: Number(event.target.value) })}
                      placeholder="价格"
                    />
                    <select
                      className="rounded-lg border border-glass-border bg-[#1b1b20] px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                      value={item.unit === 'item' || item.unit === 'day' ? 'piece' : item.unit}
                      onChange={(event) => updatePricingItem(index, { unit: event.target.value })}
                    >
                      <option value="piece">按张</option>
                      <option value="set">按套</option>
                      <option value="hour">按小时</option>
                      <option value="sqm">按平方</option>
                    </select>
                  </div>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm text-text-secondary">价格说明</span>
                <textarea
                  className="min-h-24 w-full resize-y rounded-lg border border-glass-border bg-white/5 px-3 py-2 text-white outline-none focus:border-accent-blue/60"
                  value={pricingNote}
                  onChange={(event) => setPricingNote(event.target.value)}
                  placeholder="例如：交付周期、修改次数、急单费用等"
                  maxLength={1000}
                />
              </label>

              <button onClick={savePriceList} className={`mt-5 ${actionButtonClass}`}>
                保存套餐价格
              </button>
            </CollapsiblePanel>

            <CollapsiblePanel
              id="works"
              title="展示作品"
              icon={<ImagePlus className="h-5 w-5 text-accent-blue" />}
              open={!collapsedPanels.works}
              onToggle={() => togglePanel('works')}
            >
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="cursor-pointer rounded-lg border border-glass-border px-4 py-2 text-center text-sm text-white hover:border-accent-blue/60 hover:bg-accent-blue/10">
                  选择图片
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    onChange={(event) => {
                      setWorkFiles(Array.from(event.target.files || []));
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button onClick={uploadWork} disabled={uploading} className={actionButtonClass}>
                  {uploading
                    ? `${uploadStage} ${uploadPosition.current}/${uploadPosition.total} · ${Math.round(uploadProgress)}%`
                    : '上传作品'}
                </button>
                <span className="truncate text-sm text-text-secondary">
                  {workFiles.length === 0
                    ? '未选择图片'
                    : workFiles.length === 1
                      ? workFiles[0].name
                      : `已选择 ${workFiles.length} 张`}
                </span>
              </div>

              {works.length === 0 ? (
                <p className="text-sm text-text-secondary">还没有上传作品。</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {works.map((work) => (
                    <WorkShowcaseCard key={work.id} work={work} />
                  ))}
                </div>
              )}
            </CollapsiblePanel>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
