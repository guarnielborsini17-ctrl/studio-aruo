import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Info, Package, Sofa, BedDouble, Bath, BookOpen } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { PricingContext } from '../App';

export function Pricing() {
  const { pricing } = useContext(PricingContext);

  const getIcon = (iconType: string) => {
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
  };

  const singleItems = pricing.filter((item) => item.category === 'single' || !item.category);
  const packageItems = pricing.filter((item) => item.category === 'package');

  return (
    <PageTransition className="max-w-5xl mx-auto w-full pt-8 pb-16">
      <header className="mb-12 border-b border-glass-border pb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Pricing</p>
        <h2 className="text-4xl md:text-5xl text-white mb-3">价格参考</h2>
        <div className="mt-6 flex items-start gap-3 p-4 bg-white/[0.035] border border-glass-border rounded-lg max-w-4xl">
          <Info className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed space-y-3">
            <p>
              这里保留基础空间表现价格作为公开参考。正式合作时，请进入绘图员排行榜查看每位绘图员自己的套餐价格。
            </p>
            <p className="text-accent-blue/80">
              设计师登录后可以在绘图员详情页发起合作，并在工作台完成评价与加鸡腿。
            </p>
          </div>
        </div>
      </header>

      <section className="mb-10">
        <h3 className="text-sm font-medium tracking-widest text-text-primary uppercase border-l-2 border-accent-blue pl-3 mb-5">
          单空间表现
        </h3>
        <div className="grid md:grid-cols-2 gap-5">
          {singleItems.map((item) => {
            const Icon = getIcon(item.iconType);
            return (
              <article key={item.id} className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-accent-blue" />
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
          })}
        </div>
      </section>

      {packageItems.length > 0 && (
        <section>
          <h3 className="text-sm font-medium tracking-widest text-text-primary uppercase border-l-2 border-accent-orange pl-3 mb-5">
            打包套餐
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            {packageItems.map((item) => {
              const Icon = getIcon(item.iconType);
              return (
                <article key={item.id} className="border border-glass-border rounded-lg p-5 bg-white/[0.035]">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-accent-orange" />
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
            })}
          </div>
        </section>
      )}

      <Link to="/artists" className="inline-block mt-8 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">
        查看绘图员套餐
      </Link>
    </PageTransition>
  );
}
