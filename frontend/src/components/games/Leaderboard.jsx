import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { getScores } from "@/lib/api";

export default function Leaderboard({ game, refreshKey = 0, title = "TOP 10" }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    getScores(game).then((d) => Array.isArray(d) && setRows(d)).catch(() => {});
  }, [game, refreshKey]);

  return (
    <aside className="eb-leaderboard" data-testid={`leaderboard-${game}`}>
      <h3><Trophy size={18} /> {title}</h3>
      {rows.length === 0 && <div className="eb-muted">no scores yet. be the first ✦</div>}
      <ol>
        {rows.map((b, i) => (
          <li key={`${b.handle}-${b.timestamp}`} data-testid="lb-row">
            <span className="eb-lb-rank">{String(i + 1).padStart(2, "0")}</span>
            <span className="eb-lb-handle">{b.handle}</span>
            <span className="eb-lb-score">{b.score}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
