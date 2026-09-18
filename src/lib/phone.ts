export function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export function toE164(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function displayPhone(phone: string) {
  const e164 = toE164(phone);
  if (!e164) return phone;
  const digits = e164.slice(1);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

export function buildSmsDeepLink(phones: string[], body: string) {
  const numbers = [...new Set(phones.map((phone) => toE164(phone)).filter((value): value is string => Boolean(value)))];
  const encoded = encodeURIComponent(body);
  if (numbers.length === 0) return null;
  if (numbers.length === 1) {
    return `sms:${numbers[0]}?&body=${encoded}`;
  }
  return {
    ios: `sms:/open?addresses=${numbers.join(",")}&body=${encoded}`,
    android: `sms:${numbers.join(",")}?body=${encoded}`,
    first: `sms:${numbers[0]}?&body=${encoded}`,
  };
}
