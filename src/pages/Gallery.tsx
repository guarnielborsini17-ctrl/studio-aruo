import { useState, useRef, useContext } from 'react';
import { PageTransition } from '../components/PageTransition';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ImagePlus, Pencil } from 'lucide-react';
import { ProjectContext } from '../App';

export function Gallery() {
  const { projects, setProjects } = useContext(ProjectContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingId !== null) {
      const url = URL.createObjectURL(file);
      setProjects(prev => prev.map(p => p.id === editingId ? { ...p, img: url } : p));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditingId(null);
  };

  const triggerUpload = (id: number) => {
    setEditingId(id);
    fileInputRef.current?.click();
  };

  const updateText = (id: number, field: 'name' | 'style', value: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <PageTransition>
      <div className="max-w-[1400px] mx-auto w-full">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
        />
        <header className="mb-16 flex justify-between items-end">
          <div>
            <h2 className="text-5xl md:text-7xl font-sans font-light tracking-tight mb-2">阿鶸的作品库</h2>
            <p className="text-text-secondary text-[12px] tracking-widest uppercase ml-1">The Gallery - Immersive Visuals</p>
          </div>
        </header>

        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          <AnimatePresence mode="popLayout">
            {projects.map((item, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                key={item.id}
                className={cn(
                  "group relative overflow-hidden flex flex-col gap-4 p-6 bg-glass border border-glass-border rounded-[20px]",
                  idx % 2 === 1 ? "md:mt-32" : ""
                )}
              >
                <div className="w-full aspect-[4/5] overflow-hidden rounded-xl relative bg-[rgba(255,255,255,0.02)] border border-glass-border">
                  <motion.img 
                    initial={false}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    src={item.img} 
                    alt={item.name}
                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08080C] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Upload Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <button 
                      onClick={() => triggerUpload(item.id)} 
                      className="pointer-events-auto flex items-center gap-2 bg-black/60 hover:bg-accent-blue/80 backdrop-blur-md px-5 py-3 rounded-full text-white text-xs tracking-widest transition-colors border border-glass-border"
                    >
                      <ImagePlus className="w-4 h-4" />
                      更换作品图
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-start mt-2">
                  <div className="flex flex-col gap-1 w-full relative group/text">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-accent-blue">PROJECT NO. {item.id.toString().padStart(3, '0')}</span>
                    <div className="flex items-center gap-2">
                      <h3 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateText(item.id, 'name', e.currentTarget.textContent || item.name)}
                        className="text-[14px] tracking-wide uppercase font-medium focus:outline-none focus:bg-white/10 rounded px-1 -mx-1 border border-transparent focus:border-glass-border transition-colors w-max whitespace-nowrap"
                      >
                        {item.name}
                      </h3>
                      <Pencil className="w-3 h-3 text-text-secondary opacity-0 group-hover/text:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  </div>
                  <span 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateText(item.id, 'style', e.currentTarget.textContent || item.style)}
                    className="text-[10px] uppercase tracking-[0.2em] text-text-secondary bg-[rgba(255,255,255,0.03)] border border-glass-border px-3 py-1.5 rounded-full backdrop-blur-md focus:outline-none focus:border-accent-blue focus:bg-white/10 transition-colors whitespace-nowrap h-max"
                  >
                    {item.style}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageTransition>
  );
}
