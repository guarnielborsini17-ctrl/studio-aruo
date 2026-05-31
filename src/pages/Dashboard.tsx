import { useContext } from 'react';
import { PageTransition } from '../components/PageTransition';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Clock, CheckCircle2, Paintbrush2, Package, Inbox } from 'lucide-react';
import { KanbanContext, StatusContext } from '../App';

const ICONS = {
  '需求排队 | Queue': Inbox,
  '建模/深化 | Modeling': Paintbrush2,
  '渲染/后期 | Rendering': Clock,
  '已交付 | Delivered': Package,
};

export function Dashboard() {
  const { kanban } = useContext(KanbanContext);

  return (
    <PageTransition>
      <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-12">
        <header className="border-b border-glass-border pb-8">
          <h2 className="text-4xl md:text-5xl font-sans font-light tracking-tight mb-2">主页与排期看板</h2>
          <p className="text-text-secondary text-xs tracking-widest uppercase">Dashboard / Project Pipeline</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {Object.entries(kanban).map(([stage, items], idx) => {
            const Icon = ICONS[stage as keyof typeof ICONS];
            return (
               <motion.div 
                key={stage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="flex flex-col gap-4 bg-glass border border-glass-border rounded-[20px] p-6"
               >
                 <div className="flex items-center justify-between pb-4 font-mono text-xs uppercase tracking-[0.2em] text-text-secondary">
                   <div className="flex items-center gap-2">
                     <Icon className="w-4 h-4 text-text-secondary" />
                     <h3 className="font-medium">{stage}</h3>
                   </div>
                   <span className="text-[10px]">{items.length}</span>
                 </div>
                 
                 <div className="flex flex-col gap-3">
                   {items.map((item) => (
                     <div key={item.id} className="bg-[rgba(255,255,255,0.03)] border border-glass-border p-4 rounded-[12px] flex flex-col gap-3 hover:border-[rgba(255,255,255,0.2)] transition-colors cursor-default">
                       <div className="flex justify-between items-start">
                         <span className="text-[10px] font-mono text-accent-blue tracking-wider font-bold">{item.id}</span>
                         <span className="text-[9px] uppercase tracking-widest text-text-secondary">{item.date}</span>
                       </div>
                       <div>
                         <h4 className="text-[14px] font-medium tracking-wide mb-1 text-text-primary capitalize">{item.desc}</h4>
                         <p className="text-[10px] tracking-widest uppercase text-text-secondary">{item.client}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </motion.div>
            )
          })}
        </div>
      </div>
    </PageTransition>
  );
}
