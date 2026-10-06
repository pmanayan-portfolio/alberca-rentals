import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { useAuth } from "../state/AuthContext";

type LayoutProps = {
  children: ReactNode;
};

type NavigationLink = {
  to: string;
  label: string;
};

const managerLinks: NavigationLink[] = [
  { to: "/owner", label: "Dashboard" },
  { to: "/owner/bookings", label: "Bookings" },
  { to: "/owner/calendar", label: "Calendar" },
  { to: "/owner/experiences", label: "Experiences" },
  { to: "/owner/rentals", label: "Rental Items" },
  { to: "/owner/categories", label: "Categories" },
  { to: "/owner/promotions", label: "Special Offers" },
  { to: "/owner/showcase", label: "Gallery" },
  { to: "/owner/availability", label: "Availability" },
  { to: "/owner/reports", label: "Reports" },
];

const customerLinks: NavigationLink[] = [
  { to: "/", label: "Experiences" },
  { to: "/offers", label: "Special Offers" },
  { to: "/custom-booking", label: "Custom Booking" },
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const links: NavigationLink[] =
    user?.role === "manager"
      ? managerLinks
      : [
          ...customerLinks,
          ...(user
            ? [{ to: "/my-bookings", label: "My Bookings" }]
            : []),
        ];

  const handleLogout = async () => {
    setOpen(false);

    await logout();

    navigate("/");
  };

  const closeMobileMenu = () => {
    setOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfaf3]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e7d8c3] bg-[#fbfaf3]/95 backdrop-blur-md">
        <div className="shell flex h-20 items-center justify-between">
          {/* Brand */}
          {/* Large overlapping logo */}
            <Link
                to="/"
                className="
                    relative
                    z-50
                    flex
                    h-20
                    w-36
                    shrink-0
                    items-center
                    md:w-44
                "
                >
                <img
                    src="/logo.webp"
                    alt="Alberca Rentals"
                    className="
                    h-16
                    w-auto
                    object-contain
                    "
                />
                </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-5 text-sm font-semibold lg:flex">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  [
                    "relative py-2 transition-colors duration-200",
                    isActive
                      ? "text-[#b06f43]"
                      : "text-[#e7d8c3]/80 hover:text-[#b06f43]",
                  ].join(" ")
                }
              >
                {label}
              </NavLink>
            ))}

            {/* Authentication */}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary ml-2"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="btn btn-primary ml-2"
              >
                Sign in
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="
              grid size-10 place-items-center
              rounded-full
              border border-[#e7d8c3]
              text-[#e7d8c3]
              transition-colors
              hover:bg-[#c59638]/10
              lg:hidden
            "
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
          >
            {open ? (
              <X size={21} />
            ) : (
              <Menu size={21} />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {open && (
          <div className="border-t border-[#e7d8c3] bg-[#fbfaf3] lg:hidden">
            <nav className="shell grid gap-1 py-5">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    [
                      "rounded-xl px-4 py-3 text-sm font-semibold",
                      "transition-colors duration-200",
                      isActive
                        ? "bg-[#b4835c]/10 text-[#b06f43]"
                        : "text-[#e7d8c3]/80 hover:bg-[#c59638]/10",
                    ].join(" ")
                  }
                >
                  {label}
                </NavLink>
              ))}

              <div className="mt-3 border-t border-[#e7d8c3] pt-4">
                {user ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-secondary w-full"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="btn btn-primary flex w-full justify-center"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#e7d8c3] bg-[#fffaf0]">
        <div className="shell py-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
            to="/"
            className="flex items-center"
            >
                <img
                    src="/logo.webp"
                    alt="Alberca Rentals | Gowns, Tables, Chairs & Party Supplies"
                    className="h-14 w-auto object-contain"
                />
            </Link>

            <p className="muted text-sm">
              Event experiences, special offers, and custom rentals.
            </p>
          </div>

          <div className="mt-6 border-t border-[#e7d8c3] pt-6">
            <p className="muted text-xs">
              © {new Date().getFullYear()} Alberca Rentals. All rights reserved. Powedered by {"Patricio Manayan Jr,."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}