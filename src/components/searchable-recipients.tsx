"use client";

import { useMemo, useState } from "react";
import { DataTable, StickyTableHeader, Table, TableBody, TableHead, TableRow } from "@/components/data-table";
import { EmptyState } from "@/components/query-state";
import { ClientPagination } from "@/components/result-pagination";
import { SearchField } from "@/components/search-field";
import { TableCell } from "@/components/ui/table";
import { formatCount, formatNumber, resultRange } from "@/lib/format";
import { displayPhone } from "@/lib/phone";

export type RecipientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

const PAGE_SIZE = 25;

export function SearchableRecipients({
  rows,
  channel,
}: {
  rows: RecipientRow[];
  channel: "sms" | "email";
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const contactKey = channel === "sms" ? "phone" : "email";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const contact = row[contactKey] ?? "";
      return row.name.toLowerCase().includes(needle) || contact.toLowerCase().includes(needle);
    });
  }, [contactKey, q, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const range = resultRange(current, PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-3">
      <SearchField
        value={q}
        onChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        placeholder={channel === "sms" ? "Search name or phone" : "Search name or email"}
        label="Search recipients"
      />
      <p className="text-sm text-muted-foreground">
        {range.label}
        {filtered.length > 0
          ? ` · ${formatCount(filtered.length, channel === "sms" ? "phone" : "email")}`
          : null}
      </p>
      {slice.length === 0 ? (
        <EmptyState
          title={q.trim() ? "No recipients match" : "No recipients yet"}
          body={
            q.trim()
              ? "Try another name, or clear search to see the full blast list."
              : channel === "sms"
                ? "Nobody in this group has a phone number yet."
                : "Nobody in this group has an email yet."
          }
          icon="blast"
        />
      ) : (
        <DataTable caption={channel === "sms" ? "People who will be texted" : "People who will be emailed"}>
          <Table container={false}>
            <StickyTableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>{channel === "sms" ? "Phone" : "Email"}</TableHead>
              </TableRow>
            </StickyTableHeader>
            <TableBody>
              {slice.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-navy">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {channel === "sms" ? displayPhone(row.phone ?? "") : row.email}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      )}
      <ClientPagination page={current} pageCount={pageCount} onPage={setPage} />
      {filtered.length > 0 ? (
        <p className="text-xs text-muted-foreground">{formatNumber(filtered.length)} ready to send</p>
      ) : null}
    </div>
  );
}
