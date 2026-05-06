import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { getGroup, listChatMessages, sendChatMessage, listUsers } from "@/lib/api";
import { ChatMessage, FriendGroup, User } from "@/lib/types";
import { Input } from "@/components/ui/input";

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [group, setGroup] = useState<FriendGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [body, setBody] = useState("");

  const refresh = async () => {
    if (!groupId) return;
    const [g, msgs, us] = await Promise.all([
      getGroup(groupId),
      listChatMessages(groupId),
      listUsers(),
    ]);
    if (!g) { navigate("/groups"); return; }
    setGroup(g);
    setMessages(msgs);
    setUsers(us);
  };

  useEffect(() => { refresh(); }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const userById = (id: string) => users.find((u) => u.id === id);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupId || !body.trim()) return;
    await sendChatMessage(groupId, body.trim());
    setBody("");
    const msgs = await listChatMessages(groupId);
    setMessages(msgs);
  };

  if (!group) return null;

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {group.emoji} {group.name}
          </h1>
          <p className="text-xs text-muted-foreground">Group chat</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((m) => {
          const author = userById(m.authorId);
          const isMe = m.authorId === "u_me";
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              {!isMe && (
                <span className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                  {author?.name ?? "Unknown"}
                </span>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}
              >
                {m.body}
              </div>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {formatTime(m.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border bg-background px-4 py-3"
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
