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
  if (error && error.code !== "23505") return { error: error.message };
  return { className: cls.name };
}

/* ── VocSetup: Anzeigename beim ersten Login (keine Rollenauswahl) ── */
function VocSetup({ session, onDone }) {
  const storedName = sessionStorage.getItem("vt_signup_name") || session.user.email.split("@")[0];
  const isTeacher = sessionStorage.getItem("vt_teacher_token") === TEACHER_INVITE_TOKEN;
  const [displayName, setDisplayName] = useAS(storedName);
  const [loading, setLoading] = useAS(false);
  const [error, setError] = useAS(null);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    const role = isTeacher ? "teacher" : "student";
    sessionStorage.removeItem("vt_teacher_token");
    sessionStorage.removeItem("vt_signup_name");
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

        {isTeacher && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--primary-soft)",
            borderRadius: "var(--r-sm)", textAlign: "center", fontSize: 14, fontWeight: 600,
            color: "var(--accent)" }}>
            👩‍🏫 Lehrer-Konto wird eingerichtet
          </div>
        )}

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

/* ── AuthScreen: nur E-Mail + Passwort (Login + Registrieren) ── */
function AuthScreen({ joinCode }) {
  const [mode, setMode] = useAS("login"); // "login" | "signup"
  const [email, setEmail] = useAS("");
  const [password, setPassword] = useAS("");
  const [confirmPassword, setConfirmPassword] = useAS("");
  const [displayName, setDisplayName] = useAS("");
  const [loading, setLoading] = useAS(false);
  const [sent, setSent] = useAS(false); // für E-Mail-Bestätigung nach Registrierung
  const [error, setError] = useAS(null);
  const emailRef = useAR(null);

  // Lehrer-Token aus URL erkennen und in sessionStorage sichern
  useAE(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("teacher");
    if (token) sessionStorage.setItem("vt_teacher_token", token);
    emailRef.current?.focus();
  }, []);

  const isTeacherToken = sessionStorage.getItem("vt_teacher_token") === TEACHER_INVITE_TOKEN;

  useAE(() => {
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }, [mode]);

  const handleLogin = async () => {
    setLoading(true); setError(null);
    if (joinCode) sessionStorage.setItem("vt_join", joinCode);
    const { error } = await window._sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message === "Invalid login credentials"
      ? "E-Mail oder Passwort falsch." : error.message);
  };

  const handleSignUp = async () => {
    if (password.length < 6) { setError("Passwort muss mindestens 6 Zeichen haben."); return; }
    if (password !== confirmPassword) { setError("Passwörter stimmen nicht überein."); return; }
    if (displayName.trim().length < 2) { setError("Name zu kurz (min. 2 Zeichen)."); return; }
    setLoading(true); setError(null);
    sessionStorage.setItem("vt_signup_name", displayName.trim());
    if (joinCode) sessionStorage.setItem("vt_join", joinCode);
    const { data, error } = await window._sb.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === "User already registered"
        ? "Diese E-Mail ist bereits registriert. Bitte anmelden." : error.message);
      return;
    }
    // Wenn keine Session sofort (E-Mail-Bestätigung aktiviert) → Hinweis zeigen
    if (!data?.session) setSent(true);
    // Wenn Session sofort da → onAuthStateChange löst VocSetup aus
  };

  const canLogin = email && password && !loading;
  const canSignUp = email && password && confirmPassword && displayName.trim() && !loading;

  if (sent) {
    return (
      <div className="scroll" style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 28px", minHeight: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
        <div className="h1" style={{ marginBottom: 10 }}>E-Mail bestätigen</div>
        <div className="dim" style={{ fontSize: 15, lineHeight: 1.6 }}>
          Wir haben einen Bestätigungslink an <strong>{email}</strong> geschickt.
          Klicke darauf, um dein Konto zu aktivieren.
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 28 }} onClick={() => { setSent(false); setMode("login"); }}>
          Zur Anmeldung
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
            {joinCode ? "Klasse beitreten" : isTeacherToken ? "Lehrer-Konto erstellen" : "Vokabeltrainer"}
          </div>
          {joinCode && (
            <div className="dim" style={{ fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>
              Du wurdest eingeladen! Melde dich an oder registriere dich, um der Klasse beizutreten.
            </div>
          )}
          {isTeacherToken && !joinCode && (
            <div className="dim" style={{ fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>
              Du wurdest als Lehrer eingeladen. Erstelle ein Konto, um zu starten.
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 3, marginBottom: 20 }}>
          {[["login", "Anmelden"], ["signup", "Registrieren"]].map(([m, label]) => (
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

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input className="field" type="text" placeholder="Anzeigename (wird anderen angezeigt)"
              value={displayName} onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canSignUp && handleSignUp()}
              maxLength={40} autoComplete="name" />
          )}

          <input ref={mode === "login" ? emailRef : undefined}
            className="field" type="email" placeholder="E-Mail-Adresse"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (mode === "login" ? canLogin && handleLogin() : canSignUp && handleSignUp())}
            autoComplete="email" />

          <input className="field" type="password"
            placeholder={mode === "signup" ? "Passwort (min. 6 Zeichen)" : "Passwort"}
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (mode === "login" ? canLogin && handleLogin() : canSignUp && handleSignUp())}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} />

          {mode === "signup" && (
            <input className="field" type="password" placeholder="Passwort bestätigen"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canSignUp && handleSignUp()}
              autoComplete="new-password" />
          )}

          {error && (
            <div style={{ color: "var(--wrong)", fontSize: 14, padding: "10px 14px",
              background: "var(--wrong-soft)", borderRadius: "var(--r-sm)" }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block"
            disabled={mode === "login" ? !canLogin : !canSignUp}
            onClick={mode === "login" ? handleLogin : handleSignUp}
            style={{ marginTop: 4 }}>
            {loading ? "…" : mode === "login" ? "Anmelden" : "Konto erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
