import { redirect } from "next/navigation";
import { getMessageViewer, loginPathFor } from "@/lib/messages-auth";

export async function requireMessageViewer(pathname = "/messages") {
  const viewer = await getMessageViewer();
  if (!viewer) redirect(loginPathFor(pathname));
  return viewer;
}
