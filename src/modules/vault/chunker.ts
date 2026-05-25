import type { ChunkInput } from "./types";

const TARGET_CHUNK_CHARS = 1200;
const MAX_CHUNK_CHARS = 2000;

// Strip YAML frontmatter if present (--- ... --- block at file start).
function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  if (end === -1) return md;
  return md.slice(end + 4).replace(/^\s*\n/, "");
}

interface Section {
  heading: string | null;
  body: string;
}

// Split markdown by H1/H2 headings. Content above the first heading
// has heading=null.
function splitByHeadings(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = /^(#{1,2})\s+(.+)$/.exec(line);
    if (match !== null) {
      if (currentLines.length > 0 || currentHeading !== null) {
        sections.push({ heading: currentHeading, body: currentLines.join("\n").trim() });
      }
      currentHeading = match[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0 || currentHeading !== null) {
    sections.push({ heading: currentHeading, body: currentLines.join("\n").trim() });
  }
  return sections.filter((s) => s.body.length > 0 || s.heading !== null);
}

// Split a long section by paragraph boundaries, packing paragraphs
// into chunks under MAX_CHUNK_CHARS while aiming for TARGET_CHUNK_CHARS.
function splitSection(section: Section): ChunkInput[] {
  if (section.body.length <= MAX_CHUNK_CHARS) {
    return [{ heading: section.heading, content: section.body }];
  }
  const paragraphs = section.body.split(/\n\n+/);
  const out: ChunkInput[] = [];
  let current = "";

  for (const p of paragraphs) {
    const candidate = current.length === 0 ? p : `${current}\n\n${p}`;
    if (candidate.length > MAX_CHUNK_CHARS && current.length > 0) {
      out.push({ heading: section.heading, content: current.trim() });
      current = p;
    } else if (candidate.length > TARGET_CHUNK_CHARS && current.length > 0) {
      out.push({ heading: section.heading, content: current.trim() });
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current.trim().length > 0) {
    out.push({ heading: section.heading, content: current.trim() });
  }
  return out;
}

export function chunkMarkdown(content: string): ChunkInput[] {
  const stripped = stripFrontmatter(content);
  const sections = splitByHeadings(stripped);
  const chunks: ChunkInput[] = [];
  for (const section of sections) {
    chunks.push(...splitSection(section));
  }
  return chunks.filter((c) => c.content.length >= 20);
}