import { useEffect, useState } from "react";
import { CalendarDays, ImageIcon, Package, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { fetchPublicPortfolio } from "../lib/platformApi";
import type { PublicPortfolio as PublicPortfolioData } from "../types/platform";

function useNoIndex() {
  useEffect(() => {
    const selector = 'meta[name="robots"]';
    let meta = document.head.querySelector<HTMLMetaElement>(selector);
    const existed = Boolean(meta);
    const previous = meta?.content || "";

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex,nofollow,noarchive";

    return () => {
      if (!meta) return;
      if (existed) meta.content = previous;
      else meta.remove();
    };
  }, []);
}

function unitLabel(unit: string) {
  if (unit === "item") return "项";
  if (unit === "piece") return "张";
  if (unit === "space") return "空间";
  if (unit === "set") return "套";
  if (unit === "hour") return "小时";
  if (unit === "sqm") return "平方米";
  return unit;
}

export function PublicPortfolio() {
  useNoIndex();
  const { token = "" } = useParams();
  const [portfolio, setPortfolio] = useState<PublicPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    imageUrl: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);

    fetchPublicPortfolio(token)
      .then((data) => {
        if (!cancelled) setPortfolio(data);
      })
      .catch(() => {
        if (!cancelled) {
          setPortfolio(null);
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-sm text-text-secondary">
        正在加载作品档案...
      </div>
    );
  }

  if (unavailable || !portfolio) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.35em] text-text-secondary">
            Studio Aruo
          </p>
          <h1 className="text-3xl text-white">该作品页暂未开放</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            链接可能已关闭或更新，请向作品发布者获取最新地址。
          </p>
        </div>
      </div>
    );
  }

  const { artist, works, pricing } = portfolio;

  return (
    <div className="min-h-screen px-6 py-10 md:px-12 lg:px-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="grid gap-8 border-b border-glass-border pb-10 md:grid-cols-[auto_1fr_auto] md:items-end">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-glass-border bg-white/[0.035]">
            {artist.avatarUrl ? (
              <img
                src={artist.avatarUrl}
                alt={artist.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-text-secondary">
                {artist.displayName.slice(0, 1)}
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-text-secondary">
              Artist Portfolio
            </p>
            <h1 className="text-4xl text-white md:text-6xl">
              {artist.displayName}
            </h1>
            {artist.bio ? (
              <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 text-text-secondary">
                {artist.bio}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 md:text-right">
            <div className="inline-flex items-center gap-2 text-sm text-white">
              <span
                className={`h-2 w-2 rounded-full ${
                  artist.isBusy ? "bg-accent-orange" : "bg-status-green"
                }`}
              />
              {artist.isBusy ? "当前繁忙" : "空闲可接单"}
            </div>
            {artist.availableDate ? (
              <p className="flex items-center gap-2 text-sm text-text-secondary md:justify-end">
                <CalendarDays className="h-4 w-4" />
                最早排期 {artist.availableDate}
              </p>
            ) : null}
          </div>
        </header>

        <section className="min-h-screen py-12">
          <div className="mb-7 flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-accent-blue" />
            <h2 className="text-2xl text-white">作品展示</h2>
          </div>

          {works.length ? (
            <div className="grid gap-8 md:grid-cols-2">
              {works.map((work, index) => (
                <article
                  key={work.id}
                  className={`overflow-hidden rounded-lg border border-glass-border bg-white/[0.035] ${
                    index % 2 === 1 ? "md:mt-20" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImage({
                        imageUrl: work.imageUrl,
                        title: work.title,
                      })
                    }
                    className="block w-full bg-black/20 text-left"
                    aria-label={`查看作品大图：${work.title}`}
                  >
                    <img
                      src={work.imageUrl}
                      alt={work.title}
                      className="h-auto w-full object-contain"
                    />
                  </button>
                  {work.description ? (
                    <div className="p-5">
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text-secondary">
                        {work.description}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">暂未上传作品</p>
          )}
        </section>

        <section className="flex min-h-screen flex-col justify-center border-t border-glass-border py-16">
          <div>
            <div className="mb-7 flex items-center gap-3">
              <Package className="h-5 w-5 text-accent-blue" />
              <h2 className="text-2xl text-white">价格参考</h2>
            </div>

            {artist.pricingNote ? (
              <p className="mb-7 max-w-3xl whitespace-pre-line text-sm leading-7 text-text-secondary">
                {artist.pricingNote}
              </p>
            ) : null}

            {pricing.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {pricing.map((item) => (
                  <article
                    key={item.id || `${item.name}-${item.sortOrder}`}
                    className="flex items-start justify-between gap-5 rounded-lg border border-glass-border bg-white/[0.035] p-5"
                  >
                    <div>
                      <h3 className="text-lg text-white">{item.name}</h3>
                      {item.description ? (
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-right text-white">
                      <span className="text-xs text-text-secondary">¥</span>
                      <span className="mx-1 text-2xl font-serif italic">
                        {item.price}
                      </span>
                      <span className="text-xs text-text-secondary">
                        /{unitLabel(item.unit)}
                      </span>
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">暂未填写价格</p>
            )}
          </div>
        </section>
      </div>

      {previewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-8"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
            aria-label="关闭大图"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={previewImage.imageUrl}
            alt={previewImage.title}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
