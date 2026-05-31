import React, { useState, useRef, useEffect, useContext } from 'react';
import { PageTransition } from '../components/PageTransition';
import { FloatingChat } from '../components/FloatingChat';
import { motion } from 'motion/react';
import { Stage, Layer, Arrow, Circle, Rect, Image as KonvaImage, Transformer, Text } from 'react-konva';
import useImage from 'use-image';
import { Plus, MoveUpRight, Circle as CircleIcon, Upload, Trash2, Camera, MousePointer2, Type, Undo2, Square, Download, X, Check, Folder, FileText, ChevronDown, ChevronRight, MoreVertical, FileArchive, FileCode2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiPost } from '../lib/api';
import { SubmissionsContext, WorkspaceContext } from '../App';

export function CanvasSubmission() {
  const { workspace, setWorkspace } = useContext(WorkspaceContext);

  const [folders, setFolders] = useState(workspace.folders);
  const [activeBoardId, setActiveBoardId] = useState(workspace.activeBoardId);
  const boardDataStore = useRef<Record<string, any>>(workspace.boardDataStore);

  const [tool, setTool] = useState<'cursor' | 'arrow' | 'circle' | 'rect' | 'text'>('cursor');
  const [shapes, setShapes] = useState<any[]>(workspace.boardDataStore[workspace.activeBoardId]?.shapes || []);
  const [baseImages, setBaseImages] = useState<any[]>(workspace.boardDataStore[workspace.activeBoardId]?.baseImages || []);
  const [history, setHistory] = useState<any[][]>(workspace.boardDataStore[workspace.activeBoardId]?.history || [[]]);
  const [historyStep, setHistoryStep] = useState(workspace.boardDataStore[workspace.activeBoardId]?.historyStep || 0);
  const [submissionId, setSubmissionId] = useState<string | null>(workspace.boardDataStore[workspace.activeBoardId]?.submissionId || null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>(workspace.boardDataStore[workspace.activeBoardId]?.uploadedFiles || []);

  const [newShape, setNewShape] = useState<any>(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const [toastMsg, setToastMsg] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const stageRef = useRef<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSelecting = useRef(false);
  const [selectionRect, setSelectionRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string, id?: string, relativePos: {x:number, y:number}, fontSize: number } | null>(null);

  useEffect(() => {
    // Restore HTMLImageElements from src strings when loading from local storage
    if (baseImages.length > 0 && typeof baseImages[0].image === 'string') {
      Promise.all(baseImages.map((imgData: any) => {
        return new Promise((resolve) => {
          const img = new window.Image();
          img.src = imgData.image;
          img.onload = () => resolve({ ...imgData, image: img });
        });
      })).then((loadedImages: any) => {
        setBaseImages(loadedImages);
      });
    }
  }, []);

  // Sync back to workspace context whenever data changes
  useEffect(() => {
    boardDataStore.current[activeBoardId] = { baseImages, shapes, history, historyStep, submissionId, uploadedFiles };
    setWorkspace({
      folders,
      activeBoardId,
      boardDataStore: boardDataStore.current
    });
  }, [folders, activeBoardId, baseImages, shapes, history, historyStep, submissionId, uploadedFiles, setWorkspace]);

  const switchBoard = (newBoardId: string) => {
    if (newBoardId === activeBoardId) return;
    boardDataStore.current[activeBoardId] = { baseImages, shapes, history, historyStep, submissionId, uploadedFiles };
    const newBoard = boardDataStore.current[newBoardId] || { baseImages: [], shapes: [], history: [[]], historyStep: 0, submissionId: null, uploadedFiles: [] };
    
    // Convert base64 images back to HTMLImageElements when switching boards
    if (newBoard.baseImages.length > 0 && typeof newBoard.baseImages[0].image === 'string') {
      Promise.all(newBoard.baseImages.map((imgData: any) => {
        return new Promise((resolve) => {
          const img = new window.Image();
          img.src = imgData.image;
          img.onload = () => resolve({ ...imgData, image: img });
        });
      })).then((loadedImages: any) => {
        setBaseImages(loadedImages);
        setShapes(newBoard.shapes);
        setHistory(newBoard.history);
        setHistoryStep(newBoard.historyStep);
        setSubmissionId(newBoard.submissionId || null);
        setUploadedFiles(newBoard.uploadedFiles || []);
        setSelectedIds([]);
        setShowToolbar(false);
        setActiveBoardId(newBoardId);
      });
    } else {
      setBaseImages(newBoard.baseImages);
      setShapes(newBoard.shapes);
      setHistory(newBoard.history);
      setHistoryStep(newBoard.historyStep);
      setSubmissionId(newBoard.submissionId || null);
      setUploadedFiles(newBoard.uploadedFiles || []);
      setSelectedIds([]);
      setShowToolbar(false);
      setActiveBoardId(newBoardId);
    }
  };

  const addFolder = () => {
    const newFolderId = `f-${Date.now()}`;
    const newBoardId = `b-${Date.now()}`;
    setFolders([...folders, {
      id: newFolderId,
      name: '新建项目文件夹',
      expanded: true,
      boards: [{ id: newBoardId, name: '未命名画板', submissionId: null }]
    }]);
    switchBoard(newBoardId);
  };

  const addBoardToFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newBoardId = `b-${Date.now()}`;
    setFolders(folders.map(f => {
      if (f.id === folderId) {
        return { ...f, expanded: true, boards: [...f.boards, { id: newBoardId, name: '新画板', submissionId: null }] };
      }
      return f;
    }));
    switchBoard(newBoardId);
  };

  const toggleFolder = (folderId: string) => {
    setFolders(folders.map(f => f.id === folderId ? { ...f, expanded: !f.expanded } : f));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const trRef = useRef<any>(null);
  const { setSubmissions } = useContext(SubmissionsContext);

  const submitRequirement = () => {
    if (!stageRef.current) return;
    if (baseImages.length === 0 && shapes.length === 0 && uploadedFiles.length === 0) {
      setToastMsg('❌ 画板和附件均为空，请先添加内容再提交！');
      setTimeout(() => setToastMsg(''), 3000);
      return;
    }

    setSelectedIds([]);
    setShowToolbar(false);
    
    setTimeout(() => {
      if (!stageRef.current) return;
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      
      const submissionData = {
        id: submissionId || `SUB-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        client: '当前访客',
        desc: folders.flatMap(f => f.boards).find(b => b.id === activeBoardId)?.name || '未命名需求',
        image: dataURL,
        state: {
          baseImages: baseImages.map(img => ({ 
            ...img, 
            image: img.image?.src || img.image // safe check
          })),
          shapes: shapes,
          scale: stageRef.current.scaleX(),
          position: stageRef.current.position(),
          uploadedFiles: uploadedFiles
        }
      };

      (async () => {
        let finalData: any = submissionData;
        try {
          finalData = await apiPost<any>('/api/submissions', submissionData);
        } catch {}

        if (submissionId) {
          setSubmissions(prev => prev.map(s => s.id === submissionId ? finalData : s));
          setToastMsg('✅ 需求单已成功更新至后台！');
        } else {
          setSubmissionId(finalData.id);
          setSubmissions(prev => [finalData, ...prev]);
          setToastMsg('✅ 需求单已成功提交至后台！');
        }

        setTimeout(() => setToastMsg(''), 3000);
      })();
    }, 100);
  };

  useEffect(() => {
    if (selectedIds.length > 0 && trRef.current && stageRef.current) {
      const nodes = selectedIds.map(id => stageRef.current.findOne(`#${id}`)).filter(Boolean);
      trRef.current.nodes(nodes);
      trRef.current.getLayer().batchDraw();
    } else if (trRef.current) {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, tool, baseImages]);

  const processFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const otherFiles = files.filter(f => !f.type.startsWith('image/'));

    if (otherFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...otherFiles.map(f => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream'
      }))]);
      setToastMsg(`✅ 已添加 ${otherFiles.length} 个附件文件`);
      setTimeout(() => setToastMsg(''), 3000);
    }

    if (imageFiles.length === 0) return;

    const loadedImages = await Promise.all(imageFiles.map(file => {
      return new Promise<{img: HTMLImageElement, id: string}>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.src = url;
        img.onload = () => resolve({ img, id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` });
      });
    }));

    setBaseImages(prev => {
      const width = dimensions.width > 0 ? dimensions.width : (containerRef.current?.clientWidth || 1000);
      const isMultiple = prev.length + loadedImages.length > 1;
      const cols = isMultiple ? Math.min(4, loadedImages.length + prev.length > 3 ? 3 : loadedImages.length) : 1;
      const gap = 20;
      const totalWidth = isMultiple ? width * 0.8 : width * 0.6;
      const colWidth = (totalWidth - (cols - 1) * gap) / cols;
      const colHeights = new Array(cols).fill(0);
      
      const maxY = prev.length > 0 ? Math.max(...prev.map(img => img.y + img.height)) + 50 : 50;
      const offsetX = isMultiple ? width * 0.1 : width * 0.2;

      const appendedImages = loadedImages.map(({img, id}) => {
        const minHeight = Math.min(...colHeights);
        const colIndex = colHeights.indexOf(minHeight);

        const x = offsetX + colIndex * (colWidth + gap);
        const y = maxY + minHeight;
        const height = img.height * (colWidth / img.width);

        colHeights[colIndex] += height + gap;

        return { id, image: img, x, y, width: colWidth, height };
      });

      return [...prev, ...appendedImages];
    });
    
    setShowToolbar(true);
    setTool('cursor');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) processFiles(files);
  };
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  const saveHistory = (newShapes: any[]) => {
    const nextHistory = history.slice(0, historyStep + 1);
    nextHistory.push(newShapes);
    setHistory(nextHistory);
    setHistoryStep(nextHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setShapes(history[prevStep]);
      setHistoryStep(prevStep);
    }
  };

  const downloadCanvas = () => {
    if (!stageRef.current) return;
    setSelectedIds([]);
    setTimeout(() => {
      if (!stageRef.current) return;
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      const link = document.createElement('a');
      link.download = 'annotation.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToastMsg('✨ 图片已保存到本地！');
      setTimeout(() => setToastMsg(''), 3000);
    }, 60);
  };

  const copyCanvasToClipboard = async () => {
    if (!stageRef.current) return;
    try {
      setSelectedIds([]); // Hide transformer box before capture
      setTimeout(async () => {
        if (!stageRef.current) return;
        const dataURL = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
        const res = await fetch(dataURL);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setToastMsg('✨ 画布已复制到剪贴板！(可往飞书/微信直接粘贴)');
        setTimeout(() => setToastMsg(''), 3000);
      }, 60);
    } catch (err) {
      console.error('Copy failed:', err);
      setToastMsg('❌ 复制失败，请确保浏览器允许剪贴板权限');
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyCanvasToClipboard();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          setBaseImages(prev => prev.filter(img => !selectedIds.includes(img.id)));
          setShapes(prev => {
            const newShapes = prev.filter(shape => !selectedIds.includes(shape.id));
            if (newShapes.length !== prev.length) {
              saveHistory(newShapes);
            }
            return newShapes;
          });
          setSelectedIds([]);
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        processFiles(files);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [history, historyStep, selectedIds]);

  const handleMouseDown = (e: any) => {
    if (e.evt && e.evt.button === 1) {
      e.evt.preventDefault();
      isPanning.current = true;
      lastPanPosition.current = { x: e.evt.clientX, y: e.evt.clientY };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage();
    
    if (tool === 'cursor') {
      if (clickedOnEmpty) {
        setSelectedIds([]);
        setShowToolbar(false);
        if (e.evt && e.evt.button === 0) { // start marquee
          isSelecting.current = true;
          const stage = e.target.getStage();
          const pos = stage.getRelativePointerPosition() || stage.getPointerPosition();
          setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
        }
      } else {
        setShowToolbar(true);
        const targetId = e.target.id();
        if (targetId) {
          if (e.evt && e.evt.shiftKey) {
            setSelectedIds(prev => prev.includes(targetId) ? prev : [...prev, targetId]);
          } else if (!selectedIds.includes(targetId)) {
            setSelectedIds([targetId]);
          }
        } else {
          setSelectedIds([]);
        }
      }
      return;
    }

    if (clickedOnEmpty) {
      setSelectedIds([]);
    }

    if (tool === 'text') {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const relativePos = stage.getRelativePointerPosition() || pos;
      setTextInput({ x: pos.x, y: pos.y, value: '', relativePos, fontSize: 24 });
      return;
    }

    isDrawing.current = true;
    const pos = e.target.getStage().getRelativePointerPosition() || e.target.getStage().getPointerPosition();
    if (tool === 'arrow') {
      setNewShape({ type: 'arrow', points: [pos.x, pos.y, pos.x, pos.y], id: Date.now().toString() });
    } else if (tool === 'circle') {
      setNewShape({ type: 'circle', x: pos.x, y: pos.y, radius: 0, id: Date.now().toString() });
    } else if (tool === 'rect') {
      setNewShape({ type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0, id: Date.now().toString() });
    }
  };

  const handleMouseMove = (e: any) => {
    if (isPanning.current) {
      e.evt?.preventDefault();
      const stage = e.target.getStage();
      const dx = e.evt.clientX - lastPanPosition.current.x;
      const dy = e.evt.clientY - lastPanPosition.current.y;
      stage.position({
        x: stage.x() + dx,
        y: stage.y() + dy,
      });
      lastPanPosition.current = { x: e.evt.clientX, y: e.evt.clientY };
      stage.batchDraw();
      return;
    }

    if (isSelecting.current) {
      const stage = e.target.getStage();
      const point = stage.getRelativePointerPosition() || stage.getPointerPosition();
      setSelectionRect(prev => prev ? { ...prev, width: point.x - prev.x, height: point.y - prev.y } : null);
      return;
    }

    if (!isDrawing.current || !newShape || tool === 'cursor') return;
    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition() || stage.getPointerPosition();

    if (tool === 'arrow') {
      setNewShape({ ...newShape, points: [newShape.points[0], newShape.points[1], point.x, point.y] });
    } else if (tool === 'circle') {
      const dx = point.x - newShape.x;
      const dy = point.y - newShape.y;
      setNewShape({ ...newShape, radius: Math.sqrt(dx * dx + dy * dy) });
    } else if (tool === 'rect') {
      setNewShape({ ...newShape, width: point.x - newShape.x, height: point.y - newShape.y });
    }
  };

  const handleMouseUp = (e: any) => {
    if (isPanning.current) {
      isPanning.current = false;
      if (containerRef.current) containerRef.current.style.cursor = '';
      return;
    }

    if (isSelecting.current) {
      isSelecting.current = false;
      if (selectionRect && stageRef.current) {
        const rectX = Math.min(selectionRect.x, selectionRect.x + selectionRect.width);
        const rectY = Math.min(selectionRect.y, selectionRect.y + selectionRect.height);
        const rectW = Math.abs(selectionRect.width);
        const rectH = Math.abs(selectionRect.height);
        
        if (rectW > 5 && rectH > 5) {
          const box = { x: rectX, y: rectY, width: rectW, height: rectH };
          const selected = baseImages.filter(img => {
            return !(
              img.x > box.x + box.width ||
              img.x + img.width < box.x ||
              img.y > box.y + box.height ||
              img.y + img.height < box.y
            );
          }).map(img => img.id);
          
          if (selected.length > 0) {
             setSelectedIds((prev) => e.evt?.shiftKey ? Array.from(new Set([...prev, ...selected])) : selected);
             setShowToolbar(true);
          }
        }
      }
      setSelectionRect(null);
      return;
    }

    if (isDrawing.current && newShape) {
      const updatedShapes = [...shapes, newShape];
      setShapes(updatedShapes);
      saveHistory(updatedShapes);
      setNewShape(null);
    }
    isDrawing.current = false;
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.value.trim() !== '') {
      let newShapes;
      if (textInput.id) {
        newShapes = shapes.map(s => s.id === textInput.id ? { ...s, text: textInput.value, fontSize: textInput.fontSize } : s);
      } else {
        newShapes = [...shapes, { type: 'text', x: textInput.relativePos.x, y: textInput.relativePos.y, text: textInput.value, fontSize: textInput.fontSize, id: Date.now().toString() }];
      }
      setShapes(newShapes);
      saveHistory(newShapes);
    }
    setTextInput(null);
    setTool('cursor');
  };

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

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
  };

  const handleStageDblClick = (e: any) => {
    // If a Text node was double clicked, let its own handler catch it
    if (e.target?.getClassName && e.target.getClassName() === 'Text') {
      return;
    }
    if (tool === 'cursor') {
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      const relativePos = stage.getRelativePointerPosition() || pos;
      setTextInput({ x: pos.x, y: pos.y, value: '', relativePos, fontSize: 24 });
    }
  };

  return (
    <PageTransition className="flex flex-col h-[calc(100vh-12rem)] w-full">
      <header className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h2 className="text-4xl md:text-5xl font-sans font-light tracking-tight mb-2">自由交互式需求提交</h2>
          <p className="text-text-secondary text-xs tracking-widest uppercase">Canvas Submission / Visual Brief</p>
        </div>
        <button onClick={submitRequirement} className={cn("px-8 py-3 rounded-[8px] font-medium text-[13px] transition-colors", submissionId ? "bg-accent-orange text-white hover:bg-accent-orange/90" : "bg-white text-black hover:bg-white/90")}>
          {submissionId ? "更新需求单" : "提交需求单"}
        </button>
      </header>

      <div className="flex-1 flex gap-6 min-h-0 relative">
        {/* Left Sidebar - Folders & Boards */}
        <div className="w-56 shrink-0 flex flex-col bg-[#161616] md:rounded-[20px] overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="px-4 py-4 border-b border-[rgba(255,255,255,0.05)] flex justify-between items-center group">
            <span className="text-[13px] font-medium text-text-primary tracking-wide">项目管理</span>
            <button onClick={addFolder} className="text-text-secondary hover:text-white transition-colors opacity-0 group-hover:opacity-100" title="新建文件夹">
              <Plus className="w-[14px] h-[14px]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            {folders.map(folder => (
              <div key={folder.id} className="mb-2">
                <div 
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[rgba(255,255,255,0.05)] cursor-pointer text-text-secondary hover:text-text-primary transition-colors group"
                  onClick={() => toggleFolder(folder.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {folder.expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[13px] truncate outline-none select-none" contentEditable suppressContentEditableWarning onBlur={(e) => {
                      const newName = e.currentTarget.textContent || '未命名文件夹';
                      setFolders(folders.map(f => f.id === folder.id ? { ...f, name: newName } : f));
                    }}>{folder.name}</span>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => addBoardToFolder(folder.id, e)} className="p-1 hover:bg-white/10 rounded" title="添加新画板">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      if (folders.length <= 1) {
                         setToastMsg('至少保留一个文件夹');
                         setTimeout(() => setToastMsg(''), 3000);
                         return;
                      }
                      setFolders(folders.filter(f => f.id !== folder.id));
                      // If the folder we delete contains the active board, switch to the first available board
                      if (folder.boards.some(b => b.id === activeBoardId)) {
                        const newFirstBoard = folders.find(f => f.id !== folder.id)?.boards[0];
                        if (newFirstBoard) switchBoard(newFirstBoard.id);
                      }
                    }} className="p-1 hover:bg-white/10 rounded text-red-400 hover:text-red-300 ml-0.5" title="删除文件夹">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {folder.expanded && (
                  <div className="pl-6 mt-1 flex flex-col gap-0.5">
                    {folder.boards.map(board => (
                      <div 
                        key={board.id}
                        onClick={() => switchBoard(board.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group",
                          activeBoardId === board.id ? "bg-accent-blue/20 text-accent-blue" : "text-text-secondary hover:bg-[rgba(255,255,255,0.03)] hover:text-text-primary"
                        )}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[12px] truncate outline-none select-none flex-1" contentEditable suppressContentEditableWarning onBlur={(e) => {
                           const newName = e.currentTarget.textContent || '未命名画板';
                           setFolders(folders.map(f => f.id === folder.id ? { ...f, boards: f.boards.map(b => b.id === board.id ? { ...b, name: newName } : b) } : f));
                        }}>{board.name}</span>
                        <button 
                          onClick={(e) => {
                             e.stopPropagation();
                             const totalBoards = folders.reduce((acc, f) => acc + f.boards.length, 0);
                             if (totalBoards <= 1) {
                               setToastMsg('至少保留一个画板');
                               setTimeout(() => setToastMsg(''), 3000);
                               return;
                             }
                             setFolders(folders.map(f => f.id === folder.id ? { ...f, boards: f.boards.filter(b => b.id !== board.id) } : f));
                             // switch to a different board if active is deleted
                             if (activeBoardId === board.id) {
                               const anyOtherBoard = folders.flatMap(f => f.boards).find(b => b.id !== board.id);
                               if (anyOtherBoard) switchBoard(anyOtherBoard.id);
                             }
                          }} 
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity" 
                          title="删除画板"
                        >
                          <Trash2 className="w-[10px] h-[10px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          ref={containerRef} 
          className="flex-1 bg-[#111111] md:rounded-[20px] overflow-hidden relative cursor-crosshair group border border-[rgba(255,255,255,0.05)]"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            multiple
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />
          <Stage 
            ref={stageRef}
            width={dimensions.width} 
            height={dimensions.height} 
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onWheel={handleWheel}
            onDblClick={handleStageDblClick}
          >
            <Layer>
              {baseImages.map((imgData) => (
                <KonvaImage 
                  key={imgData.id}
                  id={imgData.id}
                  image={imgData.image} 
                  x={imgData.x}
                  y={imgData.y}
                  width={imgData.width} 
                  height={imgData.height} 
                  draggable={tool === 'cursor' && selectedIds.includes(imgData.id)}
                  onDragEnd={(e) => {
                    const newBaseImages = baseImages.map(img => 
                       img.id === imgData.id ? { ...img, x: e.target.x(), y: e.target.y() } : img
                    );
                    setBaseImages(newBaseImages);
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    const newBaseImages = baseImages.map(img => 
                      img.id === imgData.id 
                        ? { ...img, x: node.x(), y: node.y(), width: Math.max(5, node.width() * scaleX), height: Math.max(5, node.height() * scaleY) } 
                        : img
                    );
                    setBaseImages(newBaseImages);
                  }}
                />
              ))}
              {selectedIds.length > 0 && tool === 'cursor' && (
                <Transformer
                  ref={trRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 10 || newBox.height < 10) return oldBox;
                    return newBox;
                  }}
                />
              )}
              {/* Draw existing shapes */}
              {shapes.map((shape, i) => {
                const commonProps = {
                  key: i,
                  id: shape.id,
                  draggable: tool === 'cursor' && selectedIds.includes(shape.id),
                  onDragEnd: (e: any) => {
                    const newShapes = shapes.slice();
                    const idx = newShapes.findIndex(s => s.id === shape.id);
                    if (idx >= 0) {
                      newShapes[idx] = { ...newShapes[idx], x: e.target.x(), y: e.target.y() };
                      setShapes(newShapes);
                      saveHistory(newShapes);
                    }
                  },
                  onTransformEnd: (e: any) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1);
                    node.scaleY(1);
                    const newShapes = shapes.slice();
                    const idx = newShapes.findIndex(s => s.id === shape.id);
                    if (idx >= 0) {
                      const shapeInfo = newShapes[idx];
                      if (shapeInfo.type === 'rect') {
                        newShapes[idx] = { ...shapeInfo, x: node.x(), y: node.y(), width: Math.max(5, node.width() * scaleX), height: Math.max(5, node.height() * scaleY) };
                      } else if (shapeInfo.type === 'circle') {
                        newShapes[idx] = { ...shapeInfo, x: node.x(), y: node.y(), radius: Math.max(5, (shapeInfo.radius || 10) * Math.max(scaleX, scaleY)) };
                      } else if (shapeInfo.type === 'text') {
                         newShapes[idx] = { ...shapeInfo, x: node.x(), y: node.y() };
                      } else {
                         // Fallback for others
                         newShapes[idx] = { ...shapeInfo, x: node.x(), y: node.y() };
                      }
                      setShapes(newShapes);
                      saveHistory(newShapes);
                    }
                  }
                };

                if (shape.type === 'arrow') {
                  return <Arrow {...commonProps} points={shape.points} stroke="#FF6B4A" fill="#FF6B4A" strokeWidth={3} pointerLength={10} pointerWidth={10} />;
                }
                if (shape.type === 'circle') {
                  return <Circle {...commonProps} x={shape.x || 0} y={shape.y || 0} radius={shape.radius} stroke="#FF6B4A" strokeWidth={3} dash={[10, 5]} />;
                }
                if (shape.type === 'rect') {
                  return <Rect {...commonProps} x={shape.x || 0} y={shape.y || 0} width={shape.width} height={shape.height} stroke="#FF6B4A" strokeWidth={3} />;
                }
                if (shape.type === 'text') {
                  return (
                    <Text 
                      {...commonProps}
                      x={shape.x || 0} 
                      y={shape.y || 0} 
                      text={shape.text} 
                      fontSize={shape.fontSize || 24} 
                      fill="#FF6B4A"
                      fontFamily="Inter, sans-serif"
                      onDblClick={(e) => {
                        e.cancelBubble = true;
                        if (tool === 'cursor') {
                           const absPos = e.target.getAbsolutePosition();
                           setTextInput({ x: absPos.x, y: absPos.y, value: shape.text, id: shape.id, relativePos: { x: shape.x, y: shape.y }, fontSize: shape.fontSize || 24 });
                        }
                      }}
                    />
                  );
                }
                return null;
              })}

              {/* Draw shape currently being drawn */}
              {newShape && (
                <>
                  {newShape.type === 'arrow' && <Arrow points={newShape.points} stroke="#FF6B4A" fill="#FF6B4A" strokeWidth={3} pointerLength={10} pointerWidth={10} />}
                  {newShape.type === 'circle' && <Circle x={newShape.x} y={newShape.y} radius={newShape.radius} stroke="#FF6B4A" strokeWidth={3} dash={[10, 5]} />}
                  {newShape.type === 'rect' && <Rect x={newShape.x} y={newShape.y} width={newShape.width} height={newShape.height} stroke="#FF6B4A" strokeWidth={3} />}
                </>
              )}
              {selectionRect && (
                <Rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="rgba(255, 107, 74, 0.1)"
                  stroke="#FF6B4A"
                  strokeWidth={1}
                />
              )}
            </Layer>
          </Stage>
          
          {baseImages.length > 0 && showToolbar && (
            <motion.div 
              initial={{ x: -50, opacity: 0, y: '-50%' }}
              animate={{ x: 0, opacity: 1, y: '-50%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute top-1/2 left-6 bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-2 py-3 flex flex-col items-center gap-1 z-40 border border-gray-100"
            >
              <button onClick={() => setTool('cursor')} className={cn("p-2 rounded-lg transition-colors", tool === 'cursor' ? 'bg-gray-100 text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')} title="选择 (Cursor)">
                <MousePointer2 className="w-5 h-5" />
              </button>
              <div className="w-5 h-px bg-gray-200 my-1" />
              <button onClick={() => setTool('rect')} className={cn("p-2 rounded-lg transition-colors", tool === 'rect' ? 'bg-gray-100 text-[#FF6B4A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#FF6B4A]')} title="矩形 (Rectangle)">
                <Square className="w-5 h-5" />
              </button>
              <button onClick={() => setTool('circle')} className={cn("p-2 rounded-lg transition-colors", tool === 'circle' ? 'bg-gray-100 text-[#FF6B4A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#FF6B4A]')} title="圆形 (Circle)">
                <CircleIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setTool('arrow')} className={cn("p-2 rounded-lg transition-colors", tool === 'arrow' ? 'bg-gray-100 text-[#FF6B4A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#FF6B4A]')} title="箭头 (Arrow)">
                <MoveUpRight className="w-5 h-5" />
              </button>
              <button onClick={() => setTool('text')} className={cn("p-2 rounded-lg transition-colors", tool === 'text' ? 'bg-gray-100 text-[#FF6B4A]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#FF6B4A]')} title="文字 (Text)">
                <Type className="w-5 h-5" />
              </button>
              <div className="w-5 h-px bg-gray-200 my-1" />
              <button onClick={undo} disabled={historyStep === 0} className={cn("p-2 rounded-lg transition-colors", historyStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')} title="撤销 (Undo)">
                <Undo2 className="w-5 h-5" />
              </button>
              <button onClick={() => { setShapes([]); saveHistory([]); }} className="p-2 mb-1 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-colors" title="清空标注 (Clear all)">
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="w-5 h-px bg-gray-200 my-1" />
              <button onClick={downloadCanvas} className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors" title="保存图片 (Download)">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={() => { setBaseImages([]); setShapes([]); saveHistory([]); setShowToolbar(false); }} className="p-2 mt-1 rounded-lg text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center border border-transparent hover:border-red-100" title="关闭 (Close)">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
              <button onClick={() => {
                setShowToolbar(false);
                setTool('cursor');
                setSelectedIds([]);
                setToastMsg('✨ 标注已确认完成！');
                setTimeout(() => setToastMsg(''), 3000);
              }} className="p-2 mt-1 flex items-center justify-center text-green-500 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100" title="完成 (Confirm)">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </button>
            </motion.div>
          )}

          {toastMsg && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm z-50 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-2 pointer-events-none transition-all">
              {toastMsg}
            </div>
          )}

          {textInput && (
            <div
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  handleTextSubmit();
                }
              }}
              style={{
                position: 'absolute',
                top: textInput.y + 'px',
                left: textInput.x + 'px',
                transform: 'translate(-2px, -2px)',
                zIndex: 10,
              }}
            >
              <div 
                className="absolute bottom-full mb-2 left-0 flex items-center gap-3 bg-[rgba(20,20,20,0.95)] px-4 py-2 rounded-xl border border-glass-border shadow-xl backdrop-blur-md"
                onMouseDown={(e) => e.stopPropagation()} 
                onWheel={(e) => e.stopPropagation()}
              >
                <span className="text-[#FF6B4A] text-[10px] whitespace-nowrap font-mono tracking-widest uppercase">Size</span>
                <input 
                  type="range" 
                  min="12" 
                  max="120" 
                  value={textInput.fontSize} 
                  onChange={(e) => setTextInput({...textInput, fontSize: parseInt(e.target.value)})}
                  className="w-32 accent-[#FF6B4A] cursor-pointer"
                />
                <span className="text-white text-xs whitespace-nowrap font-mono w-10">{textInput.fontSize}px</span>
              </div>
              <textarea
                autoFocus
                value={textInput.value}
                onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleTextSubmit();
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  display: 'block',
                  background: 'rgba(20,20,20,0.8)',
                  color: '#FF6B4A',
                  border: '1px solid #FF6B4A',
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: textInput.fontSize + 'px',
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none',
                  minWidth: '200px',
                  minHeight: '60px',
                  resize: 'both',
                  lineHeight: 1.2
                }}
              />
            </div>
          )}

          {!baseImages.length && !uploadedFiles.length && (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
              <p className="font-sans text-[14px] tracking-widest text-text-primary">点击或拖拽上传底图、CAD 或 PDF 文件</p>
              <p className="font-mono text-[10px] mt-2 opacity-50 uppercase text-text-secondary">Click or Drag & Drop Files Here</p>
            </div>
          )}

          {/* Uploaded Files Panel overlay */}
          {uploadedFiles.length > 0 && (
            <div className="absolute top-6 right-6 w-64 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl p-4 z-30 max-h-[50vh] overflow-y-auto">
              <h3 className="text-xs font-medium text-text-primary mb-3 flex items-center justify-between">
                <span>附件文件 ({uploadedFiles.length})</span>
                <button onClick={() => fileInputRef.current?.click()} className="text-accent-blue hover:text-white transition-colors" title="继续添加文件">
                  <Plus className="w-4 h-4" />
                </button>
              </h3>
              <div className="flex flex-col gap-2">
                {uploadedFiles.map(file => (
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
                    <button 
                      onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-text-secondary hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {submissionId && <FloatingChat />}
    </PageTransition>
  );
}
