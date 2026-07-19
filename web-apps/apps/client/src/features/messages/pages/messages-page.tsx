import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Add01Icon, Message01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentUser } from "@workspace/shared/lib/auth";
import {
    useConversations,
    useMarkConversationRead,
} from "@workspace/shared/lib/hooks/useMessaging";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@workspace/ui/components/sheet";
import { PresenceBadge } from "@/features/realtime/presence-badge";
import {
    useRealtime,
    useTypingUserIds,
} from "@/features/realtime/realtime-context";
import { ConversationList } from "../components/conversation-list";
import { ConversationThread } from "../components/conversation-thread";
import { NewConversationDialog } from "../components/new-conversation-dialog";
import {
    conversationInitials,
    conversationLabel,
    otherParticipantIds,
} from "../lib/conversation";

export function MessagesPage({ conversation }: { conversation?: string }) {
    const { t } = useTranslation();
    const user = getCurrentUser();
    const [activeConversationId, setActiveConversationId] = useState<
        string | null
    >(conversation ?? null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [newConvOpen, setNewConvOpen] = useState(false);
    const { data: conversations } = useConversations();
    const markConversationRead = useMarkConversationRead();
    const { onlineUserIds } = useRealtime();
    const activeTypingUserIds = useTypingUserIds(activeConversationId);

    if (!user) return null;

    const activeConversation = (conversations ?? []).find(
        (conv) => conv._id === activeConversationId,
    );
    const activeLabel = activeConversation
        ? conversationLabel(activeConversation, user.sub, t)
        : t("pages.messages.conversation");
    const isActiveOtherOnline = activeConversation
        ? otherParticipantIds(activeConversation, user.sub).some((id) =>
              onlineUserIds.has(id),
          )
        : false;
    const isActiveOtherTyping = activeTypingUserIds.some(
        (id) => id !== user.sub,
    );

    function handleSelectConversation(id: string) {
        setActiveConversationId(id);
        setSheetOpen(false);
    }

    function handleConversationCreated(id: string) {
        setActiveConversationId(id);
    }

    return (
        <div className="flex h-[calc(100svh-4rem)] flex-col p-6 md:p-8">
            <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
                <PageHeader
                    title={t("pages.messages.title")}
                    description={t("pages.messages.description")}
                    actions={
                        <>
                            <div className="md:hidden">
                                <Sheet
                                    open={sheetOpen}
                                    onOpenChange={setSheetOpen}
                                >
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            {t("pages.messages.conversations")}
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent
                                        side="left"
                                        className="flex w-72 flex-col p-0"
                                    >
                                        <SheetHeader className="border-border border-b px-4 py-3">
                                            <SheetTitle>
                                                {t(
                                                    "pages.messages.conversations",
                                                )}
                                            </SheetTitle>
                                            <SheetDescription className="sr-only">
                                                {t("pages.messages.description")}
                                            </SheetDescription>
                                        </SheetHeader>
                                        <ScrollArea className="min-h-0 flex-1">
                                            <ConversationList
                                                activeId={activeConversationId}
                                                onSelect={
                                                    handleSelectConversation
                                                }
                                                currentUserId={user.sub}
                                            />
                                        </ScrollArea>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setNewConvOpen(true)}
                            >
                                <HugeiconsIcon icon={Add01Icon} size={14} />
                                {t("messaging.newConversation")}
                            </Button>
                        </>
                    }
                />

                <div className="border-border bg-card flex min-h-0 flex-1 overflow-hidden rounded-xl border">
                    <aside className="border-border hidden w-80 shrink-0 flex-col border-r md:flex">
                        <div className="border-border border-b px-4 py-3">
                            <h2 className="text-sm font-semibold">
                                {t("pages.messages.conversations")}
                            </h2>
                        </div>
                        <ScrollArea className="min-h-0 flex-1">
                            <ConversationList
                                activeId={activeConversationId}
                                onSelect={setActiveConversationId}
                                currentUserId={user.sub}
                            />
                        </ScrollArea>
                    </aside>

                    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        {activeConversationId ? (
                            <>
                                <div className="border-border flex items-center gap-3 border-b px-4 py-3">
                                    <Avatar size="sm">
                                        <AvatarFallback>
                                            {conversationInitials(activeLabel)}
                                        </AvatarFallback>
                                        <PresenceBadge
                                            online={isActiveOtherOnline}
                                        />
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {activeLabel}
                                        </p>
                                        <p
                                            aria-live="polite"
                                            className="text-primary truncate text-xs empty:hidden"
                                        >
                                            {isActiveOtherTyping
                                                ? t("realtime.typing")
                                                : null}
                                        </p>
                                    </div>
                                </div>
                                <ConversationThread
                                    key={activeConversationId}
                                    conversationId={activeConversationId}
                                    currentUserId={user.sub}
                                    onRead={markConversationRead.mutate}
                                />
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-6">
                                <EmptyState
                                    icon={Message01Icon}
                                    title={t(
                                        "pages.messages.noneSelectedTitle",
                                    )}
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
            </div>

            <NewConversationDialog
                open={newConvOpen}
                onOpenChange={setNewConvOpen}
                onCreated={handleConversationCreated}
            />
        </div>
    );
}
