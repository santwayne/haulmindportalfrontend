import { useState } from "react";
import { Menu, X } from "lucide-react";
import Logo from "../../assets/FleetGo.png";

const nav = [
  { href: "https://logistiqinnovations.ca/", label: "Home" },
  { href: "https://logistiqinnovations.ca/ai", label: "AI Platform" },
  { href: "https://logistiqinnovations.ca/manifest", label: "Manifest" },
  { href: "https://logistiqinnovations.ca/compliance", label: "Compliance" },
  { href: "https://logistiqinnovations.ca/driver-app", label: "Driver App" },
  { href: "https://logistiqinnovations.ca/contact", label: "Contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        backgroundColor: "rgba(11, 18, 32, 0.8)",
        borderColor: "rgba(17, 131, 224, 0.2)",
      }}
    >
     

      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="https://logistiqinnovations.ca/" className="flex items-center gap-2 group">
          <img
            src={Logo}
            alt="Logistiq Innovations"
            className="h-9 w-auto group-hover:scale-105 transition-transform"
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="px-4 py-2 text-sm rounded-md transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="https://logistiqinnovations.ca/contact"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200"
            style={{ backgroundColor: "var(--accent-navyblue)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d6fc7")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--accent-navyblue)")
            }
          >
            Start free trial
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden"
          style={{ color: "var(--text-primary)" }}
          onClick={() => setOpen(!open)}
          aria-label="menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="lg:hidden border-t px-6 py-4 flex flex-col gap-2"
          style={{
            backgroundColor: "rgba(11, 18, 32, 0.97)",
            borderColor: "rgba(17, 131, 224, 0.2)",
          }}
        >
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="py-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {n.label}
            </a>
          ))}
          <a
            href="https://logistiqinnovations.ca/contact"
            onClick={() => setOpen(false)}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white text-center transition-all"
            style={{ backgroundColor: "var(--accent-navyblue)" }}
          >
            Start free trial
          </a>
          <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: "rgba(17,131,224,0.2)" }}>
            <a href="tel:+14319990339" className="flex items-center gap-2 text-xs py-1" style={{ color: "var(--text-secondary)" }}>
              <span>CAN: +1 (431) 999-0339</span>
            </a>
            <a href="tel:+16264797965" className="flex items-center gap-2 text-xs py-1" style={{ color: "var(--text-secondary)" }}>
             <span>US: +1 (626) 479-7965</span>
            </a>
            <a href="mailto:info@logistiqinnovations.ca" className="flex items-center gap-2 text-xs py-1" style={{ color: "var(--text-secondary)" }}>
             <span>info@logistiqinnovations.ca</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
