import { App, Modal, Setting } from "obsidian";

export default class ConfirmModal extends Modal {
  private message: string;
  private onConfirm: () => void;

  constructor(app: App, message: string, onConfirm: () => void) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Minimalist Native Design
    contentEl.createEl("h3", { text: "Are you sure?" });
    contentEl.createEl("p", { text: this.message });

    new Setting(contentEl)
      .addButton((btn) => btn
        .setButtonText("Cancel")
        .onClick(() => this.close())
      )
      .addButton((btn) => btn
        .setButtonText("Delete")
        .setWarning() // Sets the button to red natively
        .onClick(() => {
          this.onConfirm();
          this.close();
        })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}
