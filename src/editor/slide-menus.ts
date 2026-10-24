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

import { Component, MarkdownView, Menu, editorInfoField } from "obsidian";
import type { App, Editor, TFile } from "obsidian";
import { ViewPlugin } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import type { PresentationReader } from "../presentation/reader.ts";
import { slideForMenu } from "./menu-target.ts";
import { uiText } from "../ui-text.ts";

export interface SlideMenuTarget {
  readonly owner: MarkdownView;
  readonly file: TFile;
  readonly path: string;
  readonly document: string;
  readonly slide: string;
}

/** Add slide actions to the native text menu without changing its selection. */
export class SlideMenus extends Component {
  readonly extension;
  private readonly pending = new WeakMap<Editor, SlideMenuTarget | null>();
  private running = false;

  constructor(
    private readonly app: App,
    private readonly reader: PresentationReader,
    private readonly deleteSlide: (target: SlideMenuTarget) => void,
  ) {
    super();
    this.extension = ViewPlugin.define(view => {
      const events = this.addChild(new Component());
      events.registerDomEvent(view.dom, "contextmenu", event => this.pointerMenu(view, event, true), true);
      events.registerDomEvent(view.dom, "contextmenu", event => this.pointerMenu(view, event, false));
      events.registerDomEvent(view.dom, "keydown", event => this.keyboardMenu(view, event), true);
      return { destroy: () => this.removeChild(events) };
    });
  }

  onload(): void {
    this.running = true;
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor, info) => {
      if (!(info instanceof MarkdownView)) return;
      const target = this.pending.has(editor) ? this.pending.get(editor) ?? null
        : this.target(info, editor.posToOffset(editor.getCursor()));
      this.pending.delete(editor);
      if (target) this.addItems(menu, target);
    }));
  }

  onunload(): void { this.running = false; }

  current(target: SlideMenuTarget): boolean {
    return this.running && target.owner.file === target.file && target.file.path === target.path &&
      this.app.workspace.getLeavesOfType("markdown").some(leaf => leaf.view === target.owner) &&
      this.reader.snapshot(target.file, target.owner.getViewData())?.id === target.document;
  }

  private target(owner: MarkdownView, position: number, explicitId?: string): SlideMenuTarget | null {
    const file = owner.file;
    if (!this.running || !file) return null;
    const markdown = owner.getViewData();
    const snapshot = this.reader.snapshot(file, markdown);
    if (!snapshot) return null;
    const slide = explicitId ? snapshot.document.slides.find(slide => slide.id === explicitId)
      : slideForMenu(snapshot.document, position, markdown, snapshot.bodyStart);
    return slide ? { owner, file, path: file.path, document: snapshot.id, slide: slide.id } : null;
  }

  private pointerMenu(view: EditorView, event: MouseEvent, capture: boolean): void {
    const owner = view.state.field(editorInfoField, false);
    if (!(owner instanceof MarkdownView) || owner.getMode() !== "source") return;
    const node = event.targetNode;
    const content = node !== null && view.contentDOM.contains(node);
    if (content !== capture) return;
    const element = node?.instanceOf(Element) ? node : node?.parentElement;
    const explicitId = element?.closest<HTMLElement>(".markdownpoint-notes[data-slide]")?.dataset.slide;
    const position = view.posAtCoords({ x: event.clientX, y: event.clientY }, false);
    const target = position === null && !explicitId ? null : this.target(owner, position ?? 0, explicitId);
    // Native Obsidian creates the content menu asynchronously. Capture its pointer
    // target, then contribute through editor-menu rather than replacing text items.
    if (content) this.pending.set(owner.editor, target);
    // In the margin, the inner scroll container contributes its native viewport
    // commands first. Menu.forEvent then appends to that same menu during bubbling.
    else if (target) this.addItems(Menu.forEvent(event), target);
  }

  private keyboardMenu(view: EditorView, event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey ||
      !(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) return;
    if (!event.targetNode || !view.contentDOM.contains(event.targetNode)) return;
    const owner = view.state.field(editorInfoField, false);
    if (!(owner instanceof MarkdownView)) return;
    const focused = view.dom.ownerDocument.activeElement;
    const control = focused?.instanceOf(HTMLElement) && view.contentDOM.contains(focused) && focused !== view.contentDOM ? focused : null;
    const explicitId = control?.closest<HTMLElement>(".markdownpoint-notes[data-slide]")?.dataset.slide;
    if (!this.target(owner, view.state.selection.main.head, explicitId)) return;
    const bounds = control?.getBoundingClientRect() ?? view.coordsAtPos(view.state.selection.main.head);
    if (!bounds) return;
    event.preventDefault();
    event.stopPropagation();
    // A normal DOM context-menu event lets Obsidian supply its own text actions.
    (control ?? view.contentDOM).dispatchEvent(new view.dom.ownerDocument.defaultView!.MouseEvent("contextmenu", {
      bubbles: true, cancelable: true, clientX: bounds.left, clientY: bounds.top, button: 2,
    }));
  }

  private addItems(menu: Menu, target: SlideMenuTarget): void {
    if (!this.current(target)) return;
    menu.addItem(item => item.setSection("markdownpoint-slides").setTitle(uiText.slides.delete({ count: 1 }))
      .setIcon("trash-2").onClick(() => { if (this.current(target)) this.deleteSlide(target); }));
  }
}
