import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch {
      setError('账号或密码不正确');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <section className="max-w-md mx-auto pt-16">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Account</p>
        <h2 className="text-4xl text-white mb-3">登录</h2>
        <p className="text-text-secondary mb-8">进入你的 Studio Aruo 工作台。</p>

        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/60"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="账号"
          />
          <input
            className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/60"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码"
            type="password"
          />
          {error && <p className="text-sm text-accent-orange">{error}</p>}
          <button
            className="w-full bg-white text-black rounded-lg py-3 font-medium disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>

        <Link className="block mt-5 text-sm text-accent-blue" to="/register">
          还没有账号？去注册
        </Link>
      </section>
    </PageTransition>
  );
}
