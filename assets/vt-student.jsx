// vt-student.jsx — Student view: wählt aus, welche zugewiesene Liste geübt wird

function StudentListPicker({ session, go, inClass }) {
  const showLists = ACTIVE_LANGUAGE === ASSIGNED_LISTS_LANG;
  const lists = showLists ? readAssignedLists() : [];
  const active = activeAssignedList();
  const totalWords = loadVocabulary(ACTIVE_LANGUAGE).length;
  const hasLists = lists.length > 0;

  const choose = (listId) => {
    selectAssignedList(listId);
    go("home");
  };

  const handleLogout = () => window._sb.auth.signOut();

  const optionStyle = (selected) => ({
    padding: "16px 18px", textAlign: "left", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 14, width: "100%",
    outline: selected ? "2px solid var(--accent)" : "none",
  });

  const option = (key, icon, title, sub, selected, onClick) => (
    <button key={key} className="card" onClick={onClick} style={optionStyle(selected)}>
      <span style={{ fontSize: 26 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>{title}</div>
        <div className="dim" style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>
      </div>
      {selected
        ? <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Aktiv</div>
        : <Icon name="arrowR" size={18} style={{ color: "var(--text-dim)" }} />}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header mit Logout */}
      <div style={{ padding: "20px 18px 14px", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="h1">Meine Listen</div>
          <div className="dim" style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>
            {totalWords > 0 ? "Was möchtest du üben?" : "Noch keine Liste von deiner Lehrperson."}
          </div>
        </div>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 14, flexShrink: 0, marginLeft: 10 }}
          onClick={handleLogout}>
          Abmelden
        </button>
      </div>

      <div className="scroll" style={{ padding: "3px 18px 32px" }}>
        {/* Kein-Klasse-Banner wenn nicht in einer Klasse */}
        {!inClass && (
          <div style={{ padding: "14px 16px", background: "var(--surface-2)",
            borderRadius: "var(--r-md)", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>ℹ️</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Du bist noch in keiner Klasse</div>
              <div className="dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Deine Lernfortschritte werden lokal gespeichert, aber nicht in die Schulrangliste eingetragen.
                Sobald deine Lehrperson dich hinzufügt, werden deine Daten mit der Klasse verknüpft.
              </div>
            </div>
          </div>
        )}

        {totalWords > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {option("all", "📚", "Alle Wörter", totalWords + " Wörter", !active, () => choose(null))}
            {lists.map(list => option(list.id, "📋", list.name, list.keys.length + " Wörter", active?.id === list.id, () => choose(list.id)))}
          </div>
        ) : (
          <React.Fragment>
            <div style={{ textAlign: "center", padding: "40px 20px", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Voki mood="idle" size={100} />
              <div className="h2">Noch keine Liste</div>
              <div className="dim" style={{ fontSize: 14, lineHeight: 1.55, maxWidth: 280 }}>
                Deine Lehrperson hat dir noch keine Vokabelliste zugewiesen.
              </div>
            </div>
            <div style={{ padding: "14px 16px", background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Lokal üben</div>
              <div className="dim" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
                Du kannst eigene Vokabeln hochladen und lokal üben – unabhängig von deiner Klasse.
                {!inClass && " Diese Fortschritte werden nicht in die Rangliste eingetragen."}
              </div>
              <button className="btn btn-ghost" style={{ width: "100%", fontSize: 15 }}
                onClick={() => go("local")}>
                Eigene Vokabeln nutzen
              </button>
            </div>
          </React.Fragment>
        )}

        {totalWords > 0 && !hasLists && showLists && (
          <div className="dim" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>
            Sobald dir eine Liste zugewiesen wird, erscheint sie hier.
          </div>
        )}
        {!showLists && (
          <div className="dim" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>
            Zugewiesene Listen sind Englisch. Wechsle in den Einstellungen die Sprache, um sie zu üben.
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { StudentListPicker });
