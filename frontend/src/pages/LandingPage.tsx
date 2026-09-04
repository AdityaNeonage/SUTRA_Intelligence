import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  Network,
  Play,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { Button, Chip, Panel, Reveal, StatusIndicator } from "../components/ui";
import { useReducedMotion } from "../hooks/useReducedMotion";
import "../styles/experience.css";

export interface LandingPageProps {
  /** Opens the authenticated intelligence workspace. */
  onExplorePlatform?: () => void;
  /** Lets the host open a dedicated demo route, modal, or video. */
  onWatchDemo?: () => void;
  /** Optional authorised-access action for hosts that keep the current login flow. */
  onOpenLogin?: () => void;
  /** Copy for the secondary call to action; public builds use this for demo entry. */
  accessLabel?: string;
}

type CanvasNode = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  focal?: boolean;
  hue: "cyan" | "blue" | "red";
};

const canvasNodes: CanvasNode[] = [
  { x: 0.65, y: 0.46, radius: 8, phase: 0, focal: true, hue: "red" },
  { x: 0.48, y: 0.31, radius: 5, phase: 0.9, hue: "cyan" },
  { x: 0.75, y: 0.24, radius: 4, phase: 1.7, hue: "blue" },
  { x: 0.82, y: 0.5, radius: 4.5, phase: 2.1, hue: "cyan" },
  { x: 0.5, y: 0.58, radius: 4.5, phase: 2.9, hue: "blue" },
  { x: 0.7, y: 0.69, radius: 4, phase: 3.7, hue: "cyan" },
  { x: 0.36, y: 0.47, radius: 4, phase: 4.1, hue: "cyan" },
  { x: 0.9, y: 0.36, radius: 3.6, phase: 4.8, hue: "blue" },
  { x: 0.29, y: 0.24, radius: 3.2, phase: 5.2, hue: "cyan" },
  { x: 0.42, y: 0.77, radius: 3.7, phase: 5.8, hue: "blue" },
  { x: 0.89, y: 0.71, radius: 3.8, phase: 0.45, hue: "cyan" },
  { x: 0.6, y: 0.14, radius: 3.3, phase: 1.2, hue: "blue" },
  { x: 0.19, y: 0.61, radius: 3.2, phase: 2.5, hue: "cyan" },
  { x: 0.18, y: 0.34, radius: 3.3, phase: 3.4, hue: "blue" },
  { x: 0.76, y: 0.86, radius: 3.2, phase: 4.5, hue: "cyan" },
  { x: 0.54, y: 0.89, radius: 3.3, phase: 5.4, hue: "blue" },
  { x: 0.95, y: 0.57, radius: 2.9, phase: 0.7, hue: "cyan" },
  { x: 0.31, y: 0.86, radius: 2.9, phase: 2.1, hue: "blue" },
  { x: 0.1, y: 0.48, radius: 2.7, phase: 3.9, hue: "cyan" },
];

const nodeColor = {
  cyan: "#79e8f6",
  blue: "#79a7ff",
  red: "#ff4d5f",
};

