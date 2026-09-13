import { useEffect, useState } from "react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Footer() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    const hit = sessionStorage.getItem("eb_hit");
    const endpoint = hit ? `${API}/visits/count` : `${API}/visits/hit`;
    const opts = hit ? {} : { method: "POST" };
    fetch(endpoint, opts)
      .then((r) => r.json())
      .then((d) => { setCount(d.count); sessionStorage.setItem("eb_hit", "1"); })
      .catch(() => setCount(0));
  }, []);

  const digits = String(count ?? 0).padStart(6, "0").split("");

  return (
    <footer className="eb-footer" data-testid="footer">
      <div className="eb-counter" data-testid="visitor-counter">
        <span className="eb-counter-label">VISITORS</span>
        <span className="eb-counter-digits">
          {digits.map((d, i) => <span key={i} className="eb-digit">{d}</span>)}
        </span>
      </div>
      <div className="eb-footer-mid">made with ★ &amp; 3am energy</div>
      <div className="eb-footer-right">© {new Date().getFullYear()} edwardlongiscool.com</div>
    </footer>
  );
}
