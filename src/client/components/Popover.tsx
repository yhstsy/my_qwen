import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Menu } from "../types.ts";
import { Icon } from "./Icon.tsx";

export function Popover({
  menu,
  onClose,
}: {
  menu: Menu;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = menu.anchor.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(rect.left, innerWidth - node.offsetWidth - 8)),
      top: Math.max(
        8,
        Math.min(
          menu.above ? rect.top - node.offsetHeight - 8 : rect.bottom + 6,
          innerHeight - node.offsetHeight - 8,
        ),
      ),
    });
    node.querySelector("button")?.focus({ preventScroll: true });
    menu.anchor.setAttribute("aria-expanded", "true");
    return () => {
      menu.anchor.setAttribute("aria-expanded", "false");
    };
  }, [menu]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !ref.current?.contains(event.target) &&
        !menu.anchor.contains(event.target)
      )
        onClose();
    };
    const resize = () => onClose();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
    };
  }, [menu, onClose]);
  return createPortal(
    <div
      className="popover"
      role="menu"
      ref={ref}
      style={position}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
          menu.anchor.focus();
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        const buttons = [...ref.current!.querySelectorAll("button")];
        const index = buttons.findIndex(
          (button) => button === document.activeElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        event.preventDefault();
        buttons[next]?.focus();
      }}
    >
      <div className="menu-heading">{menu.heading}</div>
      {menu.items.map((item, index) => (
        <button
          key={index}
          className={`menu-item${item.selected ? " selected" : ""}`}
          role="menuitem"
          onClick={() => {
            onClose();
            item.action();
          }}
        >
          <Icon name={item.icon} />
          <span>
            {item.label}
            {item.description && (
              <p className="menu-description">{item.description}</p>
            )}
          </span>
          {item.selected && (
            <span className="check">
              <Icon name="check" />
            </span>
          )}
        </button>
      ))}
    </div>,
    document.body,
  );
}
