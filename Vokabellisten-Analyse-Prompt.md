# Analyse-Prompt für Vokabellisten

```text
Analysiere die folgende Vokabelliste und bereite sie für den Import in meinen Vokabeltrainer vor.

Ziel:
Erstelle eine saubere CSV mit den Spalten:
fremdwort;uebersetzung;beispiel;hinweis;aussprache

Regeln:
- fremdwort = das zu lernende Wort in der Fremdsprache.
- uebersetzung = deutsche Übersetzung.
- beispiel = Beispielsatz, wenn vorhanden. Der Satz soll das Fremdwort enthalten, damit der Vokabeltrainer daraus einen Lückentext bauen kann.
- hinweis = nützliche Zusatzinfos wie BE/AE-Unterschiede, Verwechslungsgefahr, grammatische Hinweise, französische Entsprechungen oder Bedeutungsnuancen.
- aussprache = Lautschrift oder Aussprachehinweis, wenn vorhanden.
- Wenn eine Information nicht vorhanden ist, lasse das Feld leer.
- Verwende Semikolon als Trennzeichen.
- Wenn ein Feld selbst ein Semikolon enthält, formuliere es ohne Semikolon um oder setze das Feld in doppelte Anführungszeichen.
- Entferne Aufzählungszeichen, Seitenzahlen und Layoutreste.
- Behalte sinnvolle Hinweise, aber schreibe sie kurz und kindgerecht.
- Duplikate nach fremdwort entfernen.
- Gib ausschließlich die CSV aus, ohne Erklärung davor oder danach.

Beispielausgabe:
fremdwort;uebersetzung;beispiel;hinweis;aussprache
chocolate;Schokolade;Some dogs like chocolate, but it isn't good for them.;Fr. chocolat (m);[tʃɒklət]
crisp;Kartoffelchip;;BE: crisps = Chips, chips = Pommes frites;[krisp]

Hier ist die zu analysierende Liste:
[HIER TEXT, OCR ODER SCREENSHOT-INHALT EINFÜGEN]
```
