import React, { useState, useContext, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, User, ShieldCheck } from 'lucide-react';
import { ChatContext } from '../App';
import { cn } from '../lib/utils';

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const { messages, addMessage, unreadCount, clearUnread } = useContext(ChatContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      clearUnread('client');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    addMessage('client', inputText.trim());
    setInputText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-8 right-8 w-14 h-14 bg-accent-blue text-white rounded-full shadow-[0_0_20px_rgba(74,158,255,0.4)] flex items-center justify-center hover:scale-110 transition-transform z-50",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount.client > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[#0a0a0a]">
            {unreadCount.client}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 right-8 w-[350px] h-[500px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div className="h-16 border-b border-white/10 bg-[#222] flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent-blue/20 rounded-full flex items-center justify-center text-accent-blue">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Studio Aruo 客服</h3>
                  <p className="text-[10px] text-status-green flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-green" /> 实时在线
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#111]">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-text-secondary opacity-50">
                  <MessageCircle className="w-12 h-12 mb-2" />
                  <p className="text-xs">发送消息与设计师实时沟通</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender === 'client';
                  return (
                    <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "self-end items-end" : "self-start items-start")}>
                      <div className="flex items-end gap-2 mb-1">
                        {!isMe && <span className="text-[10px] text-text-secondary">设计师</span>}
                        <span className="text-[9px] text-white/30">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div 
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                          isMe 
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

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-[#222] border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="输入消息..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-accent-blue/50 transition-colors"
              />
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 bg-accent-blue text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-blue/90 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}