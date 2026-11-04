// vt-auth.jsx — Supabase client + Auth- und Setup-Screens

window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { useState: useAS, useEffect: useAE, useRef: useAR } = React;

/* ── VocSetup: Anzeigename beim ersten Login (keine Rollenauswahl) ── */
function VocSetup({ session, onDone }) {
  const [displayName, setDisplayName] = useAS(session.user.email.split("@")[0]);
  const [loading, setLoading] = useAS(false);
  const [error, setError] = useAS(null);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    // Rolle wird serverseitig erzwungen (Trigger voc_users_protect_role); Lehrer/Admin nur per SQL.
    const role = "student";
    const { error } = await window._sb.from("voc_users").upsert({
      id: session.user.id,
      display_name: displayName.trim(),
      full_name: null,
      role,
      show_real_name: false,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onDone({ id: session.user.id, display_name: displayName.trim(), role });
  };

  return (
    <div className="scroll" style={{ display: "flex", flexDirection: "column", padding: "0 24px 32px", minHeight: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0, paddingTop: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Voki mood="happy" size={110} float />
          <div className="h1" style={{ marginTop: 16 }}>Fast fertig!</div>
          <div className="dim" style={{ fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>
            Wie soll dein Name angezeigt werden?
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            className="field"
            type="text"
            placeholder="Anzeigename"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && displayName.trim() && handleSave()}
            maxLength={40}
            autoFocus
          />

          {error && (
            <div style={{ color: "var(--wrong)", fontSize: 14, padding: "10px 14px",
              background: "var(--wrong-soft)", borderRadius: "var(--r-sm)" }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-block"
            disabled={!displayName.trim() || loading}
            onClick={handleSave}
            style={{ marginTop: 4 }}>
            {loading ? "…" : "Los geht's"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AuthScreen: nur Anmelden mit E-Mail + Passwort; Konten werden zentral angelegt ── */
function AuthScreen() {
  const [email, setEmail] = useAS("");
  const [password, setPassword] = useAS("");
  const [loading, setLoading] = useAS(false);
  const [error, setError] = useAS(null);
  const emailRef = useAR(null);

  useAE(() => { emailRef.current?.focus(); }, []);

  const handleLogin = async () => {
    setLoading(true); setError(null);
    const { error } = await window._sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message === "Invalid login credentials"
      ? "E-Mail oder Passwort falsch." : error.message);
  };

  const canLogin = email && password && !loading;

  return (
    <div className="scroll" style={{ display: "flex", flexDirection: "column", padding: "0 24px 32px", minHeight: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Voki mood="happy" size={110} float />
          <div className="h1" style={{ marginTop: 16 }}>Vokabeltrainer</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input ref={emailRef}
            className="field" type="email" placeholder="E-Mail-Adresse"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canLogin && handleLogin()}
            autoComplete="email" />

          <input className="field" type="password"
            placeholder="Passwort"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canLogin && handleLogin()}
            autoComplete="current-password" />

          {error && (
            <div style={{ color: "var(--wrong)", fontSize: 14, padding: "10px 14px",
              background: "var(--wrong-soft)", borderRadius: "var(--r-sm)" }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block"
            disabled={!canLogin}
            onClick={handleLogin}
            style={{ marginTop: 4 }}>
            {loading ? "…" : "Anmelden"}
          </button>
        </div>
      </div>
    </div>
  );
}
