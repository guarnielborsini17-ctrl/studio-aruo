import React, { useContext } from 'react';
import { PageTransition } from '../components/PageTransition';
import { Info, Sofa, BedDouble, Bath, BookOpen, Package } from 'lucide-react';
import { PricingContext } from '../App';

export function Pricing() {
  const { pricing } = useContext(PricingContext);

  const getIcon = (iconType: string) => {
    switch(iconType) {
      case 'Sofa': return Sofa;
      case 'BedDouble': return BedDouble;
      case 'Bath': return Bath;
      case 'BookOpen': return BookOpen;
      case 'Package': return Package;
      default: return Sofa;
    }
  };

  const singleItems = pricing.filter(p => p.category === 'single' || !p.category);
  const packageItems = pricing.filter(p => p.category === 'package');

  return (
    <PageTransition className="max-w-[1200px] mx-auto w-full pt-8 pb-16">
      <header className="mb-12 border-b border-glass-border pb-8">
        <h2 className="text-4xl md:text-5xl font-sans font-light tracking-tight mb-2">价格参考</h2>
        <p className="text-text-secondary text-xs tracking-widest uppercase">Pricing / Space Categories</p>
        <div className="mt-6 flex items-start gap-3 p-4 bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-xl max-w-4xl">
          <Info className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed space-y-3">
            <p>
              以上价格为<strong className="text-white font-medium">基础建模渲染价格</strong>，客户需提供<strong className="text-white font-medium">CAD平面布置图和硬装，软装，氛围参考图</strong>。
              如需整体设计深化，价格另议。工装及别墅等大空间表现价格亦需商议调整。
            </p>
            <p>
              后期交图后，<strong className="text-white font-medium">软装及局部细节调整免费提供 3 次</strong>。
              如遇风格或硬装结构上的较大变更，将根据额外修改时间进行评估收费。
            </p>
            <p className="text-accent-blue/80">建议您前往「需求交互版」提交详细需求，我们将为您提供准确的专属报价单。</p>
          </div>
        </div>
      </header>

      {/* 单空间表现 */}
      <div className="mb-6 flex items-center">
        <h3 className="text-sm font-medium tracking-widest text-text-primary uppercase border-l-2 border-accent-blue pl-3">单空间表现</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mb-12">
        {singleItems.map((item, idx) => {
          const Icon = getIcon(item.iconType);
          return (
            <div 
              key={idx} 
              className="group relative bg-[#111] border border-glass-border rounded-[20px] p-6 hover:bg-[rgba(255,255,255,0.02)] hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Subtle background glow effect on hover */}
              <div className="absolute -inset-24 bg-gradient-to-b from-accent-blue/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 transition-colors">
                    <Icon className="w-6 h-6 text-text-secondary group-hover:text-accent-blue transition-colors" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-text-secondary uppercase tracking-widest">{item.en}</span>
                    <div className="flex items-baseline justify-end gap-1 mt-1">
                      <span className="text-[10px] text-text-secondary">￥</span>
                      <span className="text-2xl font-serif italic text-white">{item.price}</span>
                      <span className="text-[10px] text-text-secondary ml-1">{item.unit}</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-white mb-2">{item.name}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* 打包套餐 */}
      {packageItems.length > 0 && (
        <>
          <div className="mb-6 flex items-center mt-12">
            <h3 className="text-sm font-medium tracking-widest text-text-primary uppercase border-l-2 border-accent-orange pl-3">打包套餐</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {packageItems.map((item, idx) => {
              const Icon = getIcon(item.iconType);
              return (
                <div 
                  key={idx} 
                  className="group relative bg-[#111] border border-glass-border rounded-[20px] p-6 hover:bg-[rgba(255,255,255,0.02)] hover:border-accent-orange/30 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="absolute -inset-24 bg-gradient-to-b from-accent-orange/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-accent-orange/30 group-hover:bg-accent-orange/10 transition-colors">
                        <Icon className="w-6 h-6 text-text-secondary group-hover:text-accent-orange transition-colors" />
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-secondary uppercase tracking-widest">{item.en}</span>
                        <div className="flex items-baseline justify-end gap-1 mt-1">
                          <span className="text-[10px] text-text-secondary">￥</span>
                          <span className="text-2xl font-serif italic text-white">{item.price}</span>
                          <span className="text-[10px] text-text-secondary ml-1">{item.unit}</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-medium text-white mb-2">{item.name}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PageTransition>
  );
}
