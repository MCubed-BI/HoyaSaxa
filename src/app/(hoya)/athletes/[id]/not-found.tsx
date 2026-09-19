import Link from "next/link";
import { PageMain } from "@/components/page-chrome";
import { StatusCard } from "@/components/status-card";

export default function AthleteNotFound() {
  return (
    <PageMain width="narrow">
      <StatusCard title="Profile not found" body="That directory card is not in the roster." />
      <p className="text-center">
        <Link href="/directory" className="text-sm font-medium text-navy hover:underline">
          Back to directory
        </Link>
      </p>
    </PageMain>
  );
}
