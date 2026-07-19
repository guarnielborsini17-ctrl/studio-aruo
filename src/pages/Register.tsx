import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../contexts/AuthContext';
import { fetchRegistrationStatus } from '../lib/platformApi';
import type { RegistrationStatus } from '../types/platform';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusFetchFailed, setStatusFetchFailed] = useState(false);
  const registrationClosedRef = useRef(false);
  const fullHeadingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchRegistrationStatus()
      .then((status) => {
        if (cancelled || registrationClosedRef.current) {
          return;
        }

        setRegistrationStatus(status);
      })
      .catch(() => {
        if (cancelled || registrationClosedRef.current) {
          return;
        }

        setStatusFetchFailed(true);
      })
      .finally(() => {
        if (cancelled || registrationClosedRef.current) {
          return;
        }

        setStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (error === '首批内测名额刚刚用完' && registrationStatus?.open === false) {
      fullHeadingRef.current?.focus();
    }
  }, [error, registrationStatus?.open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await register({ username, displayName, password, role: 'artist', inviteCode });
      navigate('/dashboard');
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'registration_full') {
        registrationClosedRef.current = true;
        setError('首批内测名额刚刚用完');
        setRegistrationStatus((current) => ({
          limit: current?.limit ?? 10,
          registered: current?.limit ?? 10,
          remaining: 0,
          open: false,
        }));
      } else if (code === 'invalid_invite_code') {
        setError('申请码不正确，请检查后再试');
      } else if (code === 'invite_code_used') {
        setError('这个申请码已经被使用');
      } else {
        setError(code === 'username_exists' ? '这个账号已经被注册' : '注册失败，请检查信息');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <section className="max-w-2xl mx-auto pt-12">
        <p className="text-xs uppercase tracking-[0.35em] text-text-secondary mb-3">Register</p>
        <h2 className="text-4xl text-white mb-3">创建绘图员账号</h2>
        <p className="text-text-secondary mb-8">注册后即可上传作品、维护展示资料和套餐价格。</p>

        {error && (
          <p className="mb-5 text-sm text-accent-orange" role="alert">
            {error}
          </p>
        )}

        {registrationStatus?.open === false ? (
          <div
            className="rounded-lg border border-glass-border bg-white/[0.035] p-6"
            role="alert"
          >
            <p
              className="text-lg text-white outline-none"
              ref={fullHeadingRef}
              tabIndex={-1}
            >
              首批内测名额已满
            </p>
            <p className="mt-2 text-sm text-text-secondary">感谢关注，后续开放时间会另行通知。</p>
          </div>
        ) : statusLoading ? (
          <p
            className="rounded-lg border border-glass-border bg-white/[0.035] p-5 text-sm text-text-secondary"
            role="status"
            aria-live="polite"
          >
            正在确认内测名额...
          </p>
        ) : (
          <>
            {registrationStatus && (
              <p
                className="mb-5 text-sm text-text-secondary"
                role="status"
                aria-live="polite"
              >
                首批内测剩余 <span className="text-white">{registrationStatus.remaining}</span> 个名额
              </p>
            )}
            {statusFetchFailed && (
              <p
                className="mb-5 text-sm text-text-secondary"
                role="status"
                aria-live="polite"
              >
                名额状态暂时无法获取，提交时将由服务器确认。
              </p>
            )}

            <form onSubmit={submit} className="space-y-5">
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
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="申请码"
                autoComplete="off"
              />
              <input
                className="w-full bg-white/5 border border-glass-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/60"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="密码，至少 6 位"
                type="password"
              />
              <button
                className="w-full bg-white text-black rounded-lg py-3 font-medium disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? '创建中...' : '注册并进入工作台'}
              </button>
            </form>
          </>
        )}

        <Link className="block mt-5 text-sm text-accent-blue" to="/login">
          已有账号？去登录
        </Link>
      </section>
    </PageTransition>
  );
}
