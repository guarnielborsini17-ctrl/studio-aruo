import React, { useContext, useState, useRef, useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { motion } from 'motion/react';
import { ProjectContext, KanbanContext, StatusContext, SubmissionsContext, PricingContext, ChatContext } from '../App';
import { Trash2, Plus, ImagePlus, Upload, X, Eye, FileArchive, FileCode2, FileText, Download, Send, LockKeyhole, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiDelete, apiPost, clearAdminToken, getAdminToken, setAdminToken } from '../lib/api';
import { Stage, Layer, Arrow, Circle, Rect, Image as KonvaImage, Text } from 'react-konva';

const ADMIN_AUTH_KEY = 'studio_aruo_admin_authed';
const ADMIN_PASSWORD = (import.meta as any).env?.VITE_ADMIN_PASSWORD || 'demo-admin';
const STATIC_DEMO = (import.meta as any).env?.VITE_STATIC_DEMO === 'true';

function SubmissionViewer({ state: initialState }: { state: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [images, setImages] = useState<any[]>([]);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const [stageState, setStageState] = useState({
    scale: initialState?.scale || 1,
    position: initialState?.position || { x: 0, y: 0 }
  });

  // Keep state updated when viewing new submission
  useEffect(() => {
    if (initialState) {
      setStageState({
        scale: initialState.scale || 1,
        position: initialState.position || { x: 0, y: 0 }
      });
    }
  }, [initialState]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (initialState && initialState.baseImages) {
      Promise.all(initialState.baseImages.map((imgData: any) => {
        return new Promise((resolve) => {
          const img = new window.Image();
          img.src = imgData.image;
          img.onload = () => resolve({ ...imgData, image: img });
        });
      })).then((loadedImages: any) => {
        setImages(loadedImages);
      });
    }
  }, [initialState]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zooming
    if (newScale < 0.1 || newScale > 10) return;

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    setStageState({
      scale: newScale,
      position: newPos
    });
  };

  const handleMouseDown = (e: any) => {
    // Left or middle click for panning in viewer mode
    if (e.evt && (e.evt.button === 1 || e.evt.button === 0)) {
      e.evt.preventDefault();
      isPanning.current = true;
      lastPanPosition.current = { x: e.evt.clientX, y: e.evt.clientY };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      return;
    }
  };

  const handleMouseMove = (e: any) => {
    if (isPanning.current) {
      e.evt?.preventDefault();
      const dx = e.evt.clientX - lastPanPosition.current.x;
      const dy = e.evt.clientY - lastPanPosition.current.y;
      
      setStageState(prev => ({
        ...prev,
        position: {
          x: prev.position.x + dx,
          y: prev.position.y + dy
        }
      }));
      
      lastPanPosition.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
  };

  const handleMouseUp = (e: any) => {
    if (isPanning.current) {
      isPanning.current = false;
      if (containerRef.current) containerRef.current.style.cursor = 'grab';
      return;
    }
  };

  if (!initialState) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        scaleX={stageState.scale}
        scaleY={stageState.scale}
        x={stageState.position.x}
        y={stageState.position.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer>
          {images.map((imgData) => (
            <KonvaImage 
              key={imgData.id}
              image={imgData.image} 
              x={imgData.x}
              y={imgData.y}
              width={imgData.width} 
              height={imgData.height} 
              scaleX={imgData.scaleX || 1}
              scaleY={imgData.scaleY || 1}
              rotation={imgData.rotation || 0}
            />
          ))}
          {initialState.shapes?.map((shape: any, i: number) => {
            const commonProps = { 
              key: shape.id || i, 
              id: shape.id, 
              x: shape.x || 0, 
              y: shape.y || 0,
              scaleX: shape.scaleX || 1,
              scaleY: shape.scaleY || 1,
              rotation: shape.rotation || 0
            };
            const color = shape.color || "#FF6B4A";
            if (shape.type === 'arrow') {
              return <Arrow {...commonProps} points={shape.points} stroke={color} fill={color} strokeWidth={3} pointerLength={10} pointerWidth={10} />;
            }
            if (shape.type === 'circle') {
              return <Circle {...commonProps} radius={shape.radius} stroke={color} strokeWidth={3} dash={[10, 5]} />;
            }
            if (shape.type === 'rect') {
              return <Rect {...commonProps} width={shape.width} height={shape.height} stroke={color} strokeWidth={3} />;
            }
            if (shape.type === 'text') {
              return (
                <Text 
                  {...commonProps}
                  text={shape.text} 
                  fontSize={shape.fontSize || 24} 
                  fill={color}
                  fontFamily="Inter, sans-serif"
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}

export function Admin() {
  const { projects, setProjects } = useContext(ProjectContext);
  const { kanban, setKanban } = useContext(KanbanContext);
  const { status, setStatus } = useContext(StatusContext);
  const { submissions, setSubmissions } = useContext(SubmissionsContext);
  
  const { pricing, setPricing } = useContext(PricingContext);
  const { messages, addMessage, unreadCount, clearUnread } = useContext(ChatContext);
  
  const [activeTab, setActiveTab] = useState<'gallery' | 'submissions' | 'chat' | 'pricing'>('gallery');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | 'NEW' | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthed, setIsAuthed] = useState(() => localStorage.getItem(ADMIN_AUTH_KEY) === 'true' && (STATIC_DEMO || !!getAdminToken()));

  // Auto-update viewing submission if it changes in the background
  useEffect(() => {
    if (viewingSubmission) {
      const updatedSubmission = submissions.find(s => s.id === viewingSubmission.id);
      if (updatedSubmission && JSON.stringify(updatedSubmission.state) !== JSON.stringify(viewingSubmission.state)) {
        setViewingSubmission(updatedSubmission);
      }
    }
  }, [submissions, viewingSubmission]);

  useEffect(() => {
    if (activeTab === 'chat') {
      clearUnread('admin');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages]);

  const handleAdminSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    addMessage('admin', chatInput.trim());
    setChatInput('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiPost<{ token: string }>('/api/admin/login', { password });
      setAdminToken(result.token);
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      setIsAuthed(true);
      setPassword('');
      setAuthError('');
      return;
    } catch {
      if (STATIC_DEMO && password === ADMIN_PASSWORD) {
        localStorage.setItem(ADMIN_AUTH_KEY, 'true');
        setIsAuthed(true);
        setPassword('');
        setAuthError('');
      } else if (password === ADMIN_PASSWORD) {
        setAuthError('后端暂时不可用，无法完成安全登录。请确认 API 服务已启动。');
      } else {
        setAuthError('密码不正确，请重新输入。');
      }
      setPassword('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    clearAdminToken();
    setIsAuthed(false);
    setPassword('');
    setAuthError('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingId === null) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        if (uploadingId === 'NEW') {
          const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
          setProjects(prev => [{
            id: newId,
            type: 'All',
            name: '我的新项目',
            img: dataUrl,
            style: 'Custom Style'
          }, ...prev]);
        } else {
          updateProject(uploadingId as number, 'img', dataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadingId(null);
  };

  const triggerUpload = (id: number | 'NEW') => {
    setUploadingId(id);
    fileInputRef.current?.click();
  };

  const updateProject = (id: number, field: string, value: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProject = (id: number) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  if (!isAuthed) {
    return (
      <PageTransition>
        <div className="max-w-[520px] mx-auto w-full min-h-[60vh] flex items-center">
          <form onSubmit={handleLogin} className="w-full bg-glass border border-glass-border rounded-[20px] p-8 backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-accent-blue/15 border border-accent-blue/20 flex items-center justify-center text-accent-blue mb-6">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-sans font-light tracking-tight mb-2">后台访问验证</h2>
            <p className="text-text-secondary text-xs tracking-widest uppercase mb-8">Admin Access / Password Required</p>
            <label className="text-[10px] text-text-secondary uppercase tracking-widest">管理密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (authError) setAuthError('');
              }}
              autoFocus
              placeholder="请输入后台管理密码"
              className="mt-2 w-full bg-black/30 border border-glass-border focus:border-accent-blue outline-none rounded-xl px-4 py-3 text-sm text-text-primary transition-colors"
            />
            {authError && <p className="mt-3 text-sm text-accent-orange">{authError}</p>}
            <button
              type="submit"
              className="mt-6 w-full px-5 py-3 bg-white text-black hover:bg-accent-blue hover:text-white rounded-xl text-sm tracking-widest uppercase transition-colors"
            >
              进入后台
            </button>
          </form>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-[1000px] mx-auto w-full">
        <header className="mb-12 border-b border-glass-border pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-4xl font-sans font-light tracking-tight mb-2">后台数据管理</h2>
              <p className="text-text-secondary text-xs tracking-widest uppercase">Admin / Data Management</p>
            </div>
            <button
              onClick={handleLogout}
              className="self-start inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-lg text-xs text-text-secondary hover:text-white tracking-wider transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出后台
            </button>
          </div>
          <div className="mt-4 p-4 bg-accent-blue/10 border border-accent-blue/20 rounded-lg text-sm text-accent-blue tracking-wide">
            提示：这里的数据会优先通过 **/api 后端接口**进行保存与同步；如果后端不可用，则会降级保存到浏览器本地缓存（localStorage）。
          </div>
        </header>

        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide shrink-0">
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-3 rounded-full text-sm tracking-widest uppercase transition-colors shrink-0 ${activeTab === 'gallery' ? 'bg-white text-black' : 'bg-glass text-text-secondary hover:text-white'}`}
          >
            作品库内容管理
          </button>
          <button 
            onClick={() => setActiveTab('submissions')}
            className={`px-6 py-3 rounded-full text-sm tracking-widest uppercase transition-colors shrink-0 ${activeTab === 'submissions' ? 'bg-white text-black' : 'bg-glass text-text-secondary hover:text-white'}`}
          >
            收到的需求单
            {submissions.length > 0 && (
              <span className="ml-2 bg-accent-orange text-white text-[10px] px-2 py-0.5 rounded-full">{submissions.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`px-6 py-3 rounded-full text-sm tracking-widest uppercase transition-colors shrink-0 ${activeTab === 'pricing' ? 'bg-white text-black' : 'bg-glass text-text-secondary hover:text-white'}`}
          >
            价格配置
          </button>
          <button 
            onClick={() => {
              setActiveTab('chat');
              clearUnread('admin');
            }}
            className={`px-6 py-3 rounded-full text-sm tracking-widest uppercase transition-colors shrink-0 relative ${activeTab === 'chat' ? 'bg-white text-black' : 'bg-glass text-text-secondary hover:text-white'}`}
          >
            沟通与消息
            {unreadCount.admin > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-[#0a0a0a]">
                {unreadCount.admin}
              </span>
            )}
          </button>
        </div>

        <div className="bg-glass border border-glass-border rounded-[20px] p-6 lg:p-10 backdrop-blur-md">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          {activeTab === 'gallery' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col gap-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium tracking-widest text-text-primary">当前展示作品</h3>
                <button onClick={() => triggerUpload('NEW')} className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-xs tracking-wider transition-colors">
                  <Upload className="w-4 h-4" /> 上传本地新作品
                </button>
              </div>

              {projects.map((p, idx) => (
                <div key={p.id} className="flex flex-col md:flex-row gap-6 p-4 bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-xl">
                  <div className="w-32 aspect-[4/5] shrink-0 bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-lg overflow-hidden relative group">
                    <img src={p.img} alt="preview" className="w-full h-full object-cover relative z-0" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                      <button onClick={() => triggerUpload(p.id)} className="flex items-center gap-2 px-3 py-2 bg-accent-blue hover:bg-white hover:text-black rounded-lg text-white text-[10px] transition-colors shadow-lg">
                        <Upload className="w-3 h-3" />
                        上传替换
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest">项目名称 (Name)</label>
                      <input 
                        value={p.name}
                        onChange={(e) => updateProject(p.id, 'name', e.target.value)}
                        className="bg-transparent border-b border-glass-border focus:border-accent-blue outline-none py-1 text-sm text-text-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest">风格描述 (Style)</label>
                      <input 
                        value={p.style}
                        onChange={(e) => updateProject(p.id, 'style', e.target.value)}
                        className="bg-transparent border-b border-glass-border focus:border-accent-blue outline-none py-1 text-sm text-text-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] text-text-secondary uppercase tracking-widest">图片链接 (Image URL)</label>
                        <button onClick={() => triggerUpload(p.id)} className="text-[10px] text-accent-blue hover:text-white transition-colors flex items-center gap-1 font-mono">
                          <ImagePlus className="w-3 h-3" />
                          <span>选择本地文件</span>
                        </button>
                      </div>
                      <input 
                        value={p.img}
                        onChange={(e) => updateProject(p.id, 'img', e.target.value)}
                        placeholder="在此填入网图直链，或点击上方直接选择本地文件"
                        className="bg-transparent border-b border-glass-border focus:border-accent-blue outline-none py-1 text-xs font-mono text-text-secondary"
                      />
                    </div>
                  </div>
                  <div className="flex justify-start items-start">
                    <button onClick={() => removeProject(p.id)} className="p-2 text-text-secondary hover:text-accent-orange transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'pricing' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col gap-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium tracking-widest text-text-primary">价格配置管理</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const newId = 'p' + Date.now();
                      setPricing([...pricing, { id: newId, name: '新空间', en: 'New Space', price: '0', unit: '起/张', iconType: 'Sofa', category: 'single' }]);
                    }} 
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs tracking-wider transition-colors border border-glass-border"
                  >
                    <Plus className="w-4 h-4" /> 添加单空间
                  </button>
                  <button 
                    onClick={() => {
                      const newId = 'pkg' + Date.now();
                      setPricing([...pricing, { id: newId, name: '新套餐', en: 'New Package', price: '0', unit: '起/套', iconType: 'Package', category: 'package' }]);
                    }} 
                    className="flex items-center gap-2 px-4 py-2 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded-lg text-xs tracking-wider transition-colors border border-accent-blue/20"
                  >
                    <Plus className="w-4 h-4" /> 添加套餐
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pricing.map((p, index) => (
                  <div key={p.id} className="p-5 bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-xl relative group">
                    <button 
                      onClick={() => setPricing(pricing.filter(item => item.id !== p.id))}
                      className="absolute top-4 right-4 p-2 bg-black/40 text-text-secondary hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase tracking-widest">分类 (Category)</label>
                          <select 
                            value={p.category || 'single'}
                            onChange={(e) => {
                              const newPricing = [...pricing];
                              newPricing[index].category = e.target.value as 'single' | 'package';
                              setPricing(newPricing);
                            }}
                            className="bg-black/50 border border-glass-border rounded-lg focus:border-accent-blue outline-none px-3 py-2 text-sm text-text-primary appearance-none"
                          >
                            <option value="single">单空间表现</option>
                            <option value="package">打包套餐</option>
                          </select>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase tracking-widest">图标 (Icon)</label>
                          <select 
                            value={p.iconType}
                            onChange={(e) => {
                              const newPricing = [...pricing];
                              newPricing[index].iconType = e.target.value as any;
                              setPricing(newPricing);
                            }}
                            className="bg-black/50 border border-glass-border rounded-lg focus:border-accent-blue outline-none px-3 py-2 text-sm text-text-primary appearance-none"
                          >
                            <option value="Sofa">沙发 (Sofa)</option>
                            <option value="BedDouble">床 (Bed)</option>
                            <option value="Bath">卫浴 (Bath)</option>
                            <option value="BookOpen">书本 (Book)</option>
                            <option value="Package">套餐 (Package)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase tracking-widest">中文名称 (Name)</label>
                          <input 
                            value={p.name}
                            onChange={(e) => {
                              const newPricing = [...pricing];
                              newPricing[index].name = e.target.value;
                              setPricing(newPricing);
                            }}
                            className="bg-transparent border-b border-glass-border focus:border-accent-blue outline-none py-1 text-sm text-text-primary"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase tracking-widest">英文名称 (EN)</label>
                          <input 
                            value={p.en}
                            onChange={(e) => {
                              const newPricing = [...pricing];
                              newPricing[index].en = e.target.value;
                              setPricing(newPricing);
                            }}
                            className="bg-transparent border-b border-glass-border focus:border-accent-blue outline-none py-1 text-sm text-text-primary"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase tracking-widest">价格 (Price)</label>
                          <div className="flex items-center gap-2">
                            <span className="text-text-secondary">¥</span>
                            <input 
                              value={p.price}
                              onChange={(e) => {
                                const newPricing = [...pricing];
                                newPricing[index].price = e.target.value;
                                setPricing(newPricing);
                              }}
                              className="bg-transparent border-b border-glass-border focus:border-accent-blue outline-none py-1 text-sm text-text-primary w-full"
                            />
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="text-[10px] text-text-secondary uppercase tracking-widest">单位 (Unit)</label>
                          <input 
                            value={p.unit}
                            onChange={(e) => {
                              const newPricing = [...pricing];
                              newPricing[index].unit = e.target.value;
                              setPricing(newPricing);
                            }}
                            className="bg-transparent border-b border-glass-border focus:border-accent-blue outline-none py-1 text-sm text-text-primary"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'submissions' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col gap-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium tracking-widest text-text-primary">来自客厅的需求单</h3>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center text-text-secondary bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-xl">
                  暂无收到的需求单
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="p-4 bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-xl flex flex-col gap-4">
                      <div className="flex justify-between items-start border-b border-glass-border pb-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                            {sub.desc}
                            {sub.state?.uploadedFiles?.length > 0 && (
                              <span className="bg-white/10 text-text-secondary text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                <FileArchive className="w-3 h-3" /> {sub.state.uploadedFiles.length} 附件
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-text-secondary">{sub.client} · {sub.date}</span>
                        </div>
                        <button 
                          onClick={() => {
                            apiDelete(`/api/submissions/${sub.id}`).catch(() => {});
                            setSubmissions(prev => prev.filter(s => s.id !== sub.id));
                          }}
                          className="p-2 text-text-secondary hover:text-accent-orange transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="aspect-video bg-[#111] rounded-lg overflow-hidden relative group cursor-pointer border border-glass-border" onClick={() => setViewingSubmission(sub)}>
                        <img src={sub.image} alt={sub.desc} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="flex items-center gap-2 text-white text-sm bg-black/80 px-4 py-2 rounded-full backdrop-blur-sm">
                            <Eye className="w-4 h-4" /> 查看需求面板
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => setViewingSubmission(sub)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded-lg transition-colors">
                           查看完整面板
                         </button>
                         <button 
                           onClick={() => {
                             const newId = 'Q-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                             const newQueueItem = { id: newId, client: sub.client, desc: sub.desc, date: new Date().toISOString().split('T')[0] };
                             setKanban({
                               ...kanban,
                               '需求排队 | Queue': [...kanban['需求排队 | Queue'], newQueueItem]
                             });
                             apiDelete(`/api/submissions/${sub.id}`).catch(() => {});
                             setSubmissions(prev => prev.filter(s => s.id !== sub.id));
                             alert('已转入需求排队看板！');
                           }}
                           className="flex-1 py-2 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue text-xs rounded-lg transition-colors border border-accent-blue/20"
                         >
                           转入看板排队
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col h-[600px] bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="h-16 border-b border-white/10 bg-[#222] flex items-center px-6 shrink-0">
                <div>
                  <h3 className="text-sm font-medium text-white">访客对话 / 客户沟通</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">实时接收前台客户消息并回复</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[#111]">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-text-secondary opacity-50">
                    暂无聊天记录
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender === 'admin';
                    return (
                      <div key={msg.id} className={cn("flex flex-col max-w-[70%]", isAdmin ? "self-end items-end" : "self-start items-start")}>
                        <div className="flex items-end gap-2 mb-1">
                          {!isAdmin && <span className="text-[10px] text-text-secondary">客户</span>}
                          <span className="text-[9px] text-white/30">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div 
                          className={cn(
                            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                            isAdmin 
                              ? "bg-accent-blue text-white rounded-br-sm" 
                              : "bg-white/10 text-white rounded-bl-sm"
                          )}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleAdminSend} className="p-4 bg-[#222] border-t border-white/10 flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="输入回复内容..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-blue/50 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-12 h-12 bg-accent-blue text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-blue/90 transition-colors shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* Modal for viewing submission */}
        {viewingSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-xl" onClick={() => setViewingSubmission(null)}>
            <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#161616]">
                <h3 className="text-white text-sm tracking-widest font-medium">客户需求单面板快照</h3>
                <button onClick={() => setViewingSubmission(null)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#0a0a0a] relative">
                <SubmissionViewer state={viewingSubmission.state} />
                
                {/* Uploaded Files Overlay in Viewer */}
                {viewingSubmission.state?.uploadedFiles?.length > 0 && (
                  <div className="absolute top-6 right-6 w-64 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl p-4 z-30 max-h-[50vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xs font-medium text-text-primary mb-3 flex items-center justify-between">
                      <span>附件文件 ({viewingSubmission.state.uploadedFiles.length})</span>
                    </h3>
                    <div className="flex flex-col gap-2">
                      {viewingSubmission.state.uploadedFiles.map((file: any) => (
                        <div key={file.id} className="flex items-start gap-3 p-2 bg-white/5 rounded-lg group">
                          {file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar') ? (
                            <FileArchive className="w-6 h-6 text-text-secondary shrink-0 mt-0.5" />
                          ) : file.name.toLowerCase().endsWith('.dwg') || file.name.toLowerCase().endsWith('.dxf') ? (
                            <FileCode2 className="w-6 h-6 text-text-secondary shrink-0 mt-0.5" />
                          ) : (
                            <FileText className="w-6 h-6 text-text-secondary shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary truncate" title={file.name}>{file.name}</p>
                            <p className="text-[10px] text-text-secondary mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-text-secondary hover:text-white transition-all shrink-0" title="此为演示数据，无法下载">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
