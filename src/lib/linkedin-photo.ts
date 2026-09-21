/**
 * Best-effort public LinkedIn preview photo.
 *
 * Fetches the public profile HTML and reads og:image / twitter:image only.
 * No LinkedIn login cookies, no authenticated scraping.
 */
import { isAllowedPhotoDataUrl, normalizePhotoUrl } from "@/lib/alumni-photos";
import { normalizeLinkedinProfileUrl } from "@/lib/linkedin-profile";

export const LINKEDIN_PHOTO_FETCH_TIMEOUT_MS = 2_500;
export const LINKEDIN_PHOTO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export const LINKEDIN_PHOTO_RESOLVED_MESSAGE = "Added a public LinkedIn preview photo.";
export const LINKEDIN_PHOTO_UNAVAILABLE_MESSAGE =
  "Couldn't load a public LinkedIn preview. Upload a photo or paste an image URL instead.";
export const LINKEDIN_PHOTO_KEPT_UPLOAD_MESSAGE = "Kept your uploaded photo.";

export type LinkedinPhotoStatus = "resolved" | "unavailable" | "kept_upload" | "kept_existing" | "skipped";

export type LinkedinPhotoNotice = {
  status: LinkedinPhotoStatus;
  imageUrl: string | null;
  message: string | null;
};

export type ClassifiedPhotoInput =
  | { kind: "empty"; value: null }
  | { kind: "upload"; value: string }
  | { kind: "image"; value: string }
  | { kind: "profile"; value: string };

export type LinkedinPhotoPlan = {
  profileUrlToPersist?: { url: string; overwrite: boolean };
  fetchProfileUrl: string | null;
  writePhoto?: string | null;
  keepPhotoOnFetchFailure: string | null;
  skipNotice: LinkedinPhotoNotice | null;
};

type CacheEntry = {
  imageUrl: string | null;
  expiresAt: number;
};

const previewCache = new Map<string, CacheEntry>();

const DEFAULT_LINKEDIN_IMAGE =
  /static\.licdn\.com|(?:^|\/)(?:sc\/h|aero-v1\/sc\/h)\/|linkedin\.com\/(?:favicon|sc\/h)|ghostperson|\/a\/default|company-logo/i;

const META_KEYS = new Set([
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
]);

export function resetLinkedinPhotoCache() {
  previewCache.clear();
}

export function classifyPhotoInput(value?: string | null): ClassifiedPhotoInput {
  if (value === undefined || value === null) return { kind: "empty", value: null };
  const trimmed = value.trim();
  if (!trimmed) return { kind: "empty", value: null };
  const profile = normalizeLinkedinProfileUrl(trimmed);
  if (profile) return { kind: "profile", value: profile };
  if (trimmed.toLowerCase().startsWith("data:")) {
    if (!isAllowedPhotoDataUrl(trimmed)) {
      throw new Error("Photo upload must be a JPEG, PNG, WebP, or GIF.");
    }
    return { kind: "upload", value: trimmed.replace(/\s+/g, "") };
  }
  const photo = normalizePhotoUrl(trimmed);
  if (!photo) return { kind: "empty", value: null };
  return { kind: "image", value: photo };
}

function classifyExistingPhoto(value?: string | null): ClassifiedPhotoInput {
  try {
    return classifyPhotoInput(value);
  } catch {
    return { kind: "empty", value: null };
  }
}

function storedPhotoUrl(classified: ClassifiedPhotoInput) {
  return classified.kind === "upload" || classified.kind === "image" ? classified.value : null;
}

