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

import { Component, MarkdownRenderChild, MarkdownView, Menu, Notice, editorInfoField } from "obsidian";
import type { App, Editor, MarkdownPostProcessorContext, TFile } from "obsidian";
import { Text } from "@codemirror/state";
import { ViewPlugin } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import type { PresentationReader } from "../presentation/reader.ts";
import { slideForMenu } from "./menu-target.ts";
import { uiText } from "../ui-text.ts";
import { presentationCompanionPath } from "../format/recognition.ts";

export interface SlideMenuTarget {
  readonly owner: MarkdownView;
  readonly file: TFile;
  readonly path: string;
  readonly document: string;
  readonly slide: string | null;
}

/** Add slide actions to the native text menu without changing its selection. */
export class SlideMenus extends Component {
  readonly extension;
  private readonly pending = new WeakMap<Editor, SlideMenuTarget | null>();
  private readonly readingViews = new Map<MarkdownView, Component>();
  private readonly readingSections = new Map<HTMLElement, MarkdownPostProcessorContext>();
  private running = false;

  constructor(
    private readonly app: App,
    private readonly reader: PresentationReader,
    private readonly actions: { cut(target: SlideMenuTarget): void; copy(target: SlideMenuTarget): void; paste(target: SlideMenuTarget): void; delete(target: SlideMenuTarget): void },
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
    this.registerEvent(this.app.workspace.on("layout-change", () => this.syncReadingViews()));
    this.app.workspace.onLayoutReady(() => this.syncReadingViews());
  }

  onunload(): void {
    this.running = false;
    this.readingViews.clear();
    this.readingSections.clear();
  }

  /** Keep the renderer's live source mapping; never infer slide identity from words. */
  readingSection(element: HTMLElement, context: MarkdownPostProcessorContext): void {
    if (!this.running || !presentationCompanionPath(context.sourcePath)) return;
    this.readingSections.set(element, context);
    const child = new MarkdownRenderChild(element);
    child.register(() => {
      if (this.readingSections.get(element) === context) this.readingSections.delete(element);
    });
    context.addChild(child);
  }

  private syncReadingViews(): void {
    if (!this.running) return;
    const views = new Set(this.app.workspace.getLeavesOfType("markdown")
      .flatMap(leaf => leaf.view instanceof MarkdownView ? [leaf.view] : []));
    for (const [view, events] of this.readingViews) if (!views.has(view)) {
      this.removeChild(events);
      this.readingViews.delete(view);
    }
    for (const view of views) if (!this.readingViews.has(view)) {
      const events = this.addChild(new Component());
      this.readingViews.set(view, events);
      // Bubble after the renderer's own link and viewport menu contributions.
      events.registerDomEvent(view.previewMode.containerEl, "contextmenu", event => this.readingMenu(view, event));
      events.registerDomEvent(view.previewMode.containerEl, "keydown", event => this.readingKeyboardMenu(view, event));
    }
  }

  private readingMenu(owner: MarkdownView, event: MouseEvent): void {
    if (!this.running || owner.getMode() !== "preview" || !owner.file) return;
    const node = event.targetNode;
    const element = node?.instanceOf(Element) ? node : node?.parentElement;
    if (!element || element.closest(".internal-embed, .metadata-container, .inline-title")) return;
    const container = owner.previewMode.containerEl;
    const snapshot = this.reader.snapshot(owner.file, owner.getViewData());
    if (snapshot && !snapshot.document.slides.length) {
      const target = this.target(owner, snapshot.bodyStart);
      if (target) this.addItems(Menu.forEvent(event), target);
      return;
    }
    let section: HTMLElement | null = null;
    for (let parent: Element | null = element; parent && parent !== container; parent = parent.parentElement) {
      if (parent.instanceOf(HTMLElement) && this.readingSections.has(parent)) { section = parent; break; }
    }
    if (!section) {
      // Empty space belongs to the preceding rendered section; top padding uses
      // the first one. Section/composition text is excluded by the source target.
      let top = -Infinity, first: HTMLElement | null = null, firstTop = Infinity;
      for (const [candidate, context] of this.readingSections) {
        if (context.sourcePath !== owner.file.path || !candidate.isConnected || !container.contains(candidate)) continue;
        const bounds = candidate.getBoundingClientRect();
        if (!bounds.height) continue;
        if (bounds.top < firstTop) { firstTop = bounds.top; first = candidate; }
        if (bounds.top <= event.clientY && bounds.top >= top) { top = bounds.top; section = candidate; }
      }
      section ??= first;
    }
    const context = section && this.readingSections.get(section);
    if (!section || context?.sourcePath !== owner.file.path) return;
    const info = context.getSectionInfo(section);
    if (!info || info.text !== owner.getViewData()) return;
    const source = Text.of(info.text.split("\n"));
    if (info.lineStart < 0 || info.lineStart >= source.lines) return;
    const target = this.target(owner, source.line(info.lineStart + 1).from);
    if (!target) return;
    const selection = container.ownerDocument.getSelection();
    const selected = selection?.anchorNode && selection.focusNode && container.contains(selection.anchorNode) && container.contains(selection.focusNode)
      ? selection.toString() : "";
    const menu = Menu.forEvent(event);
    // Native link menus already provide Copy for their link text.
    if (selected && !element.closest(".internal-link, .external-link")) menu.addItem(item => item.setSection("clipboard").setTitle(uiText.clipboard.copyText).setIcon("copy")
      .onClick(() => {
        void container.ownerDocument.defaultView!.navigator.clipboard.writeText(selected).catch((error: unknown) => {
          console.error(error);
          if (this.running) new Notice(uiText.clipboard.copyFailed);
        });
      }));
    this.addItems(menu, target);
  }

