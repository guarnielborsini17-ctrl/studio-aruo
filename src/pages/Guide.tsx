import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Images, UserRound } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

const STEPS = [
  {
    title: '注册绘图员账号',
    icon: UserRound,
    content: '第一版开放绘图员注册。登录后会直接进入绘图员工作台。',
  },
  {
    title: '维护展示资料',
    icon: Images,
    content: '在工作台编辑头像、简介、套餐价格和价格说明，并上传自己的展示作品。',
  },
  {
    title: '公开展示作品',
    icon: BadgeCheck,
    content: '保存后的套餐会同步到价格参考页，上传作品会展示在公开作品库中。',
  },
];

export function Guide() {
  return (
    <PageTransition className="max-w-5xl mx-auto w-full pt-8 pb-16">
      <header className="mb-12 border-b border-glass-border pb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Guide</p>
        <h2 className="text-4xl md:text-5xl text-white mb-3">服务与手册</h2>
        <p className="text-text-secondary max-w-2xl">
          Studio Aruo 第一版专注于绘图员展示能力，先跑通账号、资料、套餐价格和作品上传。
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        {STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="border border-glass-border rounded-lg p-6 bg-white/[0.035]">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-accent-blue" />
              </div>
              <h3 className="text-lg text-white mb-2">{item.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.content}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/register" className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium">
          创建绘图员账号
        </Link>
      </div>
    </PageTransition>
  );
}
