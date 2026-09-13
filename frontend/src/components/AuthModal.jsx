import { useState } from "react";
import { X, LogIn, UserPlus, Coins, LogOut, Gift } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function AuthForm({ onDone }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), password);
      onDone();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="eb-auth-form">
      <div className="eb-auth-switch">
        <button
          className={mode === "login" ? "active" : ""}
          onClick={() => { setMode("login"); setErr(""); }}
          data-testid="auth-mode-login"
        >LOG IN</button>
        <button
          className={mode === "register" ? "active" : ""}
          onClick={() => { setMode("register"); setErr(""); }}
          data-testid="auth-mode-register"
        >SIGN UP</button>
      </div>

      <input
        className="eb-field"
        placeholder="username"
        maxLength={20}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        data-testid="auth-username"
      />
      <input
        className="eb-field"
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        data-testid="auth-password"
      />
      {err && <div className="eb-err" data-testid="auth-err">{err}</div>}
      <button className="eb-btn" onClick={submit} disabled={busy} data-testid="auth-submit">
        {mode === "login" ? <><LogIn size={14} /> LOG IN</> : <><UserPlus size={14} /> CREATE ACCOUNT</>}
      </button>
      <p className="eb-auth-note">
        an account saves your coins, your game skins and your flashcards. 500 coins free when you sign up.
      </p>
    </div>
  );
}

function Account({ onDone }) {
  const { user, logout, claimDaily } = useAuth();
  const [msg, setMsg] = useState("");
  const claim = async () => {
    setMsg("");
    try { const a = await claimDaily(); setMsg(`+${a} coins. see you tomorrow.`); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <div className="eb-auth-form" data-testid="account-panel">
      <div className="eb-acc-name">★ {user.username}</div>
      <div className="eb-acc-coins"><Coins size={18} /> <b data-testid="account-coins">{user.coins}</b> coins</div>
      <button className="eb-btn" onClick={claim} data-testid="claim-daily"><Gift size={14} /> CLAIM DAILY 200</button>
      {msg && <div className="eb-ok" data-testid="daily-msg">{msg}</div>}
      <button className="eb-toggle" onClick={() => { logout(); onDone(); }} data-testid="logout-btn">
        <LogOut size={13} /> LOG OUT
      </button>
    </div>
  );
}

export default function AuthModal({ onClose }) {
  const { user } = useAuth();
  return (
    <div className="eb-modal-back" onClick={onClose} data-testid="auth-modal">
      <div className="eb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eb-header">
          <div className="eb-title">{user ? "YOUR ACCOUNT" : "ACCOUNT"}</div>
          <div className="eb-actions">
            <button className="eb-icon" onClick={onClose} data-testid="auth-close"><X size={16} /></button>
          </div>
        </div>
        <div className="eb-modal-body">
          {user ? <Account onDone={onClose} /> : <AuthForm onDone={onClose} />}
        </div>
      </div>
    </div>
  );
}
