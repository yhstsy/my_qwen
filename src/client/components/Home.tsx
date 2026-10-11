import { useEffect, useRef } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { banners } from "../data.ts";
import type { Mode } from "../types.ts";
import { IconButton } from "./Icon.tsx";

export function Home({
  mode,
  children,
  slide,
  closed,
  onSlide: setSlide,
  onClosePromo,
  onWork,
  onDownload,
  onPrompt,
}: {
  mode: Mode;
  children: ReactNode;
  slide: number;
  closed: boolean;
  onSlide: Dispatch<SetStateAction<number>>;
  onClosePromo: () => void;
  onWork: () => void;
  onDownload: () => void;
  onPrompt: (text: string) => void;
}) {
  const promo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== "daily" || closed) return;
    const timer = setInterval(() => {
      if (!document.hidden && !promo.current?.matches(":hover"))
        setSlide((value) => (value + 1) % banners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [mode, closed, setSlide]);
  const banner = banners[slide];
  const suggestions = [
    [
      "P",
      "orange",
      "解读诺贝尔物理学奖获奖理论，生成中小学生科普PPT",
      "解读诺贝尔获奖理论，生成中小学生科普PPT",
    ],
    [
      "✎",
      "yellow",
      "创作一部无限流题材的 AI 短剧剧本",
      "创作无限流题材AI短剧剧本",
    ],
    [
      "◕",
      "purple",
      "解析岗位要求，梳理简历撰写核心要点",
      "解析岗位要求，梳理简历撰写核心要点",
    ],
  ];
  return (
    <section className="home" aria-label="对话首页">
      <div className="welcome">
        <img
          src={mode === "work" ? "/assets/work.svg" : "/assets/qwen.svg"}
          alt=""
          width="48"
          height="48"
        />
        <h1>{mode === "work" ? "千问，你的办公助理" : "你好，我是千问"}</h1>
      </div>
      {children}
      {mode === "daily" && !closed && (
        <div className="promo-wrap" ref={promo}>
          <div className="promo-dots" aria-label="轮播切换">
            {banners.map((_, index) => (
              <button
                key={index}
                aria-label={`切换到第 ${index + 1} 个`}
                className={slide === index ? "active" : ""}
                aria-pressed={slide === index}
                onClick={() => setSlide(index)}
              />
            ))}
          </div>
          <div className="promo-card">
            <img
              src={`/assets/banner-${banner.image}.webp`}
              alt={banner.title}
              width="148"
              height="72"
            />
            <div className="promo-copy">
              <p>{banner.title}</p>
              <span>{banner.description}</span>
            </div>
            <button
              className="promo-cta"
              onClick={slide === 0 ? onWork : onDownload}
            >
              {banner.action}
            </button>
            <IconButton
              className="promo-close"
              icon="close"
              label="关闭推荐"
              onClick={onClosePromo}
            />
          </div>
        </div>
      )}
      {mode === "work" && (
        <div className="work-suggestions">
          <p>从这里开始</p>
          {suggestions.map(([icon, color, prompt, title]) => (
            <button key={title} onClick={() => onPrompt(prompt)}>
              <span className={`suggestion-icon ${color}`}>{icon}</span>
              {title}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
