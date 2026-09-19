import { filterMessageChannels, type MessageChannelRow, type MessageFilter } from "@/lib/messages";
import { MessagesInboxView } from "@/components/messages-inbox-view";

export function MessagesInbox({
  channels,
  filter,
}: {
  channels: MessageChannelRow[];
  filter: MessageFilter;
}) {
  const rows = filterMessageChannels(channels, filter);
  const unread = channels.reduce((sum, channel) => sum + channel.unread_count, 0);
  return <MessagesInboxView rows={rows} filter={filter} unread={unread} />;
}