  private readingKeyboardMenu(owner: MarkdownView, event: KeyboardEvent): void {
    if (!this.running || owner.getMode() !== "preview" || event.altKey || event.ctrlKey || event.metaKey ||
      !(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) return;
    const focused = event.targetNode?.instanceOf(Element) ? event.targetNode : event.targetNode?.parentElement;
    if (!focused || focused.closest(".internal-embed, .metadata-container, .inline-title") ||
      !owner.file || !this.reader.snapshot(owner.file, owner.getViewData())) return;
    const container = owner.previewMode.containerEl;
    const selection = container.ownerDocument.getSelection();
    const empty = owner.file && this.reader.snapshot(owner.file, owner.getViewData())?.document.slides.length === 0;
    if (empty) {
      const bounds = focused.getBoundingClientRect();
      const context = new container.ownerDocument.defaultView!.MouseEvent("contextmenu", {
        bubbles: true, cancelable: true, clientX: bounds.left, clientY: bounds.top, button: 2,
      });
      focused.dispatchEvent(context);
      if (context.defaultPrevented) { event.preventDefault(); event.stopPropagation(); }
      return;
    }
    const node = selection?.focusNode;
    if (!node || !container.contains(node) || !selection.rangeCount) return;
    const target = node.instanceOf(Element) ? node : node.parentElement;
    if (!target || target.closest(".internal-embed, .metadata-container, .inline-title")) return;
    const bounds = selection.getRangeAt(0).getBoundingClientRect();
    const context = new container.ownerDocument.defaultView!.MouseEvent("contextmenu", {
      bubbles: true, cancelable: true, clientX: bounds.left, clientY: bounds.top, button: 2,
    });
    target.dispatchEvent(context);
    if (context.defaultPrevented) { event.preventDefault(); event.stopPropagation(); }
  }

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
    return slide || (!snapshot.document.slides.length && (position >= snapshot.bodyStart ||
      (owner.getMode() === "source" && owner.containerEl.querySelector(".markdownpoint-empty-draft") !== null)))
      ? { owner, file, path: file.path, document: snapshot.id, slide: slide?.id ?? null } : null;
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
    if (target.slide) menu.addItem(item => item.setSection("markdownpoint-slides").setTitle(uiText.slides.cut({ count: 1 }))
      .setIcon("scissors").onClick(() => { if (this.current(target)) this.actions.cut(target); }));
    if (target.slide) menu.addItem(item => item.setSection("markdownpoint-slides").setTitle(uiText.slides.copy({ count: 1 }))
      .setIcon("copy").onClick(() => { if (this.current(target)) this.actions.copy(target); }));
    menu.addItem(item => item.setSection("markdownpoint-slides").setTitle(uiText.slides.paste)
      .setIcon("clipboard-paste").onClick(() => { if (this.current(target)) this.actions.paste(target); }));
    if (target.slide) menu.addItem(item => item.setSection("markdownpoint-slides").setTitle(uiText.slides.delete({ count: 1 }))
      .setIcon("trash-2").onClick(() => { if (this.current(target)) this.actions.delete(target); }));
  }
}
