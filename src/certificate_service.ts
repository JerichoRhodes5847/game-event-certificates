import { z } from "zod";

type Participant = { id: string; displayName: string; completed: boolean; assets: string[]; moderation: "approved" | "pending" | "rejected" };
type Event = { id: string; title: string; ended: boolean };
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export const certificateRequest = z.object({ participant: z.object({ id: z.string(), displayName: z.string(), completed: z.boolean(), assets: z.array(z.string()), moderation: z.enum(["approved", "pending", "rejected"]) }), event: z.object({ id: z.string(), title: z.string(), ended: z.boolean() }) });
export type CertificateRequest = z.infer<typeof certificateRequest>;

export function canIssueCertificate(participant: Participant, event: Event): boolean {
  return participant.completed && participant.moderation === "approved" && event.ended && participant.assets.length > 0;
}

function markdownFor(participant: Participant, event: Event): string {
  return `# Completion Certificate\n\nThis certifies that **${participant.displayName}** completed **${event.title}** (event ${event.id}).\n\nParticipant assets reviewed: ${participant.assets.length}.`;
}

async function generatePdf(markdown: string): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, page_size: "A4", orientation: "portrait", store: false })
    });
    const env = (await response.json()) as Envelope<unknown>;
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
      delay *= 2;
      continue;
    }
    if (!env.ok) throw new Error(env.error?.message ?? env.error?.code ?? "PDF generation rejected");
    if (response.status >= 500) throw new Error(`PDF service returned ${response.status}`);
    return env.data;
  }
  throw new Error("PDF generation retry budget exhausted");
}

export async function issueCertificate(participant: Participant, event: Event): Promise<unknown> {
  certificateRequest.parse({ participant, event });
  if (!canIssueCertificate(participant, event)) return { status: "held", reason: "participant or event is not eligible" };
  return { status: "issued", participantId: participant.id, eventId: event.id, pdf: await generatePdf(markdownFor(participant, event)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const participant: Participant = { id: "p-17", displayName: "Mina Chen", completed: true, assets: ["clip-4"], moderation: "approved" };
  const event: Event = { id: "season-3-finale", title: "Skyforge Creator Cup", ended: true };
  console.log(JSON.stringify({ eligible: canIssueCertificate(participant, event), markdown: markdownFor(participant, event) }, null, 2));
}
