import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `SMS and privacy disclosures for ${PRODUCT_DISPLAY_NAME}.`,
};

const SITE = "https://georgetown-alum.vercel.app";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-[15px] leading-7 text-zinc-800">
      <p className="text-sm font-medium text-[#041e42]">{PRODUCT_DISPLAY_NAME}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#041e42]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: October 30, 2026</p>

      <section className="mt-8 space-y-4">
        <p>
          This Privacy Policy explains how {PRODUCT_DISPLAY_NAME} (“we,” “us”) collects and uses information when you
          use our alumni CRM website and related SMS program for Georgetown Football alumni and staff.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Information we collect</h2>
        <p>
          We may collect your name, email address, mobile phone number, class year, position, and other roster or
          account details you or the football program provide. When you interact with SMS, we also process delivery
          and opt-out status.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">How we use information for messaging</h2>
        <p>
          We use mobile numbers to send program-related SMS messages such as event reminders, alumni updates, and
          operational notices from Georgetown Football / {PRODUCT_DISPLAY_NAME}. Message frequency varies. Message and
          data rates may apply.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Mobile information and consent — not shared</h2>
        <p>
          <strong>
            We do not share, sell, or provide your mobile phone number or messaging consent data to third parties or
            affiliates for marketing or promotional purposes.
          </strong>{" "}
          Mobile opt-in data is used only to operate this messaging program for {PRODUCT_DISPLAY_NAME}.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Service providers</h2>
        <p>
          We use infrastructure providers (including Twilio for SMS delivery and hosting/database providers) solely to
          operate the service. Those providers process data under our instructions and are not permitted to use mobile
          opt-in data for their own marketing.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Opt out and help</h2>
        <p>
          You can opt out of SMS at any time by replying <strong>STOP</strong>. For help, reply <strong>HELP</strong>.
          You may also contact the program through the signed-in app support channels.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-[#041e42]">Related terms</h2>
        <p>
          SMS program terms are described at{" "}
          <Link className="underline underline-offset-2" href="/terms">
            {SITE}/terms
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
