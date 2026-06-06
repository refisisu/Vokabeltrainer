// vt-auth.jsx — Supabase client + Auth- und Setup-Screens

window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { useState: useAS, useEffect: useAE, useRef: useAR } = React;

/* ── Klasse per Join-Code beitreten ── */
async function joinClass(joinCode, userId) {
  const { data: cls, error: findErr } = await window._sb
    .from("voc_classes")
    .select("id, name")
    .eq("join_code", joinCode)
    .maybeSingle();
  if (findErr || !cls) return { error: "Klasse nicht gefunden." };
  const { error } = await window._sb
    .from("voc_class_members")
    .insert({ class_id: cls.id, user_id: userId });
  if (error && error.code !== "23505") return { error: error.message }; // 23505 = already member
  return { className: cls.name };
}

/* ── VocSetup: Anzeigename + Rolle beim ersten Login ── */
function VocSetup({ session, onDone }) {
  const [displayName, setDisplayName] = useAS(
    session.user.email.split("@")[0]
  );
  const [role, setRole] = useAS("student");
  const [loading, setLoading] = useAS(false);
  const [error, setError] = useAS(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
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
            maxLength={40}
          />

          <div style={{ display: "flex", gap: 10 }}>
            {[["student", "Ich bin Schüler/in"], ["teacher", "Ich bin Lehrer/in"]].map(([val, label]) => (
              <button key={val} onClick={() => setRole(val)}
                style={{ flex: 1, padding: "14px 12px", border: `2px solid ${role === val ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--r-md)", background: role === val ? "var(--primary-soft)" : "var(--surface)",
                  color: role === val ? "var(--accent)" : "var(--text-dim)", fontFamily: "var(--font-ui)",
                  fontWeight: 600, fontSize: 14, cursor: "pointer", textAlign: "center",
                  transition: "all var(--t-fast)" }}>
                {val === "student" ? "🎒" : "👩‍🏫"}<br />
                <span style={{ fontSize: 13, marginTop: 4, display: "block" }}>{label}</span>
              </button>
            ))}
          </div>

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

/* ── AuthScreen: Magic Link + Passwort ── */
function AuthScreen({ joinCode }) {
  const [mode, setMode] = useAS("magic");
  const [email, setEmail] = useAS("");
  const [password, setPassword] = useAS("");
  const [loading, setLoading] = useAS(false);
  const [sent, setSent] = useAS(false);
  const [error, setError] = useAS(null);
  const emailRef = useAR(null);

  useAE(() => { emailRef.current?.focus(); }, []);

  const handleMagicLink = async () => {
    setLoading(true); setError(null);
    if (joinCode) sessionStorage.setItem("vt_join", joinCode);
    const { error } = await window._sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const handlePassword = async () => {
    setLoading(true); setError(null);
    const { error } = await window._sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message === "Invalid login credentials"
      ? "E-Mail oder Passwort falsch." : error.message);
  };

  const submit = mode === "magic" ? handleMagicLink : handlePassword;
  const canSubmit = email && (mode === "magic" || password) && !loading;

  if (sent) {
    return (
      <div className="scroll" style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 28px", minHeight: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
        <div className="h1" style={{ marginBottom: 10 }}>Prüfe deine E-Mails</div>
        <div className="dim" style={{ fontSize: 15, lineHeight: 1.6 }}>
          Wir haben einen Magic Link an <strong>{email}</strong> geschickt.
          Tippe darauf, um dich anzumelden.
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 28 }} onClick={() => setSent(false)}>
          Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  return (
    <div className="scroll" style={{ display: "flex", flexDirection: "column", padding: "0 24px 32px", minHeight: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Voki mood="happy" size={110} float />
          <div className="h1" style={{ marginTop: 16 }}>
            {joinCode ? "Klasse beitreten" : "Anmelden"}
          </div>
          {joinCode && (
            <div className="dim" style={{ fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>
              Du wurdest eingeladen! Melde dich an, um der Klasse beizutreten.
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 3, marginBottom: 20 }}>
          {[["magic", "Magic Link"], ["password", "Passwort"]].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: "10px 0", border: "none",
                borderRadius: "calc(var(--r-md) - 3px)",
                fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15, cursor: "pointer",
                background: mode === m ? "var(--surface)" : "transparent",
                color: mode === m ? "var(--text)" : "var(--text-dim)",
                boxShadow: mode === m ? "0 1px 4px var(--shadow)" : "none",
                transition: "all var(--t-fast)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input ref={emailRef} className="field" type="email" placeholder="E-Mail-Adresse"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canSubmit && submit()}
            autoComplete="email" />

          {mode === "password" && (
            <input className="field" type="password" placeholder="Passwort"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canSubmit && submit()}
              autoComplete="current-password" />
          )}

          {error && (
            <div style={{ color: "var(--wrong)", fontSize: 14, padding: "10px 14px",
              background: "var(--wrong-soft)", borderRadius: "var(--r-sm)" }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" disabled={!canSubmit} onClick={submit}
            style={{ marginTop: 4 }}>
            {loading ? "…" : mode === "magic" ? "Magic Link senden" : "Anmelden"}
          </button>
        </div>
      </div>
    </div>
  );
}
