import { useState } from "react";
import { Coins, Gift, LogIn, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { swatchCss } from "@/lib/skins";

const SLOT_LABELS = {
  site: "WHOLE-SITE THEMES",
  bg: "SITE BACKGROUNDS",
  bird: "FLAPPY BIRD SKINS",
  table: "ROULETTE TABLES",
  snake: "SNAKE SKINS",
  paddle: "PONG PADDLES",
};
const SLOT_ORDER = ["site", "bg", "bird", "snake", "paddle", "table"];

export default function Shop({ onLogin }) {
  const { user, setUser, items, claimDaily } = useAuth();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const slots = [...new Set(items.map((i) => i.slot))]
    .sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
  const owned = (item) => item.price === 0 || (user?.inventory || []).includes(item.id);
  const equipped = (item) => user?.equipped?.[item.slot] === item.id;

  const act = async (path, item_id, okMsg) => {
    setErr(""); setMsg("");
    try {
      const u = await api(path, { method: "POST", body: { item_id } });
      setUser(u);
      setMsg(okMsg);
    } catch (e) { setErr(e.message); }
  };

  const daily = async () => {
    setErr(""); setMsg("");
    try { const a = await claimDaily(); setMsg(`+${a} coins`); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="eb-shop" data-testid="game-shop">
      <div className="eb-shop-bar">
        {user ? (
          <>
            <span className="eb-acc-coins"><Coins size={18} /> <b data-testid="shop-coins">{user.coins}</b> coins</span>
            <button className="eb-btn" onClick={daily} data-testid="shop-daily"><Gift size={14} /> DAILY 200</button>
          </>
        ) : (
          <>
            <span className="eb-muted">log in to buy skins — coins and unlocks save to your account.</span>
            <button className="eb-btn" onClick={onLogin} data-testid="shop-login"><LogIn size={14} /> LOG IN</button>
          </>
        )}
        {msg && <span className="eb-ok" data-testid="shop-msg">{msg}</span>}
        {err && <span className="eb-err" data-testid="shop-err">{err}</span>}
      </div>

      {slots.map((slot) => (
        <div key={slot} className="eb-shop-group">
          <h3 className="eb-shop-head">{SLOT_LABELS[slot] || slot.toUpperCase()}</h3>
          <div className="eb-shop-grid">
            {items.filter((i) => i.slot === slot).map((item) => (
              <div key={item.id} className={`eb-shop-card ${equipped(item) ? "on" : ""}`} data-testid={`shop-item-${item.id}`}>
                <span className="eb-shop-swatch" style={swatchCss(item)} />
                <div className="eb-shop-name">{item.name}</div>
                <div className="eb-shop-price">{item.price === 0 ? "free" : `${item.price} coins`}</div>
                {!user ? (
                  <span className="eb-muted">log in</span>
                ) : equipped(item) ? (
                  <span className="eb-ok"><Check size={13} /> equipped</span>
                ) : owned(item) ? (
                  <button className="eb-toggle" onClick={() => act("/shop/equip", item.id, `${item.name} equipped`)} data-testid={`equip-${item.id}`}>EQUIP</button>
                ) : (
                  <button className="eb-btn" onClick={() => act("/shop/buy", item.id, `bought ${item.name}`)} data-testid={`buy-${item.id}`}>BUY</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
