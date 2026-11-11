import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  popToRoot,
  showToast,
} from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { useEffect, useMemo, useState } from "react";
import { convertGranolaNote, safeFileName } from "./convert";

interface Prefs {
  meetingsRoot: string;
}

const DOWNLOADS = "__downloads";
const ROOT = ".";

function expandHome(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function listFolders(dir: string, prefix = ""): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((d) => {
      const rel = prefix ? `${prefix}/${d.name}` : d.name;
      return [rel, ...listFolders(path.join(dir, d.name), rel)];
    });
}

function uniquePath(dir: string, fileName: string): string {
  let out = path.join(dir, `${fileName}.md`);
  for (let n = 2; fs.existsSync(out); n++) out = path.join(dir, `${fileName} ${n}.md`);
  return out;
}

export default function Command() {
  const { meetingsRoot } = getPreferenceValues<Prefs>();
  const root = expandHome(meetingsRoot);
  const rootLabel = path.basename(root);

  const [notes, setNotes] = useState("");
  const [folder, setFolder] = useState<string>(ROOT);
  const [newFolder, setNewFolder] = useState("");
  const folders = useMemo(() => listFolders(root), [root]);
  const rootExists = useMemo(() => fs.existsSync(root), [root]);

  useEffect(() => {
    Clipboard.readText().then((t) => t && setNotes((cur) => cur || t));
  }, []);

  const preview = useMemo(() => (notes.trim() ? convertGranolaNote(notes) : null), [notes]);

  function targetDir(): string {
    if (folder === DOWNLOADS) return path.join(os.homedir(), "Downloads");
    const base = path.join(root, folder !== ROOT ? folder : "");
    const extra = newFolder
      .split("/")
      .map((s) => safeFileName(s.trim()))
      .filter((s) => s && s !== "Untitled");
    return path.join(base, ...extra);
  }

  async function save() {
    if (!preview) {
      await showToast({ style: Toast.Style.Failure, title: "Paste your Granola notes first" });
      return;
    }
    try {
      const dir = targetDir();
      fs.mkdirSync(dir, { recursive: true });
      const out = uniquePath(dir, preview.fileName);
      fs.writeFileSync(out, preview.body, "utf8");
      await showToast({ style: Toast.Style.Success, title: "Saved", message: path.relative(os.homedir(), out) });
      await popToRoot();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't save note", message: String(e) });
    }
  }

  const where =
    folder === DOWNLOADS
      ? "~/Downloads"
      : `${rootLabel}/${[folder !== ROOT ? folder : "", newFolder.trim()].filter(Boolean).join("/")}`;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" icon={Icon.SaveDocument} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="notes"
        title="Granola Notes"
        placeholder="Paste the enhanced notes here"
        value={notes}
        onChange={setNotes}
      />
      <Form.Dropdown
        id="folder"
        title="Save To"
        value={folder}
        onChange={setFolder}
        info={preview ? `${where.replace(/\/$/, "")}/${preview.fileName}.md` : undefined}
        error={rootExists ? undefined : `Folder not found: ${root}`}
      >
        {rootExists && <Form.Dropdown.Item value={ROOT} title={rootLabel} icon={Icon.Folder} />}
        {folders.map((f) => (
          <Form.Dropdown.Item key={f} value={f} title={`${rootLabel}/${f}`} icon={Icon.Folder} />
        ))}
        <Form.Dropdown.Item value={DOWNLOADS} title="Downloads" icon={Icon.Download} />
      </Form.Dropdown>
      {folder !== DOWNLOADS && (
        <Form.TextField id="newFolder" title="New Subfolder" value={newFolder} onChange={setNewFolder} />
      )}
    </Form>
  );
}
