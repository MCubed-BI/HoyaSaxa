import { redirect } from "next/navigation";

export default function BrothersRedirectPage() {
  redirect("/feed?section=brothers");
}
