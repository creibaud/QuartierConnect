import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Add01Icon, Message01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    createFileRoute,
    Link,
    redirect,
} from "@tanstack/react-router";
import { ensureAuthenticated } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useConversations,
    useCreateConversation,
    useMessages,
    useSocketMessages,
} from "@workspace/shared/lib/hooks/useMessaging";
import type { Message } from "@workspace/shared/lib/types";
import { Button } from "@workspace/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/messages/")({
    beforeLoad: async () => {
        const user = await ensureAuthenticated();
        if (!user) throw redirect({ to: "/login" });
    },
    component: MessagesPage,
});

function ConversationName(participants: string[], currentUserId: string): string {
    const others = participants.filter((id) => id !== currentUserId);
    if (others.length === 0) return "Moi";
    return `Conversation (${others.length + 1})`;
}

function MessageBubble({
    message,
    isOutgoing,
}: {
    message: Message;
    isOutgoing: boolean;
}) {
    const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div
            className={cn(
                "flex max-w-[75%] flex-col gap-1",
                isOutgoing ? "ml-auto items-end" : "mr-auto items-start",
            )}
        >
            <div
                className={cn(
                    "rounded-2xl px-3 py-2 text-sm",
                    isOutgoing
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                )}
            >
                {message.content ?? ""}
            </div>
            <span className="text-muted-foreground tabular-nums text-xs">{time}</span>
        </div>
    );
}

function ConversationThread({
    conversationId,
    currentUserId,
}: {
    conversationId: string;
    currentUserId: string;
}) {
    const [inputValue, setInputValue] = useState("");
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { data: fetchedMessages, isLoading } = useMessages(conversationId);

    const handleNewMessage = useCallback((msg: Message) => {
        setLocalMessages((prev) => {
            const alreadyPresent = prev.some((m) => m._id === msg._id);
            return alreadyPresent ? prev : [...prev, msg];
        });
    }, []);

    const { sendMessage } = useSocketMessages(conversationId, handleNewMessage);

    const allMessages = useMemo<Message[]>(() => {
        const base = fetchedMessages ?? [];
        const reversed = [...base].reverse();
        const extra = localMessages.filter(
            (lm) => !reversed.some((m) => m._id === lm._id),
        );
        return [...reversed, ...extra];
    }, [fetchedMessages, localMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages.length]);

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text) return;
        sendMessage(text);
        setInputValue("");
    }

    return (
        <div className="flex h-full flex-col">
            <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                        Chargement…
                    </div>
                ) : allMessages.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                        Aucun message — commencez la conversation !
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {allMessages.map((msg) => (
                            <MessageBubble
                                key={msg._id}
                                message={msg}
                                isOutgoing={msg.senderId === currentUserId}
                            />
                        ))}
                        <div ref={bottomRef} />
                    </div>
                )}
            </ScrollArea>

            <form
                onSubmit={handleSend}
                className="border-border flex gap-2 border-t p-3"
            >
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Écrivez un message…"
                    className="flex-1"
                    autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!inputValue.trim()}>
                    <HugeiconsIcon icon={SentIcon} size={16} />
                    <span className="sr-only">Envoyer</span>
                </Button>
            </form>
        </div>
    );
}

