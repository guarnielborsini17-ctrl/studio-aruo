import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { apiGet, apiPost, apiPut } from './lib/api';
import { Gallery } from './pages/Gallery';
import { CanvasSubmission } from './pages/CanvasSubmission';
import { Admin } from './pages/Admin';
import { Pricing } from './pages/Pricing';
import { Guide } from './pages/Guide';

// --- Context for persisting Gallery state across route changes ---
const INITIAL_PROJECTS = [
  { id: 1, type: 'Commercial', name: 'AURA TOWER LOBBY', img: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?w=1600&q=80', style: 'Minimalist / Concrete' },
  { id: 2, type: 'Residential', name: 'VILLA NOVA', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80', style: 'Warm Organic' },
  { id: 3, type: 'Commercial', name: 'THE VERTEX', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80', style: 'Brutalist / Glass' },
  { id: 4, type: 'Residential', name: 'ALPINE RETREAT', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80', style: 'Wood / Cozy' },
];

export type ProjectType = typeof INITIAL_PROJECTS[0];

interface ProjectContextType {
  projects: ProjectType[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectType[]>>;
}

export const ProjectContext = createContext<ProjectContextType>({
  projects: INITIAL_PROJECTS,
  setProjects: () => {},
});

// --- Kanban Context ---
export const INITIAL_KANBAN = {
  '需求排队 | Queue': [
    { id: 'Q-01', client: 'Lumina Architects', desc: 'Hotel Lobby View', date: '2026-11-20' },
    { id: 'Q-02', client: 'Studio One', desc: 'Exterior Residence', date: '2026-11-25' },
  ],
  '建模/深化 | Modeling': [
    { id: 'M-01', client: 'Maison Design', desc: 'Living Room Detail', date: '2026-11-15' },
  ],
  '渲染/后期 | Rendering': [
    { id: 'R-01', client: 'Aero Space', desc: 'Kitchen Concept', date: '2026-11-10' },
  ],
  '已交付 | Delivered': [
    { id: 'D-01', client: 'Nova Build', desc: 'Master Plan Aerial', date: '2026-11-05' },
    { id: 'D-02', client: 'Nova Build', desc: 'Balcony Shot', date: '2026-11-06' },
  ]
};

export type KanbanType = typeof INITIAL_KANBAN;

interface KanbanContextType {
  kanban: KanbanType;
  setKanban: React.Dispatch<React.SetStateAction<KanbanType>>;
}

export const KanbanContext = createContext<KanbanContextType>({
  kanban: INITIAL_KANBAN,
  setKanban: () => {},
});

// --- Status Context ---
const INITIAL_STATUS = {
  isBusy: true,
  availableDate: '2026-05-01',
};

export type StatusType = typeof INITIAL_STATUS;

interface StatusContextType {
  status: StatusType;
  setStatus: React.Dispatch<React.SetStateAction<StatusType>>;
}

export const StatusContext = createContext<StatusContextType>({
  status: INITIAL_STATUS,
  setStatus: () => {},
});

// --- Submissions Context ---
export type SubmissionType = {
  id: string;
  date: string;
  client: string;
  desc: string;
  image: string; // Base64 image of the canvas (preview)
  state: any; // Raw JSON data of the canvas state for further editing
};

interface SubmissionsContextType {
  submissions: SubmissionType[];
  setSubmissions: React.Dispatch<React.SetStateAction<SubmissionType[]>>;
}

export const SubmissionsContext = createContext<SubmissionsContextType>({
  submissions: [],
  setSubmissions: () => {},
});

// --- Workspace Context ---
export type WorkspaceType = {
  folders: any[];
  activeBoardId: string;
  boardDataStore: Record<string, any>;
};

const INITIAL_WORKSPACE = {
  folders: [
    {
      id: 'f1',
      name: '我的项目库',
      expanded: true,
      boards: [ { id: 'b1', name: '首个画板', submissionId: null } ]
    }
  ],
  activeBoardId: 'b1',
  boardDataStore: {
    'b1': { baseImages: [], shapes: [], history: [[]], historyStep: 0, submissionId: null }
  }
};

interface WorkspaceContextType {
  workspace: WorkspaceType;
  setWorkspace: React.Dispatch<React.SetStateAction<WorkspaceType>>;
}

export const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: INITIAL_WORKSPACE,
  setWorkspace: () => {},
});

// --- Pricing Context ---
export type PricingItemType = {
  id: string;
  name: string;
  en: string;
  price: string;
  unit: string;
  iconType: 'Sofa' | 'BedDouble' | 'Bath' | 'BookOpen' | 'Package';
  category: 'single' | 'package';
};

const INITIAL_PRICING: PricingItemType[] = [
  { 
    id: 'p1',
    name: '客厅空间', 
    en: 'Living Room',
    price: '300', 
    unit: '起/张', 
    iconType: 'Sofa',
    category: 'single'
  },
  { 
    id: 'p2',
    name: '卧室空间', 
    en: 'Bedroom',
    price: '200', 
    unit: '起/张', 
    iconType: 'BedDouble',
    category: 'single'
  },
  { 
    id: 'p3',
    name: '厨卫空间', 
    en: 'Kitchen & Bath',
    price: '100', 
    unit: '起/张', 
    iconType: 'Bath',
    category: 'single'
  },
  { 
    id: 'p4',
    name: '书房/多功能房', 
    en: 'Study & Multi-use',
    price: '150', 
    unit: '起/张', 
    iconType: 'BookOpen',
    category: 'single'
  },
  {
    id: 'pkg1',
    name: '全屋标准套餐',
    en: 'Standard Package',
    price: '1000',
    unit: '起/套',
    iconType: 'Package',
    category: 'package'
  },
  {
    id: 'pkg2',
    name: '尊享全案套餐',
    en: 'Premium Package',
    price: '1200',
    unit: '起/套',
    iconType: 'Package',
    category: 'package'
  }
];

interface PricingContextType {
  pricing: PricingItemType[];
  setPricing: React.Dispatch<React.SetStateAction<PricingItemType[]>>;
}

export const PricingContext = createContext<PricingContextType>({
  pricing: INITIAL_PRICING,
  setPricing: () => {},
});

// --- Chat Context ---
export type MessageType = {
  id: string;
  sender: 'client' | 'admin';
  text: string;
  timestamp: number;
};

interface ChatContextType {
  messages: MessageType[];
  addMessage: (sender: 'client' | 'admin', text: string) => void;
  unreadCount: { client: number; admin: number };
  clearUnread: (role: 'client' | 'admin') => void;
}

export const ChatContext = createContext<ChatContextType>({
  messages: [],
  addMessage: () => {},
  unreadCount: { client: 0, admin: 0 },
  clearUnread: () => {},
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Load initial states from localStorage if available
  const [projects, setProjects] = useState<ProjectType[]>(() => {
    const saved = localStorage.getItem('aruo_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [kanban, setKanban] = useState<KanbanType>(() => {
    const saved = localStorage.getItem('aruo_kanban');
    return saved ? JSON.parse(saved) : INITIAL_KANBAN;
  });

  const [status, setStatus] = useState<StatusType>(() => {
    const saved = localStorage.getItem('aruo_status');
    return saved ? JSON.parse(saved) : INITIAL_STATUS;
  });

  const [submissions, setSubmissions] = useState<SubmissionType[]>(() => {
    const saved = localStorage.getItem('aruo_submissions');
    return saved ? JSON.parse(saved) : [];
  });

  const [workspace, setWorkspace] = useState<WorkspaceType>(() => {
    const saved = localStorage.getItem('aruo_workspace');
    return saved ? JSON.parse(saved) : INITIAL_WORKSPACE;
  });
  
  const [pricing, setPricing] = useState<PricingItemType[]>(() => {
    const saved = localStorage.getItem('aruo_pricing');
    return saved ? JSON.parse(saved) : INITIAL_PRICING;
  });

  const [messages, setMessages] = useState<MessageType[]>(() => {
    const saved = localStorage.getItem('aruo_chat');
    return saved ? JSON.parse(saved) : [];
  });

  const [unreadCount, setUnreadCount] = useState<{client: number, admin: number}>(() => {
    const saved = localStorage.getItem('aruo_chat_unread');
    return saved ? JSON.parse(saved) : { client: 0, admin: 0 };
  });

  const [apiAvailable, setApiAvailable] = useState(false);
  const messagesRef = useRef<MessageType[]>(messages);
  const pricingSyncRef = useRef<string>('');
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ ok: boolean }>('/api/health')
      .then(async () => {
        if (cancelled) return;
        setApiAvailable(true);
        const [serverSubmissions, serverPricing, serverMessages] = await Promise.all([
          apiGet<SubmissionType[]>('/api/submissions'),
          apiGet<PricingItemType[]>('/api/pricing'),
          apiGet<MessageType[]>('/api/chat/messages'),
        ]);

        if (cancelled) return;
        setSubmissions(serverSubmissions);
        if (serverPricing.length > 0) {
          pricingSyncRef.current = JSON.stringify(serverPricing);
          setPricing(serverPricing);
        } else {
          pricingSyncRef.current = JSON.stringify(INITIAL_PRICING);
          setPricing(INITIAL_PRICING);
          apiPut('/api/pricing', INITIAL_PRICING).catch(() => {});
        }
        setMessages(serverMessages);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiAvailable) return;
    const es = new EventSource('/api/events');

    const refreshSubmissions = async () => {
      try {
        const next = await apiGet<SubmissionType[]>('/api/submissions');
        setSubmissions(next);
      } catch {}
    };

    const refreshPricing = async () => {
      try {
        const next = await apiGet<PricingItemType[]>('/api/pricing');
        if (next.length > 0) {
          pricingSyncRef.current = JSON.stringify(next);
          setPricing(next);
        }
      } catch {}
    };

    es.addEventListener('submissions_updated', () => {
      refreshSubmissions();
    });

    es.addEventListener('pricing_updated', () => {
      refreshPricing();
    });

    es.addEventListener('chat_message', (ev) => {
      try {
        const msg = JSON.parse((ev as MessageEvent).data) as MessageType & { reset?: boolean };
        if ((msg as any).reset) {
          setMessages([]);
          return;
        }
        if (!msg?.id) return;
        if (messagesRef.current.some((m) => m.id === msg.id)) return;
        setMessages((prev) => [...prev, msg]);
        setUnreadCount((prev) => {
          const updated = {
            client: msg.sender === 'admin' ? prev.client + 1 : prev.client,
            admin: msg.sender === 'client' ? prev.admin + 1 : prev.admin,
          };
          return updated;
        });
      } catch {}
    });

    es.addEventListener('error', () => {});

    return () => {
      es.close();
    };
  }, [apiAvailable]);

  const addMessage = (sender: 'client' | 'admin', text: string) => {
    const newMsg: MessageType = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender,
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMsg]);
    if (apiAvailable) {
      apiPost<MessageType>('/api/chat/messages', newMsg).catch(() => {});
    }
    setUnreadCount(prev => {
      const updated = {
        client: sender === 'admin' ? prev.client + 1 : prev.client,
        admin: sender === 'client' ? prev.admin + 1 : prev.admin,
      };
      return updated;
    });
  };

  const clearUnread = (role: 'client' | 'admin') => {
    setUnreadCount(prev => {
      const updated = { ...prev, [role]: 0 };
      return updated;
    });
  };

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('aruo_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('aruo_kanban', JSON.stringify(kanban));
  }, [kanban]);

  useEffect(() => {
    localStorage.setItem('aruo_status', JSON.stringify(status));
  }, [status]);

  useEffect(() => {
    localStorage.setItem('aruo_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('aruo_pricing', JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    localStorage.setItem('aruo_chat', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('aruo_chat_unread', JSON.stringify(unreadCount));
  }, [unreadCount]);

  useEffect(() => {
    // Only store stringifiable parts of workspace (no HTMLImageElements)
    const storableWorkspace = {
      ...workspace,
      boardDataStore: Object.entries(workspace.boardDataStore).reduce((acc: any, [key, value]: [string, any]) => {
        acc[key] = {
          ...value,
          baseImages: value.baseImages.map((img: any) => ({ ...img, image: img.image?.src || img.image }))
        };
        return acc;
      }, {})
    };
    localStorage.setItem('aruo_workspace', JSON.stringify(storableWorkspace));
  }, [workspace]);

  useEffect(() => {
    if (!apiAvailable) return;
    const pricingJson = JSON.stringify(pricing);
    if (pricingJson === pricingSyncRef.current) return;
    pricingSyncRef.current = pricingJson;
    const t = window.setTimeout(() => {
      apiPut('/api/pricing', pricing).catch(() => {});
    }, 400);
    return () => window.clearTimeout(t);
  }, [apiAvailable, pricing]);

  const projValue = useMemo(() => ({ projects, setProjects }), [projects]);
  const kanbanValue = useMemo(() => ({ kanban, setKanban }), [kanban]);
  const statusValue = useMemo(() => ({ status, setStatus }), [status]);
  const submissionsValue = useMemo(() => ({ submissions, setSubmissions }), [submissions]);
  const workspaceValue = useMemo(() => ({ workspace, setWorkspace }), [workspace]);
  const pricingValue = useMemo(() => ({ pricing, setPricing }), [pricing]);
  const chatValue = useMemo(() => ({ messages, addMessage, unreadCount, clearUnread }), [messages, unreadCount]);

  return (
    <ProjectContext.Provider value={projValue}>
      <KanbanContext.Provider value={kanbanValue}>
        <StatusContext.Provider value={statusValue}>
          <SubmissionsContext.Provider value={submissionsValue}>
            <WorkspaceContext.Provider value={workspaceValue}>
              <PricingContext.Provider value={pricingValue}>
                <ChatContext.Provider value={chatValue}>
                  {children}
                </ChatContext.Provider>
              </PricingContext.Provider>
            </WorkspaceContext.Provider>
          </SubmissionsContext.Provider>
        </StatusContext.Provider>
      </KanbanContext.Provider>
    </ProjectContext.Provider>
  );
}
// -----------------------------------------------------------------

function Navigation() {
  const location = useLocation();
  const { status } = useContext(StatusContext);

  const links = [
    { href: '/', label: '阿鶸的作品库', number: '01' },
    { href: '/pricing', label: '价格参考', number: '02' },
    { href: '/submit', label: '需求交互版', number: '03' },
    { href: '/guide', label: '服务与手册', number: '04' },
    { href: '/admin', label: '后台管理', number: '05' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 p-6 flex justify-between items-start pointer-events-none">
      <div className="flex items-center gap-6 pointer-events-auto mix-blend-difference">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-serif italic tracking-wider text-white">Studio Aruo</h1>
          <p className="text-[10px] uppercase tracking-widest text-text-secondary">协作系统 v1.0</p>
        </div>

        {/* Global Status Pill next to Logo */}
        <div className="hidden md:flex items-center ml-8 h-10 px-5 bg-[rgba(255,255,255,0.02)] border border-glass-border rounded-full shadow-lg backdrop-blur-md transition-all hover:bg-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 mr-4 pr-4 border-r border-glass-border">
            <div className={`w-1.5 h-1.5 rounded-full ${status.isBusy ? 'bg-accent-orange shadow-[0_0_8px_rgba(255,107,74,0.6)]' : 'bg-status-green shadow-[0_0_8px_rgba(74,255,148,0.6)]'}`} />
            <span className="text-xs font-medium text-white">{status.isBusy ? '繁忙状态 / Busy' : '空闲可接单 / Available'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-secondary uppercase tracking-widest">最早可排期日期</span>
            <span className="text-xs font-mono text-white tracking-wider">{status.availableDate}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-8 pointer-events-auto mix-blend-difference">
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link 
              key={link.href} 
              to={link.href}
              className={cn(
                "group flex flex-col items-end gap-1 text-right transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-40 hover:opacity-100"
              )}
            >
              <span className="text-[10px] font-mono tracking-widest text-text-secondary">{link.number}</span>
              <span className="text-xs uppercase tracking-widest font-medium text-text-primary">{link.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="nav-indicator"
                  className="w-full h-[2px] bg-accent-blue mt-1"
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Gallery />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/submit" element={<CanvasSubmission />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Router>
        <div className="fluid-bg" />
        <Navigation />
        <main className="min-h-screen pt-32 pb-16 px-6 md:px-12 lg:px-24">
          <AnimatedRoutes />
        </main>
      </Router>
    </DataProvider>
  );
}
