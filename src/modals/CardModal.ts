import { Modal, App, MarkdownRenderer, Component, setIcon } from "obsidian";
import { Card, Column } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";
import CardTransferController from "components/CardTransferController";

import { EditorView, keymap } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import ConfirmModal from "./ConfirmModal";

export default class CardModal extends Modal {
  private card: Card;
  private column: Column;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;

  private editor: EditorView | null = null;
  private previewContainer: HTMLElement;
  private editorContainer: HTMLElement;
  private writeTab: HTMLElement;
  private previewTab: HTMLElement;

  private currentMode: 'preview' | 'write' = 'preview';

  constructor(app: App, card: Card, column: Column, plugin: PersonalKanbanPlugin, parentView: KanbanView) {
    super(app);
    this.card = card;
    this.column = column;
    this.plugin = plugin;
    this.parentView = parentView;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("o-card-modal");

    this.modalEl.style.width = "75vw";
    this.modalEl.style.maxWidth = "900px";

    // --- TRELLO LAYOUT (68/32) ---
    const layoutEl = contentEl.createEl("div", { cls: "o-card-modal__layout" });
    const mainEl = layoutEl.createEl("div", { cls: "o-card-modal__main" });
    const sidebarEl = layoutEl.createEl("div", { cls: "o-card-modal__sidebar" });

    // --- MAIN SECTION ---
    const titleGroup = mainEl.createEl("div", { cls: "o-card-modal__title-group" });
    const titleEl = titleGroup.createEl("h2", { text: this.card.title, cls: "o-card-modal__title" });

    titleEl.setAttribute("contenteditable", "true");
    titleEl.addEventListener("blur", () => {
      const newTitle = titleEl.innerText.trim();
      if (newTitle !== "") this.card.title = newTitle;
      else titleEl.innerText = this.card.title;
    });
    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); }
    });

    const deleteBtn = titleGroup.createEl("button", { cls: "o-card-modal__delete-btn" });
    setIcon(deleteBtn, "trash-2");

    deleteBtn.onclick = () => {
      new ConfirmModal(this.plugin.app, `Delete "${this.card.title}"?`, async () => {
        this.column.cards = this.column.cards.filter(c => c.id !== this.card.id);
        await this.plugin.saveSettings();
        this.parentView.render();
        this.close();
      }).open();
    };

    mainEl.createEl("h4", { text: "Tags", cls: "o-card-modal__section-title" });
    const tagsInput = mainEl.createEl("input", { type: "text", cls: "o-card-modal__tags-input" });
    tagsInput.value = this.card.tags ? this.card.tags.join(" ") : "";
    tagsInput.placeholder = "e.g. #urgent #frontend";
    tagsInput.addEventListener("blur", () => {
      this.card.tags = tagsInput.value.split(" ").filter(t => t.trim() !== "");
    });

    const descSection = mainEl.createEl("div", { cls: "o-card-modal__desc-section" });
    const tabsHeader = descSection.createEl("div", { cls: "o-card-modal__tabs" });
    this.previewTab = tabsHeader.createEl("button", { text: "Preview", cls: "o-card-modal__tab" });
    this.writeTab = tabsHeader.createEl("button", { text: "Write", cls: "o-card-modal__tab" });

    const contentContainer = descSection.createEl("div", { cls: "o-card-modal__content" });
    this.previewContainer = contentContainer.createEl("div", { cls: "o-card-modal__preview" });
    this.editorContainer = contentContainer.createEl("div", { cls: "o-card-modal__editor" });

    this.previewTab.onclick = () => this.setMode('preview');
    this.writeTab.onclick = () => this.setMode('write');
    this.previewContainer.onclick = () => this.setMode('write');

    this.initEditor();
    this.setMode('preview');

    this.modalEl.addEventListener("mousedown", (e) => {
      if (this.currentMode === "write") {
        const target = e.target as Node;
        const isClickInsideEditor = this.editorContainer.contains(target);
        const isClickOnWriteTab = this.writeTab.contains(target);

        if (!isClickInsideEditor && !isClickOnWriteTab) {
          this.setMode("preview");
        }
      }
    });

    // --- SIDEBAR SECTION ---
    const moveController = new CardTransferController(this.card, sidebarEl, this.plugin, this.parentView, () => this.close());
    moveController.render();

    this.renderCommentsUI(sidebarEl);
  }

  private renderCommentsUI(sidebarEl: HTMLElement) {
    const commentsSection = sidebarEl.createEl("div", { cls: "o-card-modal__comments-section" });
    commentsSection.createEl("h3", { text: "Comments" });

    // The wrapper holds the textarea and the avatar is placed absolutely over it via CSS
    const inputWrapper = commentsSection.createEl("div", { cls: "o-card-modal__comment-input-wrapper" });
    inputWrapper.createEl("div", { text: "ME", cls: "o-card-modal__avatar" });

    const textarea = inputWrapper.createEl("textarea", { placeholder: "Write a comment..." });

    const actions = inputWrapper.createEl("div", { cls: "o-card-modal__comment-actions" });
    const saveBtn = actions.createEl("button", { text: "Save", cls: "mod-cta" });

    saveBtn.onclick = () => { textarea.value = ""; };
  }

  //#region Editor Helpers & Hotkeys
  private wrapText = (view: EditorView, markerBefore: string, markerAfter: string = markerBefore) => {
    const changes = view.state.changeByRange(range => ({
      changes: [{ from: range.from, insert: markerBefore }, { from: range.to, insert: markerAfter }],
      range: EditorSelection.range(range.from + markerBefore.length, range.to + markerBefore.length)
    }));
    view.dispatch(view.state.update(changes, { scrollIntoView: true }));
    return true;
  };

  private insertLink = (view: EditorView) => {
    const changes = view.state.changeByRange(range => {
      const text = view.state.sliceDoc(range.from, range.to);
      const insertText = `[${text || "text"}](url)`;
      return {
        changes: { from: range.from, to: range.to, insert: insertText },
        range: EditorSelection.range(range.from + text.length + 3, range.from + insertText.length - 1)
      };
    });
    view.dispatch(view.state.update(changes, { scrollIntoView: true }));
    return true;
  };

  private insertCodeBlock = (view: EditorView) => {
    const changes = view.state.changeByRange(range => {
      const text = view.state.sliceDoc(range.from, range.to);
      const insertText = `\`\`\`\n${text || "code"}\n\`\`\``;
      return {
        changes: { from: range.from, to: range.to, insert: insertText },
        range: EditorSelection.range(range.from + 4, range.from + 4 + (text || "code").length)
      };
    });
    view.dispatch(view.state.update(changes, { scrollIntoView: true }));
    return true;
  };

  private toggleBlockquote = (view: EditorView) => {
    const changes = view.state.changeByRange(range => {
      const line = view.state.doc.lineAt(range.from);
      if (line.text.startsWith("> ")) {
        return {
          changes: { from: line.from, to: line.from + 2, insert: "" },
          range: EditorSelection.range(Math.max(line.from, range.from - 2), Math.max(line.from, range.to - 2))
        };
      } else {
        return {
          changes: { from: line.from, insert: "> " },
          range: EditorSelection.range(range.from + 2, range.to + 2)
        };
      }
    });
    view.dispatch(view.state.update(changes, { scrollIntoView: true }));
    return true;
  };
  //#endregion

  private initEditor() {
    this.editor = new EditorView({
      state: EditorState.create({
        doc: this.card.description || "",
        extensions: [
          history(),
          markdown(),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            { key: "Mod-b", run: (v) => this.wrapText(v, "**") },
            { key: "Mod-i", run: (v) => this.wrapText(v, "*") },
            { key: "Mod-u", run: (v) => this.wrapText(v, "<u>", "</u>") },
            { key: "Mod-e", run: (v) => this.wrapText(v, "`") },
            { key: "Mod-Shift-c", run: this.insertCodeBlock },
            { key: "Mod-q", run: this.toggleBlockquote },
            { key: "Mod-Shift-x", run: (v) => this.wrapText(v, "~~") },
            { key: "Mod-k", run: this.insertLink },
            { key: "Escape", run: () => { this.setMode('preview'); return true; } }
          ]),
          EditorView.theme({
            "&": { backgroundColor: "var(--background-secondary)", color: "var(--text-normal)", minHeight: "200px", fontSize: "14px" },
            "&.cm-focused": { outline: "none" },
            ".cm-content": { padding: "15px", fontFamily: "var(--font-text)" },
            ".cm-strong": { fontWeight: "bold", color: "var(--text-normal)" },
            ".cm-em": { fontStyle: "italic" },
            ".cm-link": { color: "var(--text-accent)", textDecoration: "underline" },
            ".cm-header": { color: "var(--text-title-h2)", fontWeight: "bold" },
            ".cm-quote": { color: "var(--text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--interactive-accent)", paddingLeft: "5px" },
            ".cm-inlineCode": { backgroundColor: "var(--background-primary)", padding: "2px 4px", borderRadius: "4px", fontFamily: "monospace" }
          })
        ]
      }),
      parent: this.editorContainer
    });
  }

  private async setMode(mode: 'preview' | 'write') {
    this.currentMode = mode;

    if (mode === 'preview') {
      this.writeTab.classList.remove("is-active");
      this.previewTab.classList.add("is-active");

      this.editorContainer.style.display = "none";
      this.previewContainer.style.display = "block";

      if (this.editor) {
        this.card.description = this.editor.state.doc.toString();
      }

      this.previewContainer.empty();
      if (this.card.description.trim() === "") {
        this.previewContainer.createEl("span", {
          text: "Add a more detailed description...",
          cls: "o-card-modal__placeholder"
        });
      } else {
        const comp = new Component();
        comp.load();
        await MarkdownRenderer.render(this.app, this.card.description, this.previewContainer, "", comp);
      }
    } else {
      this.previewTab.classList.remove("is-active");
      this.writeTab.classList.add("is-active");

      this.previewContainer.style.display = "none";
      this.editorContainer.style.display = "block";

      if (this.editor) {
        this.editor.focus();
      }
    }
  }

  close() {
    if (this.currentMode === 'write') {
      this.setMode('preview');
      return;
    }
    super.close();
  }

  async onClose() {
    if (this.editor) {
      this.card.description = this.editor.state.doc.toString();
      this.editor.destroy();
    }
    this.contentEl.empty();
    await this.plugin.saveSettings();
    this.parentView.render();
  }
}