function ConversationList({
    activeId,
    onSelect,
    currentUserId,
}: {
    activeId: string | null;
    onSelect: (id: string) => void;
    currentUserId: string;
}) {
    const { data: conversations, isLoading, isError } = useConversations();

    const sorted = useMemo(
        () =>
            [...(conversations ?? [])].sort((a, b) => {
                const aTime = a.lastMessageAt ?? a.createdAt;
                const bTime = b.lastMessageAt ?? b.createdAt;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
            }),
        [conversations],
    );

    if (isLoading) {
        return (
            <div className="text-muted-foreground p-4 text-sm">
                Chargement…
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-destructive p-4 text-sm">
                Erreur de chargement.
            </div>
        );
    }

    if (sorted.length === 0) {
        return (
            <div className="p-4">
                <EmptyState
                    icon={Message01Icon}
                    title="Aucune conversation"
                    description="Vous n'avez pas encore de conversation."
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 p-2">
            {sorted.map((conv) => (
                <button
                    key={conv._id}
                    onClick={() => onSelect(conv._id)}
                    className={cn(
                        "hover:bg-muted w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        activeId === conv._id &&
                            "bg-muted border-primary border-l-2",
                    )}
                >
                    <p className="font-medium">
                        {conv.isGroup && conv.groupName
                            ? conv.groupName
                            : ConversationName(conv.participants, currentUserId)}
                    </p>
                    {conv.lastMessageAt && (
                        <p className="text-muted-foreground tabular-nums text-xs">
                            {new Date(conv.lastMessageAt).toLocaleDateString(
                                "fr-FR",
                            )}
                        </p>
                    )}
                </button>
            ))}
        </div>
    );
}

function NewConversationDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (id: string) => void;
}) {
    const [email, setEmail] = useState("");
    const create = useCreateConversation();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) return;
        try {
            const conv = await create.mutateAsync({
                participantEmails: [trimmed],
            });
            toast.success("Conversation prête");
            setEmail("");
            onOpenChange(false);
            onCreated(conv._id);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Erreur inconnue";
            toast.error(message);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nouvelle conversation</DialogTitle>
                    <DialogDescription>
                        Démarre une discussion avec un voisin via son email.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="conv-email">Email du voisin</Label>
                        <Input
                            id="conv-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="bob@demo.fr"
                            autoComplete="off"
                            autoFocus
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={create.isPending || !email.trim()}
                        >
                            {create.isPending ? "Création…" : "Démarrer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MessagesPage() {
    const user = getCurrentUser();
    const [activeConversationId, setActiveConversationId] = useState<
        string | null
    >(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [newConvOpen, setNewConvOpen] = useState(false);

    if (!user) return null;

    function handleSelectConversation(id: string) {
        setActiveConversationId(id);
        setSheetOpen(false);
    }

    function handleConversationCreated(id: string) {
        setActiveConversationId(id);
    }

    return (
        <div className="bg-background flex h-screen flex-col">
            <header className="border-border flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="md:hidden">
                        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Conversations
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0">
                                <SheetHeader className="border-border border-b px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <SheetTitle>Conversations</SheetTitle>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSheetOpen(false);
                                                setNewConvOpen(true);
                                            }}
                                        >
                                            <HugeiconsIcon
                                                icon={Add01Icon}
                                                size={14}
                                            />
                                        </Button>
                                    </div>
                                </SheetHeader>
                                <ConversationList
                                    activeId={activeConversationId}
                                    onSelect={handleSelectConversation}
                                    currentUserId={user.sub}
                                />
                            </SheetContent>
                        </Sheet>
                    </div>
                    <h1 className="text-lg font-semibold">Messages</h1>
                </div>
                <Link
                    to="/dashboard"
                    className="text-foreground/70 text-sm hover:text-foreground hover:underline transition-colors"
                >
                    ← Tableau de bord
                </Link>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="border-border hidden w-80 flex-col border-r md:flex">
                    <div className="border-border flex items-center justify-between border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">Conversations</h2>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNewConvOpen(true)}
                        >
                            <HugeiconsIcon icon={Add01Icon} size={14} />
                            Nouvelle
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <ConversationList
                            activeId={activeConversationId}
                            onSelect={setActiveConversationId}
                            currentUserId={user.sub}
                        />
                    </ScrollArea>
                </aside>

                <main className="flex flex-1 flex-col overflow-hidden">
                    {activeConversationId ? (
                        <ConversationThread
                            conversationId={activeConversationId}
                            currentUserId={user.sub}
                        />
                    ) : (
                        <div className="flex flex-1 items-center justify-center">
                            <EmptyState
                                icon={Message01Icon}
                                title="Aucune conversation sélectionnée"
                                description="Choisissez une conversation dans la liste ou démarrez-en une nouvelle."
                                action={
                                    <Button
                                        size="sm"
                                        onClick={() => setNewConvOpen(true)}
                                    >
                                        <HugeiconsIcon
                                            icon={Add01Icon}
                                            size={14}
                                        />
                                        Nouvelle conversation
                                    </Button>
                                }
                            />
                        </div>
                    )}
                </main>
            </div>

            <NewConversationDialog
                open={newConvOpen}
                onOpenChange={setNewConvOpen}
                onCreated={handleConversationCreated}
            />
        </div>
    );
}
