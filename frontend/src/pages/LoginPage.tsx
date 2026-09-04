import { type FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { sutraApi } from "../api/client";
import { useSystemHealth } from "../api/queries";
import { errorMessage } from "../lib/format";
import type { AuthSession } from "../types/api";
import { StatusPill } from "../components/StatusPill";

export function LoginPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const health = useSystemHealth();
  const login = useMutation({ mutationFn: sutraApi.login, onSuccess: onAuthenticated });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email: email.trim(), password });
  }

  return (
    <main className="login-page">
      <div className="login-page__ambient login-page__ambient--one" />
      <div className="login-page__ambient login-page__ambient--two" />
      <section className="login-intro">
        <div className="brand brand--login">
          <div className="brand__mark"><ShieldCheck size={25} /></div>
          <div><strong>SUTRA</strong><span>SECURE UNIFIED THREAT &amp; RELATIONSHIP ANALYTICS</span></div>
        </div>
        <div className="login-intro__copy">
          <div className="eyebrow">Investigator decision-support platform</div>
          <h1>Make relationships<br /><em>explainable.</em></h1>
          <p>Explore authorised case evidence, understand network connections, and keep the originating records in view.</p>
        </div>
        <div className="login-intro__principles">
          <div><ShieldCheck size={18} /><span><strong>Evidence-first</strong>Verified facts remain distinct from analytical inference.</span></div>
          <div><KeyRound size={18} /><span><strong>Access-controlled</strong>Every session is accountable to an authorised investigator.</span></div>
        </div>
      </section>
      <section className="login-panel-wrap">
        <form className="login-panel" onSubmit={submit}>
          <div className="login-panel__header">
            <div className="eyebrow">Authorised access</div>
            <h2>Enter the console</h2>
            <p>Use your SUTRA investigator credentials to begin a secure session.</p>
          </div>
          <label className="field-label" htmlFor="email">Email address</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="investigator@sutra.local" required disabled={login.isPending} />
          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required disabled={login.isPending} />
          {login.isError && <div className="inline-error" role="alert"><LockKeyhole size={16} /> {errorMessage(login.error)}</div>}
          <button className="button button--primary button--wide" type="submit" disabled={login.isPending}>
            {login.isPending ? "Authenticating..." : <>Authenticate <ArrowRight size={17} /></>}
          </button>
          <p className="login-panel__notice">This system is for authorised investigation and analysis only. Never treat an analytical finding as proof without review.</p>
        </form>
        <div className="login-health">
          <span>System readiness</span>
          {health.isLoading ? <StatusPill status="UNKNOWN">Checking services</StatusPill> : health.isError ? <StatusPill status="OFFLINE">API unavailable</StatusPill> : <StatusPill status={health.data?.status} />}
        </div>
      </section>
    </main>
  );
}
