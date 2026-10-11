import type { ButtonHTMLAttributes } from "react";
import { icons } from "../data.ts";

export function Icon({ name = "spark" }: { name?: string }) {
  // Paths are fixed application assets, never user or model output.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icons[name] || icons.spark }}
    />
  );
}
export function IconButton({
  icon,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
