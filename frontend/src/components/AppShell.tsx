import type { ReactNode } from "react";
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  Command,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Network,
  ScanSearch,
  ServerCog,
  Database,
  Waypoints,
} from "lucide-react";

export type AppView = "dashboard" | "cases" | "network" | "timeline" | "evidence" | "data-store" | "fusion" | "hypotheses" | "assistant" | "analytics" | "system";

const navigation: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard; description: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Operational intelligence" },
  { id: "cases", label: "Cases", icon: FolderKanban, description: "Case management and workspaces" },
  { id: "network", label: "Network Explorer", icon: Network, description: "Interactive relationship graph" },
  { id: "timeline", label: "Timeline", icon: CalendarClock, description: "Activity and event context" },
  { id: "evidence", label: "Evidence", icon: FileText, description: "Source-aware evidence register" },
  { id: "fusion", label: "Intelligence Fusion Center", icon: ScanSearch, description: "Hotspots, resolution, and evidence pipeline" },
  { id: "hypotheses", label: "Hypothesis Workbench", icon: BrainCircuit, description: "Compare competing explanations" },
  { id: "assistant", label: "AI Assistant", icon: Bot, description: "Reviewable mock graph actions" },
];

const liveNavigation: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard; description: string }> = [
  { id: "dashboard", label: "Live Dashboard", icon: LayoutDashboard, description: "Backend-connected operational overview" },
  { id: "cases", label: "Live Cases", icon: FolderKanban, description: "Authorised cases from the database" },
  { id: "network", label: "Live Network", icon: Network, description: "Relationship graph returned by the API" },
  { id: "fusion", label: "Intelligence Fusion Center", icon: ScanSearch, description: "Interactive sample map and linked evidence inside the live console" },
  { id: "evidence", label: "Evidence Upload", icon: FileText, description: "Upload files into the evidence pipeline" },
  { id: "data-store", label: "Data Store", icon: Database, description: "Inspect files and records stored by the backend" },
  { id: "assistant", label: "SUTRA Copilot", icon: Bot, description: "Deterministic evidence-grounded graph assistance" },
  { id: "analytics", label: "Live Analytics", icon: Waypoints, description: "Backend graph analytics" },
  { id: "system", label: "System Health", icon: ServerCog, description: "API and dependency readiness" },
];

export function AppShell({
  activeView,
  onNavigate,
  onOpenCommandPalette,
  onExit,
  mode = "demo",
  userName = "Investigator",
  userDetail = "demo workspace",
  children,
}: {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenCommandPalette: () => void;
  onExit: () => void;
  mode?: "demo" | "live";
  userName?: string;
  userDetail?: string;
  children: ReactNode;
}) {
  const activeNavigation = mode === "live" ? liveNavigation : navigation;
  const activeItem = activeNavigation.find((item) => item.id === activeView) ?? activeNavigation[0];
  const initial = userName.trim().charAt(0).toUpperCase() || "I";
  return (
    <div className="app-shell experience-shell">
      <aside className="sidebar">
        <button className="brand brand--button" onClick={() => onNavigate("dashboard")} aria-label="Go to SUTRA dashboard">
          <div className="brand__mark"><img className="brand__image" src="/sutra-hacker.png" alt="SUTRA hacker" /></div>
          <div><strong>SUTRA</strong><span>SECURE UNIFIED THREAT &amp; RELATIONSHIP ANALYTICS</span></div>
        </button>
        <div className="sidebar__section-label">Investigation workspace</div>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {activeNavigation.map(({ id, label, icon: Icon, description }) => (
            <button key={id} className={`nav-item${activeView === id ? " nav-item--active" : ""}`} onClick={() => onNavigate(id)} title={description}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">
          <div className="sidebar__classification"><span /> {mode === "live" ? "Backend connected - evidence-first" : "Synthetic demo - evidence-first"}</div>
          <button className="nav-item nav-item--logout" onClick={onExit}><LogOut size={18} /> <span>{mode === "live" ? "Sign out" : "Exit demo"}</span></button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar experience-topbar">
          <div><div className="breadcrumb">SUTRA <span>/</span> {activeItem.label}</div><h1>{activeItem.label}</h1></div>
          <div className="topbar__actions">
            <button className="command-trigger" onClick={onOpenCommandPalette} aria-label="Open command palette"><Command size={15} /><span>Search SUTRA</span><kbd>Ctrl K</kbd></button>
            <span className="experience-live-status"><i /> {mode === "live" ? "API connected" : "Demo ready"}</span>
            <div className="user-chip" title={mode === "live" ? "Authenticated backend session" : "Synthetic Phase 2 investigator session"}><span>{initial}</span><div><strong>{userName}</strong><small>{userDetail}</small></div></div>
          </div>
        </header>
        <section className="page-content experience-page-content">{children}</section>
      </main>
    </div>
  );
}
