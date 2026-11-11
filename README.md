# Granola to Obsidian

Save Granola enhanced notes as Obsidian notes from Raycast. Good for people on the free Granola plan, where notes expire after 30 days.

Copy the enhanced notes from Granola, run the **Save Granola Note** command, pick a folder, and press ⌘↵. The note is converted to match Obsidian conventions.

## Install on a Mac

Requirements: [Raycast](https://www.raycast.com) and [Node.js](https://nodejs.org) 22 or newer.

```bash
git clone https://github.com/NavneetPra/granola-to-obsidian.git
cd granola-to-obsidian
npm install
npm run build
```

`npm run build` installs the extension into Raycast locally. The command appears as "Save Granola Note." To update after new changes, run `npm run build` again.

The first time you run it, Raycast asks for your **Meetings Folder** (your Obsidian folder that hosts all subfolders with meeting notes in it). To change it later, open Raycast Settings, find Extensions, and select Granola to Obsidian.

To uninstall, open Raycast Settings, find Extensions, find Granola to Obsidian, and remove it.

## Development

```bash
npm run dev
```

This runs the extension in development mode to test changes on Raycast.
