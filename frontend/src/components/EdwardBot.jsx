import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, X, Trash2, Copy, Check, Sparkles } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function getSessionId() {
  let sid = localStorage.getItem("edwardbot_session");
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("edwardbot_session", sid);
  }
  return sid;
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      data-testid="ai-copy-btn"
      className="eb-copy"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
};

export default function EdwardBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef(getSessionId());
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/ai/history/${sessionId.current}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setMessages(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const nowUser = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((m) => [...m, nowUser, { role: "assistant", content: "", timestamp: "" }]);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId.current, message: text }),
      });

      if (res.status === 429) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "⚠️ Whoa, slow down! You've hit the rate limit. Sign in later for more. Try again in a bit.",
            timestamp: new Date().toISOString(),
          };
          return copy;
        });
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc, timestamp: "" };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Connection glitched. Try again!",
          timestamp: new Date().toISOString(),
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const clearChat = async () => {
    await fetch(`${API}/ai/history/${sessionId.current}`, { method: "DELETE" }).catch(() => {});
    setMessages([]);
  };

  return (
    <>
      {!open && (
        <button
          data-testid="ai-open-btn"
          className="eb-fab"
          onClick={() => setOpen(true)}
          aria-label="Open Edward-bot"
        >
          <Bot size={26} />
          <span className="eb-fab-spark"><Sparkles size={14} /></span>
        </button>
      )}

      {open && (
        <div className="eb-window" data-testid="ai-chat-window">
          <div className="eb-header">
            <div className="eb-title">
              <Bot size={18} />
              <span>EDWARD-BOT</span>
              <span className="eb-badge">v3</span>
            </div>
            <div className="eb-actions">
              <button data-testid="ai-clear-btn" className="eb-icon" onClick={clearChat} title="Clear chat">
                <Trash2 size={16} />
              </button>
              <button data-testid="ai-close-btn" className="eb-icon" onClick={() => setOpen(false)} title="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="eb-scroll" ref={scrollRef} data-testid="ai-messages">
            {messages.length === 0 && (
              <div className="eb-empty">
                <Sparkles size={18} />
                <p>yo. i'm edward-bot. ask me anything — or ask about edward.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`eb-msg eb-${m.role}`} data-testid={`ai-msg-${m.role}`}>
                <div className="eb-msg-role">{m.role === "user" ? "YOU" : "EDWARD-BOT"}</div>
                <div className="eb-bubble">
                  {m.role === "assistant" ? (
                    <>
                      <div className="eb-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content || (busy && i === messages.length - 1 ? "…" : "")}
                        </ReactMarkdown>
                      </div>
                      {m.content && !busy && <CopyButton text={m.content} />}
                    </>
                  ) : (
                    <span>{m.content}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="eb-input-row">
            <input
              ref={inputRef}
              data-testid="ai-input"
              className="eb-input"
              value={input}
              placeholder="type a message..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={busy}
            />
            <button data-testid="ai-send-btn" className="eb-send" onClick={send} disabled={busy}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
