import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SpeechRecognitionLike } from "../types.ts";

export function useVoice(
  setDraft: Dispatch<SetStateAction<string>>,
  notify: (message: string) => void,
) {
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const [recording, setRecording] = useState(false);
  useEffect(
    () => () => {
      const current = recognition.current;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        current.stop();
      }
    },
    [],
  );
  const stop = () => recognition.current?.stop();
  const start = () => {
    const Constructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      notify("当前浏览器不支持语音识别，请使用支持此功能的 Chrome 或 Edge。");
      return;
    }
    recognition.current?.stop();
    const current = new Constructor();
    recognition.current = current;
    current.lang = "zh-CN";
    current.continuous = false;
    current.interimResults = false;
    current.onresult = (event) => {
      if (recognition.current === current)
        setDraft((value) => value + event.results[0][0].transcript);
    };
    current.onerror = (event) => {
      if (recognition.current === current)
        notify(
          event.error === "not-allowed"
            ? "未获得麦克风权限，可以继续使用文字输入。"
            : "语音识别未完成，请再试一次。",
        );
    };
    current.onend = () => {
      if (recognition.current === current) setRecording(false);
    };
    try {
      current.start();
      setRecording(true);
    } catch {
      setRecording(false);
      notify("语音输入暂时不可用。");
    }
  };
  return { recording, start, stop };
}
