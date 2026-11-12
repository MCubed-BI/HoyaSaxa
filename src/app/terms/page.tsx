import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

export const metadata: Metadata = {
  title: "SMS Terms",
  description: `SMS terms and conditions for ${PRODUCT_DISPLAY_NAME}.`,
};

const SITE = "https://georgetown-alum.vercel.app";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-[15px] leading-7 text-zinc-800">
      <p className="text-sm font-medium text-[#041e42]">{PRODUCT_DISPLAY_NAME}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#041e42]">SMS Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: October 30, 2026</p>

      <section className="mt-8 space-y-4">
        <p>
          These terms apply to the {PRODUCT_DISPLAY_NAME} SMS program operated for Georgetown Football alumni and
          staff. By providing a mobile number to the program roster or opting in through the alum portal, you consent
          to receive SMS messages from {PRODUCT_DISPLAY_NAME} about alumni events, program updates, and related
          operational notices.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Consent</h2>
        <p>
          Consent is collected directly for this brand and this messaging program. Consent is not sold or transferred
          as a lead list. Providing a mobile number is not a condition of purchasing any goods.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Message content and frequency</h2>
        <p>
          Messages are low-volume program communications (for example event reminders and alumni updates). Frequency
          varies based on program activity. Message and data rates may apply.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Opt out and help</h2>
        <p>
          Reply <strong>STOP</strong> to cancel. Reply <strong>HELP</strong> for help. After opting out you will receive
          a confirmation and no further program SMS unless you opt in again.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">No third-party marketing sharing</h2>
        <p>
          <strong>
            We do not share, sell, or provide mobile phone numbers or messaging consent to third parties or affiliates
            for marketing or promotional purposes.
          </strong>{" "}
          This program is not affiliate marketing or third-party lead generation.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Privacy</h2>
        <p>
          See our Privacy Policy at{" "}
          <Link className="underline underline-offset-2" href="/privacy">
            {SITE}/privacy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