export function planLinkedinPhotoSave(input: {
  existingPhoto: string | null;
  existingProfileUrl: string | null;
  incomingPhoto?: string | null;
  incomingProfileUrl?: string | null;
  refreshFromLinkedin?: boolean;
}): LinkedinPhotoPlan {
  const incoming = input.incomingPhoto === undefined ? undefined : classifyPhotoInput(input.incomingPhoto);
  const existingPhotoUrl = storedPhotoUrl(classifyExistingPhoto(input.existingPhoto));
  const sentProfile =
    input.incomingProfileUrl === undefined ? undefined : normalizeLinkedinProfileUrl(input.incomingProfileUrl);
  const profileFromPhoto = incoming?.kind === "profile" ? incoming.value : null;
  const existingProfile = normalizeLinkedinProfileUrl(input.existingProfileUrl);

  let profileUrlToPersist: { url: string; overwrite: boolean } | undefined;
  if (sentProfile) {
    profileUrlToPersist = { url: sentProfile, overwrite: true };
  } else if (profileFromPhoto && !existingProfile) {
    profileUrlToPersist = { url: profileFromPhoto, overwrite: false };
  }

  const fetchProfileUrl = sentProfile || profileFromPhoto || existingProfile || null;

  if (incoming?.kind === "upload") {
    return {
      profileUrlToPersist,
      fetchProfileUrl: null,
      writePhoto: incoming.value,
      keepPhotoOnFetchFailure: incoming.value,
      skipNotice: {
        status: "kept_upload",
        imageUrl: incoming.value,
        message: LINKEDIN_PHOTO_KEPT_UPLOAD_MESSAGE,
      },
    };
  }

  if (input.refreshFromLinkedin && fetchProfileUrl) {
    return {
      profileUrlToPersist,
      fetchProfileUrl,
      keepPhotoOnFetchFailure: incoming?.kind === "image" ? incoming.value : existingPhotoUrl,
      skipNotice: null,
    };
  }

  if (incoming?.kind === "image") {
    return {
      profileUrlToPersist,
      fetchProfileUrl: null,
      writePhoto: incoming.value,
      keepPhotoOnFetchFailure: incoming.value,
      skipNotice: {
        status: "kept_existing",
        imageUrl: incoming.value,
        message: null,
      },
    };
  }

  const incomingLeavesSlotEmpty = incoming === undefined || incoming.kind === "empty" || incoming.kind === "profile";
  const slotEmpty = !existingPhotoUrl && incomingLeavesSlotEmpty;

  if (fetchProfileUrl && slotEmpty) {
    return {
      profileUrlToPersist,
      fetchProfileUrl,
      keepPhotoOnFetchFailure: existingPhotoUrl,
      skipNotice: null,
    };
  }

  if (incoming?.kind === "empty") {
    return {
      profileUrlToPersist,
      fetchProfileUrl: null,
      writePhoto: null,
      keepPhotoOnFetchFailure: null,
      skipNotice: { status: "skipped", imageUrl: null, message: null },
    };
  }

  return {
    profileUrlToPersist,
    fetchProfileUrl: null,
    keepPhotoOnFetchFailure: existingPhotoUrl,
    skipNotice: {
      status: existingPhotoUrl ? "kept_existing" : "skipped",
      imageUrl: existingPhotoUrl,
      message: null,
    },
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function absoluteUrl(candidate: string, pageUrl?: string) {
  try {
    return new URL(candidate, pageUrl || "https://www.linkedin.com").toString();
  } catch {
    return null;
  }
}

export function isUsableLinkedinPreviewUrl(value: string, pageUrl?: string) {
  const absolute = absoluteUrl(value.trim(), pageUrl);
  if (!absolute) return null;
  try {
    const url = new URL(absolute);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (DEFAULT_LINKEDIN_IMAGE.test(url.href) || DEFAULT_LINKEDIN_IMAGE.test(url.pathname)) return null;
    if (normalizeLinkedinProfileUrl(url.href)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function metaContents(html: string) {
  const found: string[] = [];
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = /(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.trim().toLowerCase();
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (!key || content == null || !META_KEYS.has(key)) continue;
    found.push(decodeHtmlEntities(content));
  }
  return found;
}

function jsonLdImages(html: string) {
  const found: string[] = [];
  const blocks = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const raw = block.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(raw) as unknown;
      collectJsonLdImages(parsed, found);
    } catch {
      // Public pages sometimes emit invalid JSON-LD; ignore it.
    }
  }
  return found;
}

function collectJsonLdImages(value: unknown, found: string[]) {
  if (!value) return;
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) found.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdImages(item, found);
    return;
  }
  if (typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if ("image" in record) collectJsonLdImages(record.image, found);
  if (typeof record.url === "string" && record["@type"] === "ImageObject") found.push(record.url);
}

export function extractPublicPreviewImage(html: string, pageUrl?: string) {
  const candidates = [...metaContents(html), ...jsonLdImages(html)];
  for (const candidate of candidates) {
    const usable = isUsableLinkedinPreviewUrl(candidate, pageUrl);
    if (usable) return usable;
  }
  return null;
}

export type ResolveLinkedinPreviewOptions = {
  fetch?: typeof fetch;
  now?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  bypassCache?: boolean;
};

export async function resolveLinkedinPreviewImage(
  profileUrl: string,
  options: ResolveLinkedinPreviewOptions = {},
): Promise<{ imageUrl: string | null; cached: boolean; reason: string }> {
  const normalized = normalizeLinkedinProfileUrl(profileUrl);
  if (!normalized) return { imageUrl: null, cached: false, reason: "invalid_url" };

  const now = options.now ?? Date.now();
  const cached = previewCache.get(normalized);
  if (!options.bypassCache && cached && cached.expiresAt > now) {
    return { imageUrl: cached.imageUrl, cached: true, reason: cached.imageUrl ? "cache_hit" : "cache_miss" };
  }

  const timeoutMs = options.timeoutMs ?? LINKEDIN_PHOTO_FETCH_TIMEOUT_MS;
  const cacheTtlMs = options.cacheTtlMs ?? LINKEDIN_PHOTO_CACHE_TTL_MS;
  const fetchImpl = options.fetch ?? fetch;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const timeout = new Promise<never>((_, reject) => {
      const fail = () => {
        const error = new Error("LinkedIn preview timed out");
        error.name = "TimeoutError";
        reject(error);
      };
      if (controller.signal.aborted) fail();
      else controller.signal.addEventListener("abort", fail, { once: true });
    });
    try {
      const response = await Promise.race([
        fetchImpl(normalized, {
          method: "GET",
          redirect: "follow",
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": "Mozilla/5.0 (compatible; HoyaSaxaPreview/1.0; +https://github.com/MCubed-BI/HoyaSaxa)",
          },
          signal: controller.signal,
        }),
        timeout,
      ]);
      if (!response.ok) {
        previewCache.set(normalized, { imageUrl: null, expiresAt: now + cacheTtlMs });
        return { imageUrl: null, cached: false, reason: `http_${response.status}` };
      }
      const raw = await Promise.race([response.text(), timeout]);
      const html = raw.length > 500_000 ? raw.slice(0, 500_000) : raw;
      const imageUrl = extractPublicPreviewImage(html, response.url || normalized);
      previewCache.set(normalized, { imageUrl, expiresAt: now + cacheTtlMs });
      return { imageUrl, cached: false, reason: imageUrl ? "resolved" : "no_image" };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const reason =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "timeout"
        : "fetch_failed";
    previewCache.set(normalized, { imageUrl: null, expiresAt: now + cacheTtlMs });
    return { imageUrl: null, cached: false, reason };
  }
}
