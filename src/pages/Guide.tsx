import React, { useState } from 'react';
import { PageTransition } from '../components/PageTransition';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Info, FileText, MousePointer2, MonitorPlay, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

const GUIDE_DATA = [
  {
    category: '产品介绍 (About Us)',
    items: [
      { 
        name: 'Studio Aruo 是什么？', 
        icon: MonitorPlay,
        content: '我们是一家专注于高品质空间表现与视觉传达的设计工作室。通过自主研发的「需求交互版」系统，我们致力于打破传统渲染服务中沟通效率低下的痛点，让设计师与客户之间的需求对接变得像画画一样简单直观。' 
      },
      { 
        name: '我们的服务优势', 
        icon: FileText,
        content: '1. 极简沟通：告别冗长的文字描述，直接在图纸上圈选标注。\n2. 透明报价：价格标准公开透明，杜绝隐形消费。\n3. 高效交付：规范化的排期看板，让您随时掌握项目进度。\n4. 沉浸体验：提供高质量的渲染图、720°全景及动画漫游服务。' 
      }
    ]
  },
  {
    category: '用户使用手册 (User Guide)',
    items: [
      { 
        name: '如何提交需求？', 
        icon: MousePointer2,
        content: '1. 点击顶部导航的「需求交互版」。\n2. 拖拽或点击上传您的 CAD 平面图或参考意向图（支持图片、PDF、压缩包等）。\n3. 使用左侧工具栏的画笔、箭头或文字工具，在图纸上直接标注您的需求重点。\n4. 点击右上角的「提交需求单」，您的专属需求面板就会同步到我们的后台。' 
      },
      { 
        name: '如何追加或修改需求？', 
        icon: MessageSquare,
        content: '如果您已经提交过需求单，该画板的提交按钮会变成「更新需求单」。您只需在原画板上继续添加图片或文字标注，再次点击更新，后台的工单内容就会自动同步刷新，无需重复创建新工单。' 
      },
      { 
        name: '如何查看排期状态？', 
        icon: Info,
        content: '您可以在任何页面的左上角（Logo 旁边）看到我们工作室当前的实时状态（空闲或繁忙），以及「最早可排期日期」。请在提交需求时参考该时间节点。' 
      }
    ]
  }
];

export function Guide() {
  const [openCategory, setOpenCategory] = useState<string | null>(GUIDE_DATA[0].category);

  return (
    <PageTransition className="max-w-[1000px] mx-auto w-full pt-8 pb-16">
      <header className="mb-12 border-b border-glass-border pb-8">
        <h2 className="text-4xl md:text-5xl font-sans font-light tracking-tight mb-2">服务与手册</h2>
        <p className="text-text-secondary text-xs tracking-widest uppercase">About Us & User Guide</p>
      </header>

      <div className="flex flex-col gap-6">
        {GUIDE_DATA.map((section, idx) => {
          const isOpen = openCategory === section.category;
          
          return (
            <div 
              key={idx} 
              className={cn(
                "bg-[#111] border rounded-[16px] overflow-hidden transition-colors duration-300",
                isOpen ? "border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.03)]" : "border-glass-border hover:border-white/10"
              )}
            >
              <button 
                onClick={() => setOpenCategory(isOpen ? null : section.category)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
              >
                <h3 className="text-lg font-medium tracking-wide text-white">{section.category}</h3>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 pt-2">
                      <div className="grid grid-cols-1 gap-4">
                        {section.items.map((item, itemIdx) => {
                          const Icon = item.icon;
                          return (
                            <div 
                              key={itemIdx} 
                              className="p-6 bg-[rgba(255,255,255,0.02)] rounded-xl border border-glass-border hover:bg-[rgba(255,255,255,0.04)] transition-colors group flex gap-5"
                            >
                              <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 transition-colors mt-1">
                                <Icon className="w-5 h-5 text-text-secondary group-hover:text-accent-blue transition-colors" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-base font-medium text-white mb-3 group-hover:text-accent-blue transition-colors">{item.name}</h4>
                                <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                                  {item.content}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </PageTransition>
  );
}