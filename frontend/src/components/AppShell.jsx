import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Toaster } from "react-hot-toast";
import Logo from "./Logo";
import MobileNav from "./MobileNav";
import { useAuth } from "../context/AuthContext";
import { fullName } from "./admin/labels";

/**
 * The frame every signed-in role shares: a sidebar on large screens, and a
 * slim top bar with a menu button (opening a drawer) on small ones.
 * `links` come from navigation.js, so each role sees its own items.
 */
function AppShell({ links, label }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const linkClass = ({ isActive }) =>
    `flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-white ${
      isActive
        ? "bg-night-light text-white"
        : "text-white/65 hover:bg-night-light/60 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-background text-ink lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "inherit",
            fontSize: "0.875rem",
            borderRadius: "10px",
            background: "var(--color-night)",
            color: "#fff",
          },
        }}
      />

      {/* Small screens: a slim top bar with a menu button */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-night px-3 text-white lg:hidden">
        <Logo light />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-white/80 hover:bg-night-light hover:text-white focus-visible:outline-white"
        >
          <Menu size={22} />
        </button>
      </header>
      <MobileNav open={menuOpen} onClose={closeMenu} links={links} user={user} onLogout={logout} />

      {/* Large screens: the sidebar */}
      <aside className="hidden bg-night px-2.5 py-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-1.5">
          <Logo light />
        </div>

        <nav aria-label={label} className="mt-6 flex flex-col gap-1">
          {links.map(({ to, label: text, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={17} aria-hidden="true" /> {text}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-1.5">
          <p className="truncate text-sm font-medium">{fullName(user)}</p>
          <p className="truncate text-xs text-white/55">{user.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md text-sm text-white/70 hover:text-white focus-visible:outline-white"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