function NetworkCanvas({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return undefined;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const draw = (timestamp: number) => {
      if (!width || !height) return;
      const time = timestamp / 1000;
      context.clearRect(0, 0, width, height);
      const points = canvasNodes.map((node) => {
        const drift = reducedMotion ? 0 : Math.sin(time * 0.35 + node.phase) * 10;
        let x = node.x * width + drift;
        let y = node.y * height + Math.cos(time * 0.28 + node.phase) * 8;
        const pointer = pointerRef.current;
        if (pointer.active && !reducedMotion) {
          const distance = Math.hypot(pointer.x - x, pointer.y - y);
          const influence = Math.max(0, 1 - distance / 260) * 0.075;
          x += (pointer.x - x) * influence;
          y += (pointer.y - y) * influence;
        }
        return { ...node, x, y };
      });

      context.lineWidth = 1;
      for (let sourceIndex = 0; sourceIndex < points.length; sourceIndex += 1) {
        for (let targetIndex = sourceIndex + 1; targetIndex < points.length; targetIndex += 1) {
          const source = points[sourceIndex];
          const target = points[targetIndex];
          const distance = Math.hypot(source.x - target.x, source.y - target.y);
          const threshold = source.focal || target.focal ? 260 : 182;
          if (distance > threshold) continue;
          const alpha = (1 - distance / threshold) * (source.focal || target.focal ? 0.42 : 0.2);
          context.strokeStyle = source.focal || target.focal ? `rgba(255, 77, 95, ${alpha})` : `rgba(98, 218, 239, ${alpha})`;
          context.beginPath();
          context.moveTo(source.x, source.y);
          context.lineTo(target.x, target.y);
          context.stroke();
        }
      }

      points.forEach((node) => {
        const pulse = node.focal && !reducedMotion ? 1 + Math.sin(time * 2.1) * 0.13 : 1;
        const radius = node.radius * pulse;
        context.save();
        context.shadowColor = nodeColor[node.hue];
        context.shadowBlur = node.focal ? 24 : 12;
        context.fillStyle = nodeColor[node.hue];
        context.globalAlpha = node.focal ? 1 : 0.88;
        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fill();
        if (node.focal) {
          context.globalAlpha = 0.18;
          context.lineWidth = 1.5;
          context.strokeStyle = nodeColor.red;
          context.beginPath();
          context.arc(node.x, node.y, radius + 11 + (reducedMotion ? 0 : Math.sin(time * 2.1) * 3), 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      });
    };

    const tick = (timestamp: number) => {
      draw(timestamp);
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(tick);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(performance.now());
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true };
    };
    const onPointerLeave = () => { pointerRef.current.active = false; };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    resize();
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [reducedMotion]);

  return (
    <div className="sutra-landing-hero__canvas-host" ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} className="sutra-landing-hero__canvas" />
      <div className="sutra-landing-hero__focal-label">ACTIVE CONNECTION</div>
    </div>
  );
}

function useHeroFade(reducedMotion: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      setProgress(0);
      return undefined;
    }
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      setProgress(Math.min(1, window.scrollY / 620));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return progress;
}

const capabilities = [
  {
    icon: <FileCheck2 size={20} />,
    title: "Evidence first",
    description: "Every analytical signal is kept beside source, confidence, timestamp, case, and document reference.",
    tone: "cyan",
  },
  {
    icon: <BrainCircuit size={20} />,
    title: "Assisted reasoning",
    description: "Surface entities and relationships while leaving interpretation, review, and decisions with investigators.",
    tone: "red",
  },
  {
    icon: <Network size={20} />,
    title: "Network intelligence",
    description: "Reveal patterns, connections, bridge entities, and relationship paths across an authorised investigation.",
    tone: "blue",
  },
  {
    icon: <Fingerprint size={20} />,
    title: "Investigator centric",
    description: "Designed for rapid context switching, explainability, and controlled investigative workflows.",
    tone: "cyan",
  },
];

const workflow = [
  ["01", "Ingest", "Bring authorised reports, records, and investigative notes into one evidence-aware workspace."],
  ["02", "Structure", "Identify people, accounts, devices, locations, documents, and their stated relationships."],
  ["03", "Explore", "Navigate a live evidence graph to inspect paths, patterns, and context without flattening the story."],
  ["04", "Explain", "Compare possible explanations against the same evidence and inspect exactly why a link appears."],
];

function MiniNetworkFigure() {
  return (
    <div className="sutra-mini-network" aria-label="Illustrative relationship network">
      <svg viewBox="0 0 540 300" role="img" aria-label="Synthetic relationship network illustration">
        <defs>
          <filter id="sutra-node-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g className="sutra-mini-network__lines">
          <line x1="269" y1="145" x2="167" y2="74" />
          <line x1="269" y1="145" x2="139" y2="212" />
          <line x1="269" y1="145" x2="392" y2="78" />
          <line x1="269" y1="145" x2="432" y2="186" />
          <line x1="167" y1="74" x2="78" y2="129" />
          <line x1="167" y1="74" x2="230" y2="36" />
          <line x1="139" y1="212" x2="74" y2="246" />
          <line x1="392" y1="78" x2="468" y2="46" />
          <line x1="432" y1="186" x2="474" y2="259" />
          <line x1="392" y1="78" x2="432" y2="186" className="is-inferred" />
        </g>
        <g filter="url(#sutra-node-glow)">
          <circle className="sutra-mini-network__node sutra-mini-network__node--focal" cx="269" cy="145" r="20" />
          <circle className="sutra-mini-network__node sutra-mini-network__node--person" cx="167" cy="74" r="13" />
          <circle className="sutra-mini-network__node sutra-mini-network__node--device" cx="139" cy="212" r="12" />
          <circle className="sutra-mini-network__node sutra-mini-network__node--person" cx="392" cy="78" r="13" />
          <circle className="sutra-mini-network__node sutra-mini-network__node--account" cx="432" cy="186" r="13" />
          <circle className="sutra-mini-network__node" cx="78" cy="129" r="8" />
          <circle className="sutra-mini-network__node" cx="230" cy="36" r="8" />
          <circle className="sutra-mini-network__node" cx="74" cy="246" r="8" />
          <circle className="sutra-mini-network__node" cx="468" cy="46" r="8" />
          <circle className="sutra-mini-network__node" cx="474" cy="259" r="8" />
        </g>
      </svg>
      <div className="sutra-mini-network__legend"><span><i className="is-person" /> Person</span><span><i className="is-account" /> Account</span><span><i className="is-inferred" /> Inferred context</span></div>
    </div>
  );
}

