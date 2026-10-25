/*
 * MarkdownPoint - Plugin for Obsidian
 * Copyright (c) 2026 Johan Sanneblad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { applyEdits, findNodeAtLocation, parseTree } from "jsonc-parser";
import type { Edit } from "jsonc-parser";
import type { CapturedPart, CapturedSlides } from "./capture.ts";
import { readJsonObject } from "./json.ts";
import { isRecord } from "./recognition.ts";

const mediaExtension = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|mp4|m4v|mov|webm|ogv|mp3|m4a|wav|ogg|flac|glb|eot)$/i;

/** Only presentation-owned media paths may authorize a cross-presentation file read. */
export function isPresentationMediaPath(value: string): boolean {
  const parts = value.split("/");
  return parts.length > 1 && ["media", "generated"].includes(parts[0]!) && mediaExtension.test(value) &&
    !/[\\<>:"|?*#]/.test(value) && !/\p{Cc}/u.test(value) && parts.every(part => part && !part.startsWith(".") && !/[ .]$/.test(part) &&
      !/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part));
}

interface Location { readonly path: readonly (string | number)[]; readonly value: string }
export interface ClipboardAssets {
  readonly files: readonly string[];
  remap(names: ReadonlyMap<string, string>): CapturedSlides | null;
}

/** Record paths keep ordinary words, links, unknown metadata and numeric source precision untouched. */
export function planClipboardAssets(captured: CapturedSlides): ClipboardAssets | null {
  const definitions = new Map<string, Record<string, unknown>>();
  for (const part of captured.compositions) {
    const record = readJsonObject(part.record);
    if (!record) return null;
    definitions.set(part.id, record);
  }
  const files = new Set<string>(), edits = new Map<CapturedPart, { offset: number; length: number; value: string }[]>();
  for (const part of [...captured.slides, ...captured.compositions]) {
    const record = definitions.get(part.id) ?? readJsonObject(part.record), tree = parseTree(part.record);
    if (!record || !tree) return null;
    const locations: Location[] = [];
    const add = (value: unknown, path: readonly (string | number)[]) => {
      if (typeof value === "string" && value !== "" && value !== "none") locations.push({ path, value });
    };
    const nested = (value: unknown, name: string): unknown => isRecord(value) ? value[name] : undefined;
    if (isRecord(record.background)) {
      add(record.background.image, ["background", "image"]);
      add(nested(record.background["image-result"], "source"), ["background", "image-result", "source"]);
    }
    if (definitions.has(part.id) && isRecord(record.controls)) for (const [key, control] of Object.entries(record.controls)) {
      if (isRecord(control) && control.type === "media") add(control.default, ["controls", key, "default"]);
    }
    const objects: [Record<string, unknown>, (string | number)[]][] = [];
    if (Array.isArray(record.objects)) record.objects.forEach((object: unknown, index) => { if (isRecord(object)) objects.push([object, ["objects", index]]); });
    if (isRecord(record.overrides)) for (const [id, object] of Object.entries(record.overrides)) if (isRecord(object)) objects.push([object, ["overrides", id]]);
    for (const [object, base] of objects) {
      add(object.asset, [...base, "asset"]);
      add(object["poster-frame"], [...base, "poster-frame"]);
      add(nested(object["image-result"], "source"), [...base, "image-result", "source"]);
      add(nested(object.model, "asset"), [...base, "model", "asset"]);
      if (base[0] === "objects" && object.type === "composition" && typeof object.source === "string" && isRecord(object.controls)) {
        const controls = definitions.get(object.source)?.controls;
        if (!isRecord(controls)) continue;
        for (const [name, value] of Object.entries(object.controls)) {
          const declaration = controls[name];
          if (isRecord(declaration) && declaration.type === "media") add(value, [...base, "controls", name]);
        }
      }
    }
    const replacements: { offset: number; length: number; value: string }[] = [];
    for (const location of locations) {
      if (!isPresentationMediaPath(location.value)) return null;
      const node = findNodeAtLocation(tree, [...location.path]);
      if (!node || node.type !== "string" || node.value !== location.value) return null;
      files.add(location.value); replacements.push({ offset: node.offset, length: node.length, value: location.value });
    }
    edits.set(part, replacements);
  }
  return { files: [...files], remap: names => {
    if ([...files].some(file => !isPresentationMediaPath(names.get(file) ?? ""))) return null;
    const changed = (part: CapturedPart): CapturedPart => {
      const changes: Edit[] = edits.get(part)!.filter(edit => names.get(edit.value) !== edit.value)
        .map(edit => ({ offset: edit.offset, length: edit.length, content: JSON.stringify(names.get(edit.value)!) }));
      return { ...part, record: changes.length ? applyEdits(part.record, changes) : part.record };
    };
    return { slides: captured.slides.map(changed), compositions: captured.compositions.map(changed) };
  } };
}
