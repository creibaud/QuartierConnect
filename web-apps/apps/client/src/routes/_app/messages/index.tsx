import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Add01Icon,
    Attachment01Icon,
    Download01Icon,
    Message01Icon,
    SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { apiBlob, apiBlobUrl } from "@workspace/shared/lib/api";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useConversations,
    useCreateConversation,
    useMessages,
    useSendFileMessage,
    useSocketMessages,
} from "@workspace/shared/lib/hooks/useMessaging";
import type { Conversation, Message } from "@workspace/shared/lib/types";
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
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@workspace/ui/components/input-group";
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
import type { TFunction } from "i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/messages/")({
    component: MessagesPage,
});

function conversationLabel(
    conv: Conversation,
    currentUserId: string,
    t: TFunction,
): string {
    if (conv.isGroup) {
        return conv.groupName ?? t("pages.messages.group");
    }
    const others = (conv.participantsInfo ?? [])
        .filter((p) => p.id !== currentUserId && p.email)
        .map((p) => p.email as string);
    if (others.length === 0) return t("pages.messages.conversation");
    if (others.length <= 2) return others.join(", ");
    return `${others[0]} +${others.length - 1}`;
}

function AuthedImage({ fileId, alt }: { fileId: string; alt: string }) {
    const { t } = useTranslation();
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;
        apiBlobUrl(`/messaging/files/${fileId}`)
            .then((created) => {
                if (cancelled) {
                    URL.revokeObjectURL(created);
                    return;
                }
                objectUrl = created;
                setUrl(created);
            })
            .catch(() => {
                // image failed to load — leave placeholder
            });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [fileId]);

    if (!url) {
        return (
            <div className="text-muted-foreground py-6 text-center text-xs">
                {t("common.loading")}
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={alt}
            className="max-h-64 max-w-full rounded-lg object-cover"
        />
    );
}

function FileAttachment({ message }: { message: Message }) {
    const { t } = useTranslation();
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        if (!message.fileId) return;
        setDownloading(true);
        try {
            const blob = await apiBlob(`/messaging/files/${message.fileId}`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = message.fileName ?? "file";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error(t("messaging.uploadError"));
        } finally {
            setDownloading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 text-sm underline underline-offset-2"
        >
            <HugeiconsIcon icon={Download01Icon} size={16} />
            <span>
                {downloading
                    ? t("messaging.sending")
                    : (message.fileName ?? t("messaging.download"))}
            </span>
        </button>
    );
}

function MessageBubble({
    message,
    isOutgoing,
}: {
    message: Message;
    isOutgoing: boolean;
}) {
    const { t } = useTranslation();
    const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const isImage = message.type === "image" && !!message.fileId;
    const isFile = message.type === "file" && !!message.fileId;

    return (
        <div
            className={cn(
                "flex max-w-[75%] flex-col gap-1",
                isOutgoing ? "ml-auto items-end" : "mr-auto items-start",
            )}
        >
            <div
                className={cn(
                    "px-3.5 py-2 text-sm leading-relaxed",
                    isOutgoing
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                        : "bg-muted text-foreground rounded-2xl rounded-bl-md",
                )}
            >
                {isImage ? (
                    <AuthedImage
                        fileId={message.fileId!}
                        alt={message.fileName ?? t("messaging.imageAlt")}
                    />
                ) : isFile ? (
                    <FileAttachment message={message} />
                ) : (
                    (message.content ?? "")
                )}
            </div>
            <span className="text-muted-foreground px-1 text-xs tabular-nums">
                {time}
            </span>
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
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState("");
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: fetchedMessages, isLoading } = useMessages(conversationId);
    const sendFile = useSendFileMessage(conversationId);

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

    function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        sendFile.mutate(file, {
            onError: () => toast.error(t("messaging.uploadError")),
        });
        e.target.value = "";
    }

    return (
        <div className="flex h-full flex-col">
            <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                        {t("common.loading")}
                    </div>
                ) : allMessages.length === 0 ? (
                    <div className="text-muted-foreground py-8 text-center text-sm">
                        {t("pages.messages.noMessages")}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
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

            <form onSubmit={handleSend} className="border-border border-t p-4">
                <InputGroup>
                    <InputGroupInput
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={t("messaging.typePlaceholder")}
                        autoComplete="off"
                    />
                    <InputGroupAddon align="inline-start">
                        <InputGroupButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={sendFile.isPending}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <HugeiconsIcon icon={Attachment01Icon} />
                            <span className="sr-only">
                                {t("messaging.attachFile")}
                            </span>
                        </InputGroupButton>
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            type="submit"
                            variant="default"
                            size="icon-sm"
                            disabled={!inputValue.trim()}
                        >
                            <HugeiconsIcon icon={SentIcon} />
                            <span className="sr-only">
                                {t("pages.messages.send")}
                            </span>
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFilePick}
                />
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
    const { t } = useTranslation();
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
                {t("common.loading")}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="text-destructive p-4 text-sm">
                {t("pages.messages.loadError")}
            </div>
        );
    }

    if (sorted.length === 0) {
        return (
            <div className="p-4">
                <EmptyState
                    icon={Message01Icon}
                    title={t("pages.messages.noConversations")}
                    description={t("pages.messages.noConversationsDescription")}
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
                        "hover:bg-muted flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        activeId === conv._id &&
                            "bg-primary/10 text-primary-foreground",
                    )}
                >
                    <p
                        className={cn(
                            "font-medium",
                            activeId === conv._id && "text-foreground",
                        )}
                    >
                        {conversationLabel(conv, currentUserId, t)}
                    </p>
                    {conv.lastMessageAt && (
                        <p className="text-muted-foreground text-xs tabular-nums">
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
    const { t } = useTranslation();
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
            toast.success(t("pages.messages.conversationReady"));
            setEmail("");
            onOpenChange(false);
            onCreated(conv._id);
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : t("pages.messages.unknownError");
            toast.error(message);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("messaging.newConversation")}</DialogTitle>
                    <DialogDescription>
                        {t("pages.messages.newConversationDescription")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="conv-email">
                            {t("pages.messages.neighborEmail")}
                        </Label>
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
                            {t("common.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={create.isPending || !email.trim()}
                        >
                            {create.isPending
                                ? t("common.creating")
                                : t("pages.messages.start")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function MessagesPage() {
    const { t } = useTranslation();
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
        <div className="bg-background flex min-h-0 flex-1 flex-col">
            <header className="border-border flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="md:hidden">
                        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm">
                                    {t("pages.messages.conversations")}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0">
                                <SheetHeader className="border-border border-b px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <SheetTitle>
                                            {t("pages.messages.conversations")}
                                        </SheetTitle>
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
                    <h1 className="text-lg font-semibold">
                        {t("pages.messages.title")}
                    </h1>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="border-border hidden w-80 flex-col border-r md:flex">
                    <div className="border-border flex items-center justify-between border-b px-4 py-3">
                        <h2 className="text-sm font-semibold">
                            {t("pages.messages.conversations")}
                        </h2>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNewConvOpen(true)}
                        >
                            <HugeiconsIcon icon={Add01Icon} size={14} />
                            {t("pages.messages.new")}
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
                                title={t("pages.messages.noneSelectedTitle")}
                                description={t(
                                    "pages.messages.noneSelectedDescription",
                                )}
                                action={
                                    <Button
                                        size="sm"
                                        onClick={() => setNewConvOpen(true)}
                                    >
                                        <HugeiconsIcon
                                            icon={Add01Icon}
                                            size={14}
                                        />
                                        {t("messaging.newConversation")}
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
