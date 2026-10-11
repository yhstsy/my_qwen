import type { ChatMessage } from "../chat.ts";

export type Mode = "daily" | "work";
export type PanelName = "space" | "create" | "skills" | "connect" | "projects";
export type DialogKind =
  | "login"
  | "download"
  | "about"
  | "task"
  | "project"
  | "search"
  | "voice"
  | "task-detail";
export type Theme = "light" | "dark" | "system";
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  text: string;
}
export interface FileRecord extends Omit<Attachment, "text"> {
  date: string;
}
export interface StoredMessage extends ChatMessage {
  files?: Pick<Attachment, "name" | "text">[];
  tool?: string;
}
export interface Conversation {
  id: string;
  title: string;
  mode?: Mode;
  messages: StoredMessage[];
  createdAt?: number;
}
export interface Task {
  id: string;
  title: string;
  content: string;
  time: string;
}
export interface Project {
  id: string;
  title: string;
}
export interface Panel {
  title: string;
  description: string;
  icon?: string;
  items?: [string, string, string][];
}
export interface MenuItem {
  label: string;
  icon: string;
  selected?: boolean;
  description?: string;
  action: () => void;
}
export interface Menu {
  anchor: HTMLElement;
  heading: string;
  items: MenuItem[];
  above?: boolean;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
