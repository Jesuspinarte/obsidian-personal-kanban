import { Modal, App, MarkdownRenderer, Component } from "obsidian";
import { Card } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";

export default class CardModal extends Modal {
  private card: Card;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;

  constructor(app: App, card: Card, plugin: PersonalKanbanPlugin, parentView: KanbanView) {
    super(app);
    this.card = card;
    this.plugin = plugin;
    this.parentView = parentView;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("o-card-modal");

    // --- TITLE ---
    const titleEl = contentEl.createEl("h2", { text: this.card.title, cls: "o-card-modal__title" });
    titleEl.setAttribute("contenteditable", "true");

    titleEl.addEventListener("blur", () => {
      const newTitle = titleEl.innerText.trim();
      if (newTitle !== "") this.card.title = newTitle;
      else titleEl.innerText = this.card.title;
    });

    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
      }
    });

    // --- TAGS ---
    const tagsSection = contentEl.createEl("div", { cls: "o-card-modal__section" });
    tagsSection.createEl("h4", { text: "Tags (Separate by spaces)" });

    const tagsInput = tagsSection.createEl("input", { type: "text", cls: "o-card-modal__tags-input" });
    tagsInput.value = this.card.tags ? this.card.tags.join(" ") : "";
    tagsInput.placeholder = "#urgent #frontend";

    tagsInput.addEventListener("blur", () => {
      this.card.tags = tagsInput.value.split(" ").filter(t => t.trim() !== "");
    });

    // --- DESCRIPTION (Markdown Editor & Preview) ---
    const descSection = contentEl.createEl("div", { cls: "o-card-modal__section" });

    const descHeader = descSection.createEl("div", { cls: "o-card-modal__desc-header" });
    descHeader.createEl("h4", { text: "Description" });

    // Toggle Button
    const toggleBtn = descHeader.createEl("button", { text: "Preview Markdown" });

    const descEditor = descSection.createEl("textarea", { cls: "o-card-modal__desc-textarea" });
    descEditor.value = this.card.description || "";
    descEditor.placeholder = "Write in Markdown (e.g., **bold**, - lists)...";

    const descPreview = descSection.createEl("div", { cls: "o-card-modal__desc-preview" });
    descPreview.style.display = "none"; // Hide initially

    // Toggle Logic
    toggleBtn.onclick = async () => {
      if (descEditor.style.display !== "none") {
        // Switch to Preview Mode
        descEditor.style.display = "none";
        descPreview.style.display = "block";
        descPreview.empty();
        toggleBtn.innerText = "Edit Markdown";

        // Use Obsidian's native renderer
        const comp = new Component();
        comp.load();
        await MarkdownRenderer.render(this.app, descEditor.value, descPreview, "", comp);
      } else {
        // Switch to Edit Mode
        descPreview.style.display = "none";
        descEditor.style.display = "block";
        toggleBtn.innerText = "Preview Markdown";
      }
    };

    descEditor.addEventListener("blur", () => {
      this.card.description = descEditor.value;
    });
  }

  async onClose() {
    this.contentEl.empty();
    await this.plugin.saveSettings();
    this.parentView.render();
  }
}