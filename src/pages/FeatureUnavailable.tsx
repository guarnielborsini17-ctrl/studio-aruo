import React from 'react';
import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';

export function FeatureUnavailable() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-2xl pt-16 text-center">
        <Clock3 className="mx-auto mb-6 h-10 w-10 text-accent-blue" />
        <p className="mb-3 text-xs uppercase tracking-[0.35em] text-text-secondary">Coming Soon</p>
        <h2 className="mb-4 text-4xl text-white md:text-5xl">功能还待开放</h2>
        <p className="mx-auto max-w-xl text-text-secondary">
          第一版暂时只开放绘图员工作台。设计师、排行榜、合作与评价功能将在后续版本开放。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black">
            返回作品库
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-glass-border bg-white/[0.035] px-4 py-2 text-sm text-white"
          >
            返回登录
          </Link>
        </div>
      </section>
    </PageTransition>
  );
}
