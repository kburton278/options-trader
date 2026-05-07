import { useState, useMemo } from "react";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (v) => {
  const abs = Math.abs(v);
  return (v < 0 ? "-$" : "$") + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
const today = () => new Date().toISOString().slice(0, 10);
const dayLabel = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ─── seed trades ────────────────────────────────────────────────────────────
const SEED = [
  { id: 1, date: "2026-04-28", ticker: "SPY", type: "CALL", strike: "520C", expiry: "5/2", contracts: 3, entry: 2.45, exit: 4.10, pnl: 495, note: "Strong breakout above VWAP, held through lunch." },
  { id: 2, date: "2026-04-29", ticker: "AAPL", type: "PUT", strike: "170P", expiry: "5/3", contracts: 2, entry: 1.80, exit: 0.90, pnl: -180, note: "Faded too early, news spike reversed me." },
  { id: 3, date: "2026-04-30", ticker: "TSLA", type: "CALL", strike: "250C", expiry: "5/7", contracts: 5, entry: 3.20, exit: 6.50, pnl: 1650, note: "Earnings play, perfect entry at support." },
  { id: 4, date: "2026-05-01", ticker: "QQQ", type: "PUT", strike: "440P", expiry: "5/1", contracts: 4, entry: 1.10, exit: 2.80, pnl: 680, note: "0DTE momentum trade, quick scalp." },
  { id: 5, date: "2026-05-02", ticker: "NVDA", type: "CALL", strike: "900C", expiry: "5/9", contracts: 1, entry: 8.50, exit: 5.20, pnl: -330, note: "Over-extended, should have waited for pullback." },
  { id: 6, date: "2026-05-05", ticker: "SPY", type: "CALL", strike: "525C", expiry: "5/9", contracts: 2, entry: 3.10, exit: 5.60, pnl: 500, note: "Gap and go Monday open." },
];

const EMPTY_FORM = { ticker: "", type: "CALL", strike: "", expiry: "", contracts: "", entry: "", exit: "", pnl: "", note: "" };

export default function App() {
  const [trades, setTrades] = useState(SEED);
  const [tab, setTab] = useState("dashboard"); // dashboard | journal | calendar | add
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dailyGoal, setDailyGoal] = useState(500);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("500");
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalPnL = useMemo(() => trades.reduce((a, t) => a + t.pnl, 0), [trades]);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const biggestWin = wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0;
  const biggestLoss = losses.length ? Math.min(...losses.map((t) => t.pnl)) : 0;

  // daily P&L map
  const dailyMap = useMemo(() => {
    const m = {};
    trades.forEach((t) => { m[t.date] = (m[t.date] || 0) + t.pnl; });
    return m;
  }, [trades]);

  const todayPnL = dailyMap[today()] || 0;
  const goalPct = Math.min(100, Math.max(0, (todayPnL / dailyGoal) * 100));

  // ── form helpers ───────────────────────────────────────────────────────────
  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setTab("add"); };
  const openEdit = (t) => {
    setForm({ ticker: t.ticker, type: t.type, strike: t.strike, expiry: t.expiry, contracts: String(t.contracts), entry: String(t.entry), exit: String(t.exit), pnl: String(t.pnl), note: t.note });
    setEditId(t.id); setTab("add");
  };

  const handleSave = () => {
    if (!form.ticker || !form.pnl) return;
    const record = {
      id: editId || Date.now(),
      date: today(),
      ticker: form.ticker.toUpperCase(),
      type: form.type,
      strike: form.strike,
      expiry: form.expiry,
      contracts: parseInt(form.contracts) || 1,
      entry: parseFloat(form.entry) || 0,
      exit: parseFloat(form.exit) || 0,
      pnl: parseFloat(form.pnl) || 0,
      note: form.note,
    };
    if (editId) setTrades((p) => p.map((t) => (t.id === editId ? record : t)));
    else setTrades((p) => [record, ...p]);
    setTab("journal");
  };

  const handleDelete = (id) => setTrades((p) => p.filter((t) => t.id !== id));

  // ── calendar ───────────────────────────────────────────────────────────────
  const calDays = useMemo(() => {
    const { year, month } = calMonth;
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }, [calMonth]);

  const getDayKey = (d) => !d ? null :
    `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const monthPnL = useMemo(() => {
    let t = 0;
    calDays.forEach((d) => { const k = getDayKey(d); if (k && dailyMap[k]) t += dailyMap[k]; });
    return t;
  }, [calDays, dailyMap]);

  const maxAbs = Math.max(...Object.values(dailyMap).map(Math.abs), 1);
  const todayKey = today();
  const monthName = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleString("default", { month: "long", year: "numeric" });

  const selDayTrades = selectedDay ? trades.filter((t) => t.date === selectedDay) : [];

  // ── color helpers ──────────────────────────────────────────────────────────
  const G = "#39d98a"; const R = "#ff5c5c"; const B = "#4cc9f0";
  const isUp = (v) => v >= 0;

  return (
    <div style={S.phone}>
      <style>{CSS}</style>

      {/* Status bar */}
      <div style={S.status}>
        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span style={{ color: G, fontSize: 10, letterSpacing: "0.12em" }}>● OPTIONS TRACKER</span>
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && (
        <div style={S.screen}>
          <div style={S.pageHead}>
            <div>
              <div style={S.eyebrow}>DAY TRADING</div>
              <div style={S.pageTitle}>Dashboard</div>
            </div>
            <button style={S.addFab} onClick={openAdd}>+ Trade</button>
          </div>

          {/* Today goal card */}
          <div style={{ ...S.card, borderColor: isUp(todayPnL) ? G : R, marginBottom: 12 }}>
            <div style={S.cardRow}>
              <div>
                <div style={S.eyebrow}>TODAY'S P&L</div>
                <div style={{ ...S.bigNum, color: isUp(todayPnL) ? G : R }}>{fmt(todayPnL)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.eyebrow}>DAILY GOAL</div>
                {editGoal ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                    <input style={{ ...S.miniInput, width: 70 }} value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)} type="number" />
                    <button style={S.tinyBtn} onClick={() => { setDailyGoal(parseFloat(goalInput) || 500); setEditGoal(false); }}>✓</button>
                  </div>
                ) : (
                  <div style={{ ...S.bigNum, fontSize: 20, cursor: "pointer", color: "rgba(240,244,255,0.6)" }}
                    onClick={() => { setGoalInput(String(dailyGoal)); setEditGoal(true); }}>
                    {fmt(dailyGoal)} ✎
                  </div>
                )}
              </div>
            </div>
            {/* Goal progress bar */}
            <div style={{ marginTop: 14 }}>
              <div style={S.goalBarWrap}>
                <div style={{ ...S.goalBarFill, width: `${goalPct}%`, background: todayPnL < 0 ? R : todayPnL >= dailyGoal ? `linear-gradient(90deg,${G},${B})` : G }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={S.micro}>{goalPct.toFixed(0)}% of goal</span>
                <span style={{ ...S.micro, color: todayPnL >= dailyGoal ? G : "rgba(240,244,255,0.3)" }}>
                  {todayPnL >= dailyGoal ? "🎯 Goal hit!" : `${fmt(dailyGoal - todayPnL)} remaining`}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={S.statsRow}>
            {[
              { label: "WIN RATE", value: `${winRate.toFixed(0)}%`, color: winRate >= 50 ? G : R },
              { label: "TOTAL P&L", value: fmt(totalPnL), color: isUp(totalPnL) ? G : R },
              { label: "TRADES", value: trades.length, color: B },
            ].map((s, i) => (
              <div key={i} style={S.statBox}>
                <div style={S.eyebrow}>{s.label}</div>
                <div style={{ ...S.statVal, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Best / Worst */}
          <div style={S.statsRow}>
            <div style={{ ...S.statBox, flex: 1, borderColor: "rgba(57,217,138,0.2)" }}>
              <div style={S.eyebrow}>BIGGEST WIN</div>
              <div style={{ ...S.statVal, color: G, fontSize: 18 }}>{fmt(biggestWin)}</div>
            </div>
            <div style={{ ...S.statBox, flex: 1, borderColor: "rgba(255,92,92,0.2)" }}>
              <div style={S.eyebrow}>BIGGEST LOSS</div>
              <div style={{ ...S.statVal, color: R, fontSize: 18 }}>{fmt(biggestLoss)}</div>
            </div>
          </div>

          {/* Win/loss bar */}
          <div style={S.card}>
            <div style={S.eyebrow}>WIN / LOSS BREAKDOWN</div>
            <div style={{ display: "flex", gap: 3, marginTop: 10, height: 8, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ flex: wins.length || 0.01, background: G, borderRadius: "6px 0 0 6px" }} />
              <div style={{ flex: losses.length || 0.01, background: R, borderRadius: "0 6px 6px 0" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ ...S.micro, color: G }}>{wins.length} wins</span>
              <span style={{ ...S.micro, color: R }}>{losses.length} losses</span>
            </div>
          </div>

          {/* Recent trades */}
          <div style={S.sectionLabel}>RECENT TRADES</div>
          {trades.slice(0, 3).map((t) => (
            <TradeRow key={t.id} t={t} G={G} R={R} onEdit={() => openEdit(t)} onDelete={() => handleDelete(t.id)} expanded={expandedId === t.id} onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)} />
          ))}
        </div>
      )}

      {/* ── JOURNAL ── */}
      {tab === "journal" && (
        <div style={S.screen}>
          <div style={S.pageHead}>
            <div>
              <div style={S.eyebrow}>OPTIONS</div>
              <div style={S.pageTitle}>Trade Journal</div>
            </div>
            <button style={S.addFab} onClick={openAdd}>+ Trade</button>
          </div>
          {trades.length === 0 && <div style={S.empty}>No trades yet. Tap + Trade to log one.</div>}
          {trades.map((t) => (
            <TradeRow key={t.id} t={t} G={G} R={R} onEdit={() => openEdit(t)} onDelete={() => handleDelete(t.id)} expanded={expandedId === t.id} onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)} />
          ))}
        </div>
      )}

      {/* ── CALENDAR ── */}
      {tab === "calendar" && (
        <div style={S.screen}>
          <div style={S.pageHead}>
            <div>
              <div style={S.eyebrow}>PERFORMANCE</div>
              <div style={S.pageTitle}>P&L Calendar</div>
            </div>
          </div>

          <div style={{ ...S.card, borderColor: isUp(monthPnL) ? G : R, marginBottom: 14 }}>
            <div style={S.eyebrow}>MONTH TOTAL · {monthName.toUpperCase()}</div>
            <div style={{ ...S.bigNum, color: isUp(monthPnL) ? G : R }}>{fmt(monthPnL)}</div>
          </div>

          <div style={S.calNav}>
            <button style={S.calArrow} onClick={() => { setCalMonth(({ year, month }) => { const d = new Date(year, month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); setSelectedDay(null); }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>{monthName}</span>
            <button style={S.calArrow} onClick={() => { setCalMonth(({ year, month }) => { const d = new Date(year, month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); setSelectedDay(null); }}>›</button>
          </div>

          <div style={S.calWeekRow}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} style={S.calWeekLbl}>{d}</div>
            ))}
          </div>

          <div style={S.calGrid}>
            {calDays.map((d, i) => {
              const key = getDayKey(d);
              const val = key && dailyMap[key] !== undefined ? dailyMap[key] : null;
              const isToday = key === todayKey;
              const isSel = key === selectedDay;
              const weekend = d ? [0, 6].includes(new Date(calMonth.year, calMonth.month, d).getDay()) : false;
              let bg = "transparent";
              if (val !== null) {
                const intensity = Math.min(0.9, Math.abs(val) / maxAbs);
                bg = val >= 0 ? `rgba(57,217,138,${(intensity * 0.35).toFixed(2)})` : `rgba(255,92,92,${(intensity * 0.35).toFixed(2)})`;
              }
              return (
                <div key={i} style={{ ...S.calCell, background: bg, border: isSel ? `1.5px solid ${val >= 0 ? G : R}` : isToday ? `1.5px solid ${B}` : "1px solid rgba(255,255,255,0.04)", opacity: weekend && !val ? 0.2 : 1, cursor: val !== null ? "pointer" : "default" }}
                  onClick={() => { if (key && val !== null) setSelectedDay(isSel ? null : key); }}>
                  {d && <>
                    <div style={{ ...S.calDay, color: isToday ? B : "rgba(240,244,255,0.7)" }}>{d}</div>
                    {val !== null && <div style={{ fontSize: 7, fontWeight: 700, color: val >= 0 ? G : R, textAlign: "center" }}>
                      {val >= 0 ? "+" : "−"}{Math.abs(val) >= 1000 ? `${(Math.abs(val) / 1000).toFixed(1)}k` : Math.abs(val).toFixed(0)}
                    </div>}
                  </>}
                </div>
              );
            })}
          </div>

          {selectedDay && (
            <div style={S.card}>
              <div style={S.eyebrow}>{dayLabel(selectedDay)} · {selDayTrades.length} TRADE{selDayTrades.length !== 1 ? "S" : ""}</div>
              <div style={{ ...S.bigNum, fontSize: 22, color: isUp(dailyMap[selectedDay] || 0) ? G : R, marginBottom: 10 }}>
                {fmt(dailyMap[selectedDay] || 0)}
              </div>
              {selDayTrades.map((t) => (
                <div key={t.id} style={{ ...S.miniTradeRow, borderColor: t.pnl >= 0 ? "rgba(57,217,138,0.2)" : "rgba(255,92,92,0.2)" }}>
                  <span style={{ color: t.pnl >= 0 ? G : R, fontWeight: 700, fontSize: 12 }}>{t.ticker} {t.type} {t.strike}</span>
                  <span style={{ color: t.pnl >= 0 ? G : R, fontWeight: 700, fontSize: 12 }}>{fmt(t.pnl)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT TRADE ── */}
      {tab === "add" && (
        <div style={S.screen}>
          <div style={S.pageHead}>
            <div>
              <div style={S.eyebrow}>{editId ? "EDIT" : "LOG"}</div>
              <div style={S.pageTitle}>{editId ? "Edit Trade" : "New Trade"}</div>
            </div>
            <button style={{ ...S.calArrow, fontSize: 16 }} onClick={() => setTab("journal")}>✕</button>
          </div>

          <div style={S.formCard}>
            {/* Type toggle */}
            <div style={S.eyebrow}>OPTION TYPE</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
              {["CALL", "PUT"].map((t) => (
                <button key={t} style={{ ...S.typeBtn, background: form.type === t ? (t === "CALL" ? G : R) : "rgba(255,255,255,0.05)", color: form.type === t ? "#0a0d18" : "rgba(240,244,255,0.5)", border: "none" }}
                  onClick={() => setForm({ ...form, type: t })}>{t}</button>
              ))}
            </div>

            <div style={S.formGrid}>
              {[
                { label: "TICKER", key: "ticker", placeholder: "SPY" },
                { label: "STRIKE", key: "strike", placeholder: "520C" },
                { label: "EXPIRY", key: "expiry", placeholder: "5/9" },
                { label: "CONTRACTS", key: "contracts", placeholder: "1", type: "number" },
                { label: "ENTRY ($)", key: "entry", placeholder: "2.45", type: "number" },
                { label: "EXIT ($)", key: "exit", placeholder: "4.10", type: "number" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <div style={S.fieldLabel}>{label}</div>
                  <input style={S.input} placeholder={placeholder} type={type || "text"} value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>

            {/* P&L — full width, prominent */}
            <div style={S.fieldLabel}>P&L ($) *</div>
            <input style={{ ...S.input, fontSize: 20, fontWeight: 700, color: parseFloat(form.pnl) >= 0 ? G : R, marginBottom: 14 }}
              placeholder="495.00" type="number" value={form.pnl}
              onChange={(e) => setForm({ ...form, pnl: e.target.value })} />

            <div style={S.fieldLabel}>TRADE NOTES / JOURNAL</div>
            <textarea style={S.textarea} placeholder="What was your setup? Why did you enter? What did you learn?"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />

            <button style={S.saveBtn} onClick={handleSave}>
              {editId ? "Save Changes" : "Log Trade"}
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={S.nav}>
        {[
          { id: "dashboard", icon: "◈", label: "Overview" },
          { id: "journal", icon: "✦", label: "Journal" },
          { id: "calendar", icon: "▦", label: "Calendar" },
        ].map(({ id, icon, label }) => (
          <button key={id} style={{ ...S.navBtn, color: tab === id ? G : "rgba(240,244,255,0.28)" }}
            onClick={() => setTab(id)}>
            <span style={{ fontSize: 17 }}>{icon}</span>
            <span style={{ fontSize: 9, letterSpacing: "0.1em", fontWeight: 600 }}>{label}</span>
            {tab === id && <div style={S.pip} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Trade Row Component ────────────────────────────────────────────────────
function TradeRow({ t, G, R, onEdit, onDelete, expanded, onToggle }) {
  const isUp = t.pnl >= 0;
  return (
    <div style={{ margin: "0 16px 8px", borderRadius: 14, overflow: "hidden", border: `1px solid ${isUp ? "rgba(57,217,138,0.15)" : "rgba(255,92,92,0.15)"}`, background: "rgba(255,255,255,0.025)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: isUp ? "rgba(57,217,138,0.12)" : "rgba(255,92,92,0.12)", color: isUp ? G : R, fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 7, letterSpacing: "0.08em" }}>
            {t.ticker} {t.type}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{t.strike} · exp {t.expiry}</div>
            <div style={{ fontSize: 10, color: "rgba(240,244,255,0.35)", marginTop: 2 }}>{t.contracts} contract{t.contracts !== 1 ? "s" : ""} · {t.date}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: isUp ? G : R }}>{isUp ? "+" : ""}{fmt(t.pnl).replace("$", "")}</div>
          <div style={{ fontSize: 9, color: "rgba(240,244,255,0.3)", marginTop: 2 }}>{expanded ? "▲ less" : "▼ more"}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: t.note ? 10 : 0 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "rgba(240,244,255,0.3)", marginBottom: 3 }}>ENTRY</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>${t.entry.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "rgba(240,244,255,0.3)", marginBottom: 3 }}>EXIT</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>${t.exit.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, background: isUp ? "rgba(57,217,138,0.08)" : "rgba(255,92,92,0.08)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "rgba(240,244,255,0.3)", marginBottom: 3 }}>P&L</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isUp ? G : R }}>{fmt(t.pnl)}</div>
            </div>
          </div>
          {t.note && (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "rgba(240,244,255,0.6)", lineHeight: 1.5, fontStyle: "italic", marginBottom: 10 }}>
              "{t.note}"
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "8px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(240,244,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }} onClick={onEdit}>Edit</button>
            <button style={{ flex: 1, padding: "8px", borderRadius: 9, border: "1px solid rgba(255,92,92,0.25)", background: "rgba(255,92,92,0.08)", color: "#ff5c5c", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }} onClick={onDelete}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  phone: {
    width: 390, minHeight: 844, background: "#0a0d18", borderRadius: 48, margin: "0 auto",
    overflow: "hidden", fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "#e8edf8",
    display: "flex", flexDirection: "column",
    boxShadow: "0 40px 100px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.07)",
  },
  status: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 26px 6px", fontSize: 11, color: "rgba(232,237,248,0.35)", letterSpacing: "0.06em", flexShrink: 0,
  },
  screen: { flex: 1, overflowY: "auto", paddingBottom: 6 },
  pageHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 20px 16px" },
  eyebrow: { fontSize: 9, letterSpacing: "0.22em", color: "rgba(232,237,248,0.3)", marginBottom: 3 },
  pageTitle: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" },
  addFab: {
    background: "linear-gradient(135deg,#39d98a,#4cc9f0)", color: "#0a0d18", border: "none",
    borderRadius: 12, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em",
  },
  card: {
    margin: "0 16px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 18, padding: "16px 18px",
  },
  cardRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  bigNum: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 4 },
  goalBarWrap: { height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" },
  goalBarFill: { height: "100%", borderRadius: 4, transition: "width 0.8s ease" },
  micro: { fontSize: 10, color: "rgba(232,237,248,0.35)", letterSpacing: "0.04em" },
  statsRow: { display: "flex", gap: 8, margin: "0 16px 10px" },
  statBox: {
    flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14, padding: "12px 14px",
  },
  statVal: { fontSize: 16, fontWeight: 700, marginTop: 4 },
  sectionLabel: { fontSize: 9, letterSpacing: "0.2em", color: "rgba(232,237,248,0.3)", padding: "6px 20px 8px" },
  empty: { textAlign: "center", color: "rgba(232,237,248,0.3)", fontSize: 13, padding: "40px 20px" },
  miniTradeRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid", marginBottom: 4 },
  // Calendar
  calNav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 18px 12px" },
  calArrow: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8edf8", width: 32, height: 32, borderRadius: 9, fontSize: 18, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" },
  calWeekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 13px", marginBottom: 4 },
  calWeekLbl: { fontSize: 9, color: "rgba(232,237,248,0.28)", textAlign: "center", letterSpacing: "0.08em", padding: "3px 0" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, padding: "0 13px", marginBottom: 12 },
  calCell: { borderRadius: 8, padding: "5px 3px 4px", minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", transition: "all 0.15s" },
  calDay: { fontSize: 10, fontWeight: 600, marginBottom: 3 },
  // Form
  formCard: { margin: "0 16px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "18px 16px 24px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
  fieldLabel: { fontSize: 9, letterSpacing: "0.18em", color: "rgba(232,237,248,0.35)", marginBottom: 5 },
  input: {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10, padding: "10px 12px", color: "#e8edf8", fontSize: 14,
    fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  },
  textarea: {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 10, padding: "10px 12px", color: "#e8edf8", fontSize: 13,
    fontFamily: "inherit", boxSizing: "border-box", outline: "none", minHeight: 90, resize: "none",
    lineHeight: 1.5, marginBottom: 16, marginTop: 5,
  },
  typeBtn: { flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" },
  saveBtn: {
    width: "100%", padding: "14px", borderRadius: 14, border: "none",
    background: "linear-gradient(135deg,#39d98a,#4cc9f0)", color: "#0a0d18",
    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em",
  },
  miniInput: {
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, padding: "5px 8px", color: "#e8edf8", fontSize: 14,
    fontFamily: "inherit", outline: "none",
  },
  tinyBtn: { background: "#39d98a", border: "none", color: "#0a0d18", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" },
  // Nav
  nav: { display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,13,24,0.97)", flexShrink: 0, padding: "10px 0 22px" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "6px 0", transition: "color 0.2s", position: "relative" },
  pip: { position: "absolute", bottom: -5, width: 4, height: 4, borderRadius: "50%", background: "#39d98a", left: "50%", transform: "translateX(-50%)" },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
  input::placeholder, textarea::placeholder { color: rgba(232,237,248,0.2); }
  ::-webkit-scrollbar { display: none; }
`;