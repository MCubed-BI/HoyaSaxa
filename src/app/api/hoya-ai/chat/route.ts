import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { getCurrentViewer } from "@/lib/viewer";
import {
  createHoyaAiTools,
  hoyaAiModel,
  hoyaAiSystemPrompt,
  roleAllowsHoyaAi,
} from "@/lib/hoya-ai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer || !roleAllowsHoyaAi(viewer.role)) {
    return Response.json({ error: "Sign in to use Hoya AI." }, { status: 401 });
  }

  let messages: UIMessage[] = [];
  try {
    const body = (await req.json()) as { messages?: UIMessage[] };
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return Response.json({ error: "Invalid chat payload." }, { status: 400 });
  }

  // Keep prompt size bounded.
  const recent = messages.slice(-24);

  try {
    const tools = createHoyaAiTools(viewer);
    const result = streamText({
      model: hoyaAiModel(),
      system: hoyaAiSystemPrompt(viewer),
      messages: await convertToModelMessages(recent),
      tools,
      stopWhen: stepCountIs(6),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream, tools }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hoya AI is unavailable.";
    const needsGateway =
      /AI Gateway|API key|OIDC|credentials|Unauthorized|401/i.test(message) ||
      (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN);
    return Response.json(
      {
        error: needsGateway
          ? "Hoya AI needs Vercel AI Gateway (OIDC on Vercel, or AI_GATEWAY_API_KEY locally)."
          : message,
      },
      { status: 502 },
    );
  }
}
