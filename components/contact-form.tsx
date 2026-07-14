"use client";

import { FC, useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { IoPersonCircleOutline, IoSend } from "react-icons/io5";

type ChatMessage = {
  id: string;
  role: string;
  body: string;
  createdAt: string;
};

type ChatSession = {
  conversationId: string;
  sessionToken: string;
};

type ConversationInfo = {
  id: string;
  guestName: string;
  guestEmail: string;
  status: string;
};

const STORAGE_KEY = "bookhotel_chat_session";
const POLL_MS = 2500;

function loadSession(): ChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatSession;
    if (parsed.conversationId && parsed.sessionToken) return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

function saveSession(session: ChatSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const ContactForm: FC = () => {
  const [phase, setPhase] = useState<"loading" | "setup" | "chat">("loading");
  const [session, setSession] = useState<ChatSession | null>(null);
  const [conversation, setConversation] = useState<ConversationInfo | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchedRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const merged = [...prev];
      for (const msg of incoming) {
        if (!known.has(msg.id)) merged.push(msg);
      }
      merged.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      return merged;
    });
    lastFetchedRef.current = incoming[incoming.length - 1]?.createdAt ?? null;
  }, []);

  const fetchMessages = useCallback(
    async (chatSession: ChatSession, initial = false) => {
      const params = new URLSearchParams();
      if (!initial && lastFetchedRef.current) {
        params.set("after", lastFetchedRef.current);
      }

      const res = await fetch(
        `/api/chat/conversations/${chatSession.conversationId}/messages?${params}`,
        {
          headers: { "X-Chat-Token": chatSession.sessionToken },
          cache: "no-store",
        },
      );

      if (res.status === 404) {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
        setPhase("setup");
        return;
      }

      if (!res.ok) return;

      const data = (await res.json()) as {
        conversation: ConversationInfo;
        messages: ChatMessage[];
      };

      setConversation(data.conversation);

      if (initial) {
        setMessages(data.messages);
        if (data.messages.length > 0) {
          lastFetchedRef.current =
            data.messages[data.messages.length - 1].createdAt;
        }
      } else {
        mergeMessages(data.messages);
      }
    },
    [mergeMessages],
  );

  useEffect(() => {
    const stored = loadSession();
    if (!stored) {
      setPhase("setup");
      return;
    }

    setSession(stored);
    fetchMessages(stored, true)
      .then(() => setPhase("chat"))
      .catch(() => setPhase("setup"));
  }, [fetchMessages]);

  useEffect(() => {
    if (phase !== "chat" || !session) return;

    const interval = setInterval(() => {
      fetchMessages(session, false).catch(() => undefined);
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [phase, session, fetchMessages]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setStarting(true);

    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: setupName.trim(), email: setupEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const fieldErrors = data.error as Record<string, string[] | undefined>;
        const msg = Object.values(fieldErrors ?? {})
          .flat()
          .filter(Boolean)
          .join(" ");
        setSetupError(msg || "Failed to start chat");
        return;
      }

      const chatSession: ChatSession = {
        conversationId: data.conversationId,
        sessionToken: data.sessionToken,
      };

      saveSession(chatSession);
      setSession(chatSession);
      setMessages(data.messages ?? []);
      if (data.messages?.length) {
        lastFetchedRef.current = data.messages[data.messages.length - 1].createdAt;
      }
      setPhase("chat");
    } catch {
      setSetupError("Network error. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async () => {
    if (!session || !input.trim() || sending) return;
    if (conversation?.status === "closed") return;

    const body = input.trim();
    if (body.length > 1000) {
      setInputError("Message must be less than 1000 characters");
      return;
    }

    setInputError(null);
    setSending(true);
    setInput("");

    try {
      const res = await fetch(
        `/api/chat/conversations/${session.conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Chat-Token": session.sessionToken,
          },
          body: JSON.stringify({ body }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        const fieldErrors = data.error as Record<string, string[] | undefined>;
        const msg =
          data.error && typeof data.error === "string"
            ? data.error
            : Object.values(fieldErrors ?? {})
                .flat()
                .filter(Boolean)
                .join(" ");
        setInputError(msg || "Failed to send message");
        setInput(body);
        return;
      }

      mergeMessages([data.message]);
    } catch {
      setInputError("Network error. Please try again.");
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setConversation(null);
    setMessages([]);
    lastFetchedRef.current = null;
    setPhase("setup");
  };

  const isClosed = conversation?.status === "closed";

  return (
    <div className="bg-white rounded-sm shadow-sm flex flex-col h-[560px] overflow-hidden border border-gray-100">
      <div className="flex items-center gap-3 px-5 py-4 bg-orange-400 text-white">
        <IoPersonCircleOutline className="size-10 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-tight">BookHotel Support</h3>
          <p className="text-sm text-orange-50 flex items-center gap-1.5">
            <span
              className={clsx("size-2 rounded-full inline-block", {
                "bg-green-300": !isClosed,
                "bg-gray-300": isClosed,
              })}
            />
            {isClosed
              ? "Obrolan ditutup"
              : "Live chat — admin membalas secara langsung"}
          </p>
        </div>
        {phase === "chat" ? (
          <button
            type="button"
            onClick={handleNewChat}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg shrink-0"
          >
            New chat
          </button>
        ) : null}
      </div>

      {phase === "loading" ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading chat...
        </div>
      ) : phase === "setup" ? (
        <form
          onSubmit={handleStartChat}
          className="flex-1 flex flex-col justify-center px-6 py-8 bg-gray-50"
        >
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            Start a live chat
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            Enter your details to connect with our support team.
          </p>
          {setupError ? (
            <p className="text-sm text-red-500 mb-3">{setupError}</p>
          ) : null}
          <input
            type="text"
            value={setupName}
            onChange={(e) => setSetupName(e.target.value)}
            placeholder="Your name"
            required
            minLength={2}
            className="bg-white p-3 border border-gray-200 rounded-sm w-full font-light mb-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <input
            type="email"
            value={setupEmail}
            onChange={(e) => setSetupEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="bg-white p-3 border border-gray-200 rounded-sm w-full font-light mb-4 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <button
            type="submit"
            disabled={starting}
            className={clsx(
              "py-3 font-semibold text-white bg-orange-400 rounded-sm hover:bg-orange-500",
              { "opacity-50 cursor-not-allowed": starting },
            )}
          >
            {starting ? "Connecting..." : "Start Chat"}
          </button>
        </form>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gray-50">
            {messages.map((msg) => {
              const isGuest = msg.role === "guest";
              const isSystem = msg.role === "system";

              return (
                <div
                  key={msg.id}
                  className={clsx("flex", {
                    "justify-end": isGuest,
                    "justify-start": !isGuest,
                  })}
                >
                  <div
                    className={clsx("max-w-[80%] shadow-sm", {
                      "px-4 py-2.5 rounded-2xl text-sm leading-relaxed": true,
                      "bg-orange-400 text-white rounded-br-sm": isGuest,
                      "bg-white text-gray-800 border border-gray-200 rounded-bl-sm":
                        msg.role === "admin",
                      "bg-orange-50 text-gray-700 border border-orange-100 rounded-xl text-xs px-3 py-2 text-center":
                        isSystem,
                    })}
                  >
                    {!isGuest && !isSystem ? (
                      <p className="text-[10px] font-semibold text-orange-500 mb-0.5">
                        Support
                      </p>
                    ) : null}
                    <p>{msg.body}</p>
                    {!isSystem ? (
                      <p
                        className={clsx("text-[10px] mt-1", {
                          "text-orange-100": isGuest,
                          "text-gray-400": !isGuest,
                        })}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            {inputError ? (
              <p className="text-xs text-red-500 mb-2">{inputError}</p>
            ) : null}

            {isClosed ? (
              <p className="text-center text-sm text-gray-500 py-2">
                Obrolan ini telah ditutup oleh admin. Klik &quot;New chat&quot;
                jika masih butuh bantuan.
              </p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 resize-none bg-gray-100 px-4 py-3 rounded-2xl text-sm font-light focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className={clsx(
                    "shrink-0 size-11 flex items-center justify-center rounded-full bg-orange-400 text-white hover:bg-orange-500 transition-colors",
                    {
                      "opacity-50 cursor-not-allowed":
                        sending || !input.trim(),
                    },
                  )}
                  aria-label="Send message"
                >
                  <IoSend className="size-5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ContactForm;
