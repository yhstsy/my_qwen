import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readStorage } from "../state.ts";
import type { Theme } from "../types.ts";

export function useLocalState<T>(
  key: string,
  fallback: T,
  notify: (message: string) => void,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(() => readStorage(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      notify("浏览器存储空间不足，本次内容暂未保存。");
    }
  }, [key, value, notify]);
  return [value, setValue];
}

export function useTheme(theme: Theme) {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme:dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

export function useApiStatus() {
  const [status, setStatus] = useState({ configured: false, model: "" });
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/status", { signal: controller.signal })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              configured: boolean;
              model: string | null;
            })
          : null,
      )
      .then((result) => {
        if (!controller.signal.aborted)
          setStatus({
            configured: !!result?.configured,
            model: typeof result?.model === "string" ? result.model : "",
          });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return status;
}