export function LandingPage({ onExplorePlatform, onWatchDemo, onOpenLogin, accessLabel = "Authorised access" }: LandingPageProps) {
  const reducedMotion = useReducedMotion();
  const fadeProgress = useHeroFade(reducedMotion);
  const heroContentStyle: CSSProperties | undefined = reducedMotion ? undefined : {
    opacity: Math.max(0.24, 1 - fadeProgress * 0.78),
    transform: `translate3d(0, ${fadeProgress * -42}px, 0)`,
  };

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function explorePlatform() {
    if (onExplorePlatform) {
      onExplorePlatform();
      return;
    }
    scrollTo("sutra-capabilities");
  }

  function watchDemo() {
    if (onWatchDemo) {
      onWatchDemo();
      return;
    }
    scrollTo("sutra-workflow");
  }

  return (
    <main className="sutra-landing">
      <section className="sutra-landing-hero" aria-labelledby="sutra-landing-title">
        <NetworkCanvas reducedMotion={reducedMotion} />
        <div className="sutra-landing__grid" aria-hidden="true" />
        <nav className="sutra-landing-nav" aria-label="SUTRA product navigation">
          <button type="button" className="sutra-landing-nav__brand" onClick={() => scrollTo("sutra-top")} aria-label="Back to the top of SUTRA">
            <span className="sutra-landing-nav__mark"><img src="/sutra-hacker.png" alt="SUTRA hacker" /></span>
            <span><strong>SUTRA</strong><small>INTELLIGENCE PLATFORM</small></span>
          </button>
          <div className="sutra-landing-nav__links">
            <button type="button" onClick={() => scrollTo("sutra-capabilities")}>Capabilities</button>
            <button type="button" onClick={() => scrollTo("sutra-workflow")}>Workflow</button>
            <button type="button" onClick={() => scrollTo("sutra-explainability")}>Explainability</button>
          </div>
          <Button size="sm" variant="quiet" onClick={onOpenLogin}>{accessLabel}</Button>
        </nav>

        <div className="sutra-landing-hero__inner" id="sutra-top" style={heroContentStyle}>
          <div className="sutra-landing-hero__copy">
            <div className="sutra-landing-kicker"><span /> Evidence-aware intelligence for investigators</div>
            <h1 id="sutra-landing-title">AI POWERED <em>CYBERCRIME</em> NETWORK ANALYSIS</h1>
            <p>SUTRA connects authorised case evidence, relationships, and explainable analytical signals into a focused investigative workspace.</p>
            <div className="sutra-landing-hero__actions">
              <Button variant="primary" size="lg" trailingIcon={<ArrowRight size={18} />} onClick={explorePlatform}>Explore Platform</Button>
              <Button variant="ghost" size="lg" leadingIcon={<Play size={16} fill="currentColor" />} onClick={watchDemo}>Watch Demo</Button>
            </div>
            <div className="sutra-landing-hero__proof">
              <span><CheckCircle2 size={15} /> Evidence provenance in view</span>
              <span><CheckCircle2 size={15} /> Synthetic demo intelligence only</span>
            </div>
          </div>
          <aside className="sutra-landing-hero__status-card" aria-label="Demo system snapshot">
            <div className="sutra-landing-hero__status-head"><span>NETWORK PULSE</span><StatusIndicator status="online">Monitoring</StatusIndicator></div>
            <strong>12<span> active links</span></strong>
            <div className="sutra-landing-pulse-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="sutra-landing-hero__status-list"><span>Evidence-backed <b>08</b></span><span>Needs review <b>04</b></span></div>
          </aside>
        </div>
        <button type="button" className="sutra-landing-scroll-cue" onClick={() => scrollTo("sutra-capabilities")} aria-label="Scroll to capabilities"><span>SCROLL TO EXPLORE</span><ChevronDown size={17} /></button>
      </section>

      <section className="sutra-landing-section sutra-landing-section--capabilities" id="sutra-capabilities">
        <Reveal className="sutra-landing-section__intro">
          <span className="sutra-landing-overline">Built for investigative clarity</span>
          <h2>Keep the evidence, the relationships, and the reasoning in the same view.</h2>
          <p>SUTRA is a decision-support surface: it helps teams inspect information, not infer guilt or replace investigative judgement.</p>
        </Reveal>
        <div className="sutra-capability-grid">
          {capabilities.map((capability, index) => (
            <Reveal key={capability.title} delay={index * 80} className="sutra-capability-reveal">
              <article className={`sutra-capability-card sutra-capability-card--${capability.tone}`}>
                <div className="sutra-capability-card__icon">{capability.icon}</div>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sutra-landing-section sutra-workflow-section" id="sutra-workflow">
        <Reveal className="sutra-landing-section__intro sutra-landing-section__intro--split">
          <div><span className="sutra-landing-overline">From record to reasoned lead</span><h2>A calm, traceable workflow for complex relationship intelligence.</h2></div>
          <p>The experience moves from records to context without hiding how a conclusion, suggestion, or hypothesis was assembled.</p>
        </Reveal>
        <div className="sutra-workflow">
          {workflow.map(([step, title, description], index) => (
            <Reveal key={step} delay={index * 90} direction="up">
              <article className="sutra-workflow__step"><span>{step}</span><div><h3>{title}</h3><p>{description}</p></div></article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sutra-landing-section sutra-network-section" aria-labelledby="sutra-network-title">
        <Reveal direction="left"><div className="sutra-network-section__copy"><span className="sutra-landing-overline">Network intelligence</span><h2 id="sutra-network-title">Find the connection, then inspect why it exists.</h2><p>Zoom into relationship paths, distinguish source-backed links from analytical context, and open the relevant evidence without losing your place in the investigation.</p><ul><li><Waypoints size={17} /> Focus paths between selected entities</li><li><SearchCheck size={17} /> Surface supporting records and confidence</li><li><MapPin size={17} /> Keep people, devices, locations, and accounts in context</li></ul><Button variant="secondary" trailingIcon={<ArrowRight size={16} />} onClick={explorePlatform}>Open the network explorer</Button></div></Reveal>
        <Reveal direction="right" delay={120}><Panel tone="elevated" padded={false} className="sutra-network-section__visual"><div className="sutra-network-section__visual-head"><div><span>RELATIONSHIP MAP</span><strong>Case 104 - Synthetic demo</strong></div><Chip tone="danger">1 focal link</Chip></div><MiniNetworkFigure /></Panel></Reveal>
      </section>

      <section className="sutra-landing-section sutra-hypothesis-section" id="sutra-explainability">
        <Reveal className="sutra-landing-section__intro">
          <span className="sutra-landing-overline">Hypothesis reasoning</span>
          <h2>Compare competing explanations against the same evidence.</h2>
          <p>SUTRA makes uncertainty visible. It records what supports, contradicts, or remains unknown for each working explanation.</p>
        </Reveal>
        <Reveal delay={100}><Panel tone="elevated" padded={false} className="sutra-hypothesis-preview"><div className="sutra-hypothesis-preview__header"><div><span>HYPOTHESIS WORKBENCH</span><strong>Evidence matrix - Review required</strong></div><Chip tone="hypothesis">Analytical workspace</Chip></div><div className="sutra-hypothesis-preview__table" role="table" aria-label="Example hypothesis comparison"><div role="row" className="is-header"><span role="columnheader">Evidence</span><span role="columnheader">H1 - Shared coordination</span><span role="columnheader">H2 - Coincidental contact</span><span role="columnheader">H3 - Unknown</span></div><div role="row"><span role="cell"><FileCheck2 size={15} /> Call record - 12 Aug</span><span role="cell" className="is-supports">Supports</span><span role="cell" className="is-unknown">Unknown</span><span role="cell" className="is-unknown">Unknown</span></div><div role="row"><span role="cell"><MapPin size={15} /> Park Street observation</span><span role="cell" className="is-supports">Supports</span><span role="cell" className="is-contradicts">Contradicts</span><span role="cell" className="is-unknown">Unknown</span></div><div role="row"><span role="cell"><MessageSquareText size={15} /> Reported statement</span><span role="cell" className="is-unknown">Unknown</span><span role="cell" className="is-supports">Supports</span><span role="cell" className="is-unknown">Unknown</span></div></div><p className="sutra-hypothesis-preview__notice">This comparison is a review aid. It does not determine factual truth, intent, or culpability.</p></Panel></Reveal>
      </section>

      <section className="sutra-landing-section sutra-assistant-section">
        <Reveal direction="left"><Panel tone="default" padded={false} className="sutra-assistant-preview"><div className="sutra-assistant-preview__header"><div className="sutra-assistant-preview__bot"><Bot size={18} /></div><div><span>AI ASSISTANT - DEMO MODE</span><strong>Structure a note, then review every result.</strong></div><StatusIndicator status="active">Ready</StatusIndicator></div><div className="sutra-assistant-preview__conversation"><p className="is-user">I met Rahul at Park Street on 12 August.</p><div className="is-assistant"><span>Analysing statement...</span><div><Chip tone="cyan">Rahul - Person</Chip><Chip tone="cyan">Park Street - Location</Chip><Chip tone="neutral">12 August - Date</Chip></div><p><Sparkles size={15} /> 3 entities identified - 2 draft relationships created</p></div></div></Panel></Reveal>
        <Reveal direction="right" delay={100}><div className="sutra-assistant-section__copy"><span className="sutra-landing-overline">Analyst-controlled assistance</span><h2>Turn narrative into a reviewable starting point.</h2><p>The assistant can demonstrate entity and relationship extraction using synthetic local state. Each result is presented with review controls and is ready for a later backend intelligence adapter.</p><div className="sutra-assistant-section__checks"><span><CheckCircle2 size={17} /> Citations and provenance visible</span><span><CheckCircle2 size={17} /> Graph actions are explicit</span><span><CheckCircle2 size={17} /> No autonomous conclusions</span></div><Button variant="secondary" trailingIcon={<ArrowRight size={16} />} onClick={explorePlatform}>Explore assistant workspace</Button></div></Reveal>
      </section>

      <section className="sutra-landing-section sutra-security-section">
        <Reveal className="sutra-security-section__intro"><span className="sutra-landing-overline">Security and explainability by design</span><h2>Operationally useful, deliberately accountable.</h2></Reveal>
        <div className="sutra-security-grid">
          <Reveal delay={40}><article><LockKeyhole size={21} /><h3>Controlled context</h3><p>Workspaces can remain scoped to authorised cases and roles.</p></article></Reveal>
          <Reveal delay={100}><article><ShieldCheck size={21} /><h3>Evidence-aware signals</h3><p>Verified records, inference, and hypotheses retain distinct visual treatment.</p></article></Reveal>
          <Reveal delay={160}><article><SearchCheck size={21} /><h3>Inspectable reasoning</h3><p>Review support, confidence, and source references before acting on a lead.</p></article></Reveal>
        </div>
      </section>

      <Reveal className="sutra-landing-final-cta" direction="scale"><div><span className="sutra-landing-overline">SUTRA intelligence platform</span><h2>Start with the evidence. Follow the connection. Keep the why in view.</h2></div><div><Button variant="primary" size="lg" trailingIcon={<ArrowRight size={18} />} onClick={explorePlatform}>Explore Platform</Button><Button variant="ghost" size="lg" onClick={onOpenLogin}>{accessLabel}</Button></div></Reveal>

      <footer className="sutra-landing-footer"><span><ShieldCheck size={15} /> SUTRA - Secure Unified Threat &amp; Relationship Analytics</span><span>Decision support only - Synthetic demonstration data</span></footer>
    </main>
  );
}
