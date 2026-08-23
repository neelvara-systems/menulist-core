type SupportTicketActorSession = {
    uId?: unknown;
    user?: {
        id?: unknown;
        name?: unknown;
        email?: unknown;
    } | null;
} | null | undefined;

export type AnswerlatticeSupportTicketActor = {
    id: string;
    name: string;
    email: string;
};

export const resolveAnswerlatticeSupportTicketActor = (
    session: SupportTicketActorSession,
): AnswerlatticeSupportTicketActor => {
    const id = String(session?.uId ?? session?.user?.id ?? '').trim();
    const name = String(session?.user?.name ?? session?.user?.email ?? '').trim();
    const email = String(session?.user?.email ?? '').trim().toLowerCase();

    if (!id || id.length > 180 || !name || name.length > 200 || email.length > 254) {
        throw new Error('answerlattice_ticket_actor_invalid');
    }

    return { id, name, email };
};
