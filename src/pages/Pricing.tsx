import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Package, Sofa, BedDouble, Bath, BookOpen } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PricingContext } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { fetchPricing } from '../lib/platformApi';
import type { PricingItem } from '../types/platform';

type PublicPricingItem = {
  id: string;
  name: string;
  en: string;
  price: string;
  unit: string;
  iconType: string;
  category?: string;
};

function getIcon(iconType: string) {
  switch (iconType) {
    case 'BedDouble':
      return BedDouble;
    case 'Bath':
      return Bath;
    case 'BookOpen':
      return BookOpen;
    case 'Package':
      return Package;
    default:
      return Sofa;
  }
}

function unitLabel(unit: string) {
  if (unit === 'item') return '项';
  if (unit === 'piece') return '张';
  if (unit === 'set') return '套';
  if (unit === 'hour') return '小时';
  if (unit === 'day') return '天';
  if (unit === 'sqm') return '㎡';
  return unit;
}

function PublicPriceCard({ item, accent = 'blue' }: { item: PublicPricingItem; accent?: 'blue' | 'orange' }) {
  const Icon = getIcon(item.iconType);
  const iconColor = accent === 'orange' ? 'text-accent-orange' : 'text-accent-blue';

  return (
    <article className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h4 className="text-lg text-white">{item.name}</h4>
          <p className="text-xs text-text-secondary uppercase tracking-widest mt-1">{item.en}</p>
        </div>
        <p className="text-right text-white">
          <span className="text-text-secondary text-xs">¥</span>
          <span className="text-2xl font-serif italic mx-1">{item.price}</span>
          <span className="text-xs text-text-secondary">{item.unit}</span>
        </p>
      </div>
    </article>
  );
}

function CustomPriceCard({ item }: { item: PricingItem }) {
  return (
    <article className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
            <Package className="w-5 h-5 text-accent-blue" />
          </div>
          <h4 className="text-lg text-white">{item.name}</h4>
          <p className="text-xs text-text-secondary uppercase tracking-widest mt-1">
            {item.description || '自定义套餐'}
          </p>
        </div>
        <p className="text-right text-white">
          <span className="text-text-secondary text-xs">¥</span>
          <span className="text-2xl font-serif italic mx-1">{item.price}</span>
          <span className="text-xs text-text-secondary">/{unitLabel(item.unit)}</span>
        </p>
      </div>
    </article>
  );
}

export function Pricing() {
  const { pricing } = useContext(PricingContext);
  const { user } = useAuth();
  const [artistPricing, setArtistPricing] = useState<PricingItem[]>([]);
  const [loadingArtistPricing, setLoadingArtistPricing] = useState(false);

  useEffect(() => {
    if (user?.role !== 'artist') {
      setArtistPricing([]);
      return;
    }

    let cancelled = false;
    setLoadingArtistPricing(true);
    fetchPricing(user.id)
      .then((items) => {
        if (!cancelled) setArtistPricing(items);
      })
      .catch(() => {
        if (!cancelled) setArtistPricing([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingArtistPricing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const publicPricing = pricing as unknown as PublicPricingItem[];
  const singleItems = publicPricing.filter((item) => item.category === 'single' || !item.category);
  const packageItems = publicPricing.filter((item) => item.category === 'package');
  const showingArtistPricing = user?.role === 'artist' && artistPricing.length > 0;

  return (
    <PageTransition className="max-w-5xl mx-auto w-full pt-8 pb-16">
      <header className="mb-12 border-b border-glass-border pb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Pricing</p>
        <h2 className="text-4xl md:text-5xl text-white mb-3">价格参考</h2>
        <div className="mt-6 flex items-start gap-3 p-4 bg-white/[0.035] border border-glass-border rounded-lg max-w-4xl">
          <Info className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
            {user?.role === 'artist'
              ? user.pricingNote?.trim() || '可在绘图员工作台填写价格说明。'
              : '这里显示公共基础空间表现价格。'}
          </p>
        </div>
      </header>

      {showingArtistPricing ? (
        <section>
          <h3 className="text-sm font-medium tracking-widest text-text-primary uppercase border-l-2 border-accent-blue pl-3 mb-5">
            我的自定义套餐
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            {artistPricing.map((item) => (
              <CustomPriceCard key={item.id || item.name} item={item} />
            ))}
          </div>
        </section>
      ) : (
        <>
          {loadingArtistPricing && <p className="mb-5 text-sm text-text-secondary">正在加载你的套餐价格...</p>}
          <section className="mb-10">
            <h3 className="text-sm font-medium tracking-widest text-text-primary uppercase border-l-2 border-accent-blue pl-3 mb-5">
              单空间表现
            </h3>
            <div className="grid md:grid-cols-2 gap-5">
              {singleItems.map((item) => (
                <PublicPriceCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          {packageItems.length > 0 && (
            <section>
              <h3 className="text-sm font-medium tracking-widest text-text-primary uppercase border-l-2 border-accent-orange pl-3 mb-5">
                打包套餐
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                {packageItems.map((item) => (
                  <PublicPriceCard key={item.id} item={item} accent="orange" />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Link
        to={user?.role === 'artist' ? '/dashboard/artist' : '/artists'}
        className="inline-block mt-8 rounded-lg border border-glass-border bg-white/[0.035] px-4 py-2 text-sm text-white hover:border-accent-blue/60 hover:bg-accent-blue/10"
      >
        {user?.role === 'artist' ? '返回工作台修改套餐' : '查看绘图员套餐'}
      </Link>
    </PageTransition>
  );
}
