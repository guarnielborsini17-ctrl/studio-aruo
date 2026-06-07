import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageTransition } from '../components/PageTransition';
import { WorkShowcaseCard } from '../components/WorkShowcaseCard';
import { fetchWorks } from '../lib/platformApi';
import type { Work } from '../types/platform';

function isDevelopmentFixture(work: Work) {
  return work.title === 'Codex Smoke Test' && work.imagePath === 'inline:smoke-test.png';
}

export function Gallery() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchWorks()
      .then((items) => {
        if (!cancelled) {
          setWorks(items.filter((work) => !isDevelopmentFixture(work)));
        }
      })
      .catch(() => {
        if (!cancelled) setError('作品库暂时无法连接，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="mb-16 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-5xl font-light tracking-tight md:text-7xl">作品库</h2>
            <p className="ml-1 text-[12px] uppercase tracking-widest text-text-secondary">
              The Gallery - Immersive Visuals
            </p>
          </div>
        </header>

        {loading ? <p className="mb-6 text-sm text-text-secondary">正在加载作品...</p> : null}
        {error ? <p className="mb-6 text-sm text-accent-orange">{error}</p> : null}

        {works.length > 0 ? (
          <motion.div layout className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
            <AnimatePresence mode="popLayout">
              {works.map((work, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  key={work.id}
                  className={index % 2 === 1 ? 'md:mt-32' : ''}
                >
                  <WorkShowcaseCard work={work} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          !loading && (
            <div className="rounded-lg border border-glass-border bg-white/[0.035] p-8 text-text-secondary">
              还没有公开上传的作品。请在绘图员工作台上传作品后回到这里查看。
            </div>
          )
        )}
      </div>
    </PageTransition>
  );
}
