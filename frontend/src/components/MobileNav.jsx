import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import Logo from "./Logo";
import { fullName } from "./admin/labels";

/**
 * Slide-in menu for small screens. Opens from a menu button, closes on Esc,
 * on a tap outside, or when a link is chosen.
 */
function MobileNav({ open, onClose, links, user, onLogout }) {
  const closeRef = useRef(null);
  // Keep the latest onClose without making the effect below re-run when it changes
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.(); // back to the menu button
    };
  }, [open]);

  if (!open) return null;

  const linkClass = ({ isActive }) =>
    `flex h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors duration-150 focus-visible:outline-white ${
      isActive
        ? "bg-night-light text-white"
        : "text-white/70 hover:bg-night-light/60 hover:text-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fade-in absolute inset-0 bg-night/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        id="mobile-menu"
        className="drawer-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-night p-3 text-white"
      >
        <div className="flex items-center justify-between px-2 pt-1">
          <Logo light />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-night-light hover:text-white focus-visible:outline-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={onClose}>
              <Icon size={19} aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 px-2 pt-4">
          <p className="truncate text-sm font-medium">{fullName(user)}</p>
          <p className="truncate text-xs text-white/55">{user.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg text-sm text-white/75 hover:text-white focus-visible:outline-white"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileNav;
