import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Images, Star, Users } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

const STEPS = [
  {
    title: '注册角色账号',
    icon: Users,
    content: '设计师和绘图员使用各自独立账号登录。注册时选择身份后，会进入对应工作台。',
  },
  {
    title: '设计师挑选绘图员',
    icon: Star,
    content: '设计师可以在绘图员排行榜查看作品、价格、评价和鸡腿记录，再发起合作。',
  },
  {
    title: '绘图员维护展示资料',
    icon: Images,
    content: '绘图员可以在工作台编辑简介、套餐价格，并通过 Vercel Blob 上传展示作品。',
  },
  {
    title: '合作后评价与加鸡腿',
    icon: FileText,
    content: '合作创建后，设计师可以在工作台提交评价，也可以通过模拟充值余额给绘图员加鸡腿。',
  },
];

export function Guide() {
  return (
    <PageTransition className="max-w-5xl mx-auto w-full pt-8 pb-16">
      <header className="mb-12 border-b border-glass-border pb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Guide</p>
        <h2 className="text-4xl md:text-5xl text-white mb-3">服务与手册</h2>
        <p className="text-text-secondary max-w-2xl">
          Studio Aruo 现在是一个面向设计师与绘图员的协作展示平台，第一期演示版重点跑通账号、作品、排行榜和合作评价。
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
          创建账号
        </Link>
        <Link to="/artists" className="px-4 py-2 border border-glass-border rounded-lg text-sm text-white">
          查看排行榜
        </Link>
      </div>
    </PageTransition>
  );
}
