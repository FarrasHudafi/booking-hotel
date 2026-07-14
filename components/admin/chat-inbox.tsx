"use client";

import { FC, useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { IoSend } from "react-icons/io5";

type ChatMessage = {
  id: string;
  role: string;
  body: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  guestName: string;
  guestEmail: string;
  status: string;
  lastMessageAt: string;
  lastMessage?: ChatMessage | null;
};

type InboxFilter = "open" | "closed" | "all";

const POLL_LIST_MS = 4000;
const POLL_MSG_MS = 2500;

const FILTER_OPTIONS: { value: InboxFilter; label: string }[] = [
  { value: "open", label: "Aktif" },
  { value: "closed", label: "Ditutup" },
  { value: "all", label: "Semua" },
];

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "short" }).format(
    new Date(iso),
  );
}

const ChatInbox: FC = () => {
  const [filter, setFilter] = useState<InboxFilter>("open");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationStatus, setConversationStatus] = useState<string>("open");
  const [guestInfo, setGuestInfo] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchedRef = useRef<string | null>(null);

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);

    const [listRes, openRes] = await Promise.all([
      fetch(`/api/chat/conversations?${params}`, { cache: "no-store" }),
      fetch("/api/chat/conversations?status=open", { cache: "no-store" }),
    ]);

    if (listRes.ok) {
      const data = (await listRes.json()) as { conversations: Conversation[] };
      setConversations(data.conversations);
      setLoadingList(false);

      if (selectedIdRef.current) {
        const selected = data.conversations.find(
          (c) => c.id === selectedIdRef.current,
        );
        if (selected) {
          setConversationStatus(selected.status);
        } else if (filter !== "all") {
          setSelectedId(null);
        }
      } else if (data.conversations.length > 0) {
        setSelectedId(data.conversations[0].id);
      }
    }

    if (openRes.ok) {
      const openData = (await openRes.json()) as {
        conversations: Conversation[];
      };
      setOpenCount(openData.conversations.length);
    }
  }, [filter]);

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
    async (conversationId: string, initial = false) => {
      const params = new URLSearchParams();
      if (!initial && lastFetchedRef.current) {
        params.set("after", lastFetchedRef.current);
      }

      const res = await fetch(
        `/api/chat/conversations/${conversationId}/messages?${params}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        conversation: {
          guestName: string;
          guestEmail: string;
          status: string;
        };
        messages: ChatMessage[];
      };

      setGuestInfo({
        name: data.conversation.guestName,
        email: data.conversation.guestEmail,
      });
      setConversationStatus(data.conversation.status);

      if (initial) {
        setMessages(data.messages);
        lastFetchedRef.current =
          data.messages.length > 0
            ? data.messages[data.messages.length - 1].createdAt
            : null;
      } else {
        mergeMessages(data.messages);
      }
    },
    [mergeMessages],
  );

  useEffect(() => {
    setLoadingList(true);
    fetchConversations().catch(() => setLoadingList(false));
    const interval = setInterval(() => {
      fetchConversations().catch(() => undefined);
    }, POLL_LIST_MS);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) return;

    lastFetchedRef.current = null;
    setMessages([]);
    fetchMessages(selectedId, true).catch(() => undefined);

    const interval = setInterval(() => {
      fetchMessages(selectedId, false).catch(() => undefined);
    }, POLL_MSG_MS);

    return () => clearInterval(interval);
  }, [selectedId, fetchMessages]);

  const updateConversationStatus = async (status: "closed" | "open") => {
    if (!selectedId) return false;

    const res = await fetch(`/api/chat/conversations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) return false;

    setConversationStatus(status);
    await fetchMessages(selectedId, true);
    await fetchConversations();
    return true;
  };

  const handleClose = async () => {
    if (!selectedId || closing) return;
    setClosing(true);
    setShowCloseConfirm(false);

    try {
      const ok = await updateConversationStatus("closed");
      if (ok) {
        setStatusNotice("Obrolan berhasil ditutup.");
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } finally {
      setClosing(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedId || reopening) return;
    setReopening(true);

    try {
      const ok = await updateConversationStatus("open");
      if (ok) {
        setStatusNotice("Obrolan dibuka kembali.");
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } finally {
      setReopening(false);
    }
  };

  const handleSend = async () => {
    if (!selectedId || !input.trim() || sending) return;
    if (conversationStatus === "closed") return;

    const body = input.trim();
    setInputError(null);
    setSending(true);
    setInput("");

    try {
      const res = await fetch(
        `/api/chat/conversations/${selectedId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setInputError(
          typeof data.error === "string" ? data.error : "Gagal mengirim pesan",
        );
        setInput(body);
        return;
      }

      mergeMessages([data.message]);
      fetchConversations().catch(() => undefined);
    } catch {
      setInputError("Koneksi gagal");
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  const selected = conversations.find((c) => c.id === selectedId);
  const isClosed = conversationStatus === "closed";

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-0 bg-white rounded-sm shadow-sm border border-gray-100 overflow-hidden h-[640px]">
      <div className="border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="px-4 py-4 border-b border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-900">Kotak Masuk</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {openCount} obrolan aktif
          </p>
          <div className="flex gap-1 mt-3">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={clsx(
                  "flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors",
                  filter === opt.value
                    ? "bg-orange-400 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="text-sm text-gray-400 p-4">Memuat...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">
              {filter === "open"
                ? "Tidak ada obrolan aktif"
                : filter === "closed"
                  ? "Belum ada obrolan ditutup"
                  : "Belum ada obrolan"}
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={clsx(
                  "w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-white transition-colors",
                  selectedId === c.id &&
                    "bg-white border-l-4 border-l-orange-400",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {c.guestName}
                  </span>
                  <span
                    className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                      c.status === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {c.status === "open" ? "aktif" : "ditutup"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {c.guestEmail}
                </p>
                {c.lastMessage ? (
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {c.lastMessage.body}
                  </p>
                ) : null}
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatRelative(c.lastMessageAt)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col min-w-0">
        {selectedId && selected ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {guestInfo?.name ?? selected.guestName}
                  </h3>
                  <span
                    className={clsx(
                      "text-[10px] px-2 py-0.5 rounded-full shrink-0",
                      isClosed
                        ? "bg-gray-200 text-gray-600"
                        : "bg-green-100 text-green-700",
                    )}
                  >
                    {isClosed ? "Ditutup" : "Aktif"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {guestInfo?.email ?? selected.guestEmail}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isClosed ? (
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(true)}
                    disabled={closing}
                    className="text-xs px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium disabled:opacity-50"
                  >
                    Tutup Obrolan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReopen}
                    disabled={reopening}
                    className="text-xs px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium disabled:opacity-50"
                  >
                    {reopening ? "Membuka..." : "Buka Kembali"}
                  </button>
                )}
              </div>
            </div>

            {statusNotice ? (
              <div className="px-5 py-2 bg-green-50 text-green-700 text-xs border-b border-green-100">
                {statusNotice}
              </div>
            ) : null}

            {showCloseConfirm ? (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-amber-900">
                  Tutup obrolan ini? Tamu tidak bisa kirim pesan lagi.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(false)}
                    className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={closing}
                    className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    {closing ? "Menutup..." : "Ya, Tutup"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gray-50">
              {messages.map((msg) => {
                const isAdmin = msg.role === "admin";
                const isGuest = msg.role === "guest";
                const isSystem = msg.role === "system";

                return (
                  <div
                    key={msg.id}
                    className={clsx("flex", {
                      "justify-end": isAdmin,
                      "justify-start": !isAdmin,
                    })}
                  >
                    <div
                      className={clsx("max-w-[75%] shadow-sm text-sm", {
                        "px-4 py-2.5 rounded-2xl leading-relaxed": !isSystem,
                        "bg-orange-400 text-white rounded-br-sm": isAdmin,
                        "bg-white text-gray-800 border border-gray-200 rounded-bl-sm":
                          isGuest,
                        "bg-orange-50 text-gray-600 border border-orange-100 rounded-xl text-xs px-3 py-2 text-center mx-auto":
                          isSystem,
                      })}
                    >
                      {isGuest ? (
                        <p className="text-[10px] font-semibold text-gray-400 mb-0.5">
                          Tamu
                        </p>
                      ) : null}
                      {isAdmin ? (
                        <p className="text-[10px] font-semibold text-orange-100 mb-0.5">
                          Anda
                        </p>
                      ) : null}
                      <p>{msg.body}</p>
                      {!isSystem ? (
                        <p
                          className={clsx("text-[10px] mt-1", {
                            "text-orange-100": isAdmin,
                            "text-gray-400": isGuest,
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
                  Obrolan ditutup. Klik &quot;Buka Kembali&quot; jika perlu lanjut
                  chat.
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
                    placeholder="Balas tamu..."
                    disabled={sending}
                    className="flex-1 resize-none bg-gray-100 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className={clsx(
                      "shrink-0 size-11 flex items-center justify-center rounded-full bg-orange-400 text-white hover:bg-orange-500",
                      {
                        "opacity-50 cursor-not-allowed":
                          sending || !input.trim(),
                      },
                    )}
                    aria-label="Kirim balasan"
                  >
                    <IoSend className="size-5" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Pilih obrolan untuk membalas
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;
