const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Granola puts the meeting date on its own line, e.g. "Mon, 02 Nov 26"
const DATE_LINE = /^\s*(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{2}|\d{4})\s*$/;

const TLDS = "com|org|net|edu|gov|mil|io|ai|co|app|dev|us|uk|ca|me|info";
// Order matters: existing links / inline code are matched first so they are left untouched
const LINKABLE = new RegExp(
  [
    String.raw`(\[[^\]]*\]\([^)]*\)|\x60[^\x60]*\x60|<[^>\s]+>)`,
    String.raw`(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"’”])`,
    String.raw`((?<![\w@.\/-])(?:[a-z0-9-]+\.)+(?:${TLDS})\b(?![\w@-])(?:\/[^\s<>()]*[^\s<>().,;:!?'"’”])?)`,
  ].join("|"),
  "gi",
);

export interface ConvertedNote {
  fileName: string;
  body: string;
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}.${d.getDate()}.${String(d.getFullYear()).slice(2)}`;
}

function parseDateLine(line: string): string | null {
  const m = line.match(DATE_LINE);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
  if (month < 0) return null;
  return `${month + 1}.${parseInt(m[1], 10)}.${m[3].slice(-2)}`;
}

// Obsidian rejects [ ] # ^ | \ / : in file names; * " < > ? break on Windows/sync
export function safeFileName(title: string): string {
  const cleaned = title
    .replace(/\s*\/\s*/g, " + ")
    .replace(/\s*:\s*/g, " - ")
    .replace(/[\\|]/g, "-")
    .replace(/[*?"<>[\]#^]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+/, "")
    .trim()
    .slice(0, 150)
    .trim();
  return cleaned || "Untitled";
}

function linkify(line: string): string {
  return line.replace(LINKABLE, (match, keep, url, domain) => {
    if (keep) return match;
    if (url) return `[${url}](${url})`;
    if (domain) return `[${domain}](http://${domain})`;
    return match;
  });
}

// Granola nests bullets with 2 spaces; Obsidian's default (and the target vault) uses 4
function indentUnit(lines: string[]): number {
  let min = Infinity;
  for (const l of lines) {
    const m = l.match(/^( +)(?:[-*+•]|\d+[.)])\s/);
    if (m) min = Math.min(min, m[1].length);
  }
  return min === Infinity ? 4 : min;
}

export function convertGranolaNote(raw: string, now = new Date()): ConvertedNote {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n");

  const titleIdx = lines.findIndex((l) => /^#\s+\S/.test(l));
  const title = titleIdx >= 0 ? lines[titleIdx].replace(/^#\s+/, "").trim() : "";

  let dateIdx = -1;
  let dateStr: string | null = null;
  for (let i = Math.max(titleIdx, 0); i < Math.min(lines.length, Math.max(titleIdx, 0) + 5); i++) {
    dateStr = parseDateLine(lines[i]);
    if (dateStr) {
      dateIdx = i;
      break;
    }
  }

  const rest = lines.filter((_, i) => i !== titleIdx && i !== dateIdx);
  const scale = indentUnit(rest) === 2 ? 2 : 1;

  const out: string[] = [];
  let inFence = false;
  for (const original of rest) {
    if (/^\s*(```|~~~)/.test(original)) {
      inFence = !inFence;
      out.push(original);
      continue;
    }
    if (inFence) {
      out.push(original);
      continue;
    }

    let line = original.replace(/\s+$/, "");

    // The note title becomes the file name, so every heading moves up one level
    line = line.replace(/^#(#{1,5}\s)/, "$1");

    line = line.replace(/^( +)/, (s) => " ".repeat(s.length * scale));
    line = line.replace(/^(\s*)[•*]\s+/, "$1- ");

    // Without a blank line above it, "---" turns the previous line into a heading
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line) && out.length && out[out.length - 1] !== "") {
      out.push("");
    }

    out.push(linkify(line));
  }

  const body =
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n";

  const name = safeFileName(title);
  return { fileName: `${dateStr ?? formatDate(now)} ${name}`, body };
}
