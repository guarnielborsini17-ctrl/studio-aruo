import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import type { UserRole } from '../types/platform';

const ROLE_OPTIONS: Array<{ role: UserRole; title: string; desc: string }> = [
  { role: 'designer', title: '设计师', desc: '挑选绘图员、发起合作、评价和加鸡腿。' },
  { role: 'artist', title: '绘图员', desc: '上传作品、编辑套餐价格、接收评价和鸡腿。' },
];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('designer');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await register({ username, displayName, password, role });
      navigate('/dashboard');
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(code === 'username_exists' ? '这个账号已经被注册' : '注册失败，请检查信息');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <section className="max-w-2xl mx-auto pt-12">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Register</p>
        <h2 className="text-4xl text-white mb-3">创建账号</h2>
        <p className="text-text-secondary mb-8">选择你在平台里的身份。第一期注册后暂不开放修改。</p>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.role}
                onClick={() => setRole(item.role)}
                className={cn(
                  'text-left border rounded-lg p-4 transition-colors',
                  role === item.role
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-white border-glass-border hover:border-white/50'
                )}
              >
                <strong>{item.title}</strong>
                <span className="block text-sm opacity-70 mt-2">{item.desc}</span>
              </button>
            ))}
          </div>

          <input
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/60"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="账号"
          />
          <input
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/60"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="昵称 / 展示名"
          />
          <input
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/60"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码，至少 6 位"
            type="password"
          />
          {error && <p className="text-sm text-accent-orange">{error}</p>}
          <button
            className="w-full bg-white text-black rounded-lg py-3 font-medium disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? '创建中...' : '注册并进入工作台'}
          </button>
        </form>

        <Link className="block mt-5 text-sm text-accent-blue" to="/login">
          已有账号？去登录
        </Link>
      </section>
    </PageTransition>
  );
}
