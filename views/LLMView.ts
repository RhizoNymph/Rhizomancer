import { App, Plugin, Modal, ItemView, TFile, TFolder, TAbstractFile, MarkdownView, WorkspaceLeaf } from 'obsidian';
import { SearchResultsModal } from './SearchResultsModal';

export const LLM_VIEW_TYPE = "llm-chat";

export class LLMView extends ItemView {
    private searchInputEl: HTMLTextAreaElement;
    private promptInputEl: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;
    private indexSelect: HTMLSelectElement;
    private plugin: Rhizomancer;
    private attachButton: HTMLButtonElement;
    private chatContainer: HTMLElement;
    private attachedImage: string | null = null;
    private conversationHistory: any[] = [];
    private indexRadio: HTMLInputElement;
    private currentFileRadio: HTMLInputElement;
    private indexSelectContainer: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: Rhizomancer) {
        super(leaf);
        this.plugin = plugin;
        this.currentFileRadio = null;
    }

    getViewType() {
        return LLM_VIEW_TYPE;
    }

    getDisplayText() {
        return "LLM Chat";
    }

    async performSearch(query: string) {
        let indexName: string;

        if (this.currentFileRadio.checked) {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile || (activeFile.extension !== 'pdf' && activeFile.extension !== 'md')) {
                new Notice("No valid file is currently open");
                throw new Error("No valid file is currently open");
            }

            const fileContent = activeFile.extension === 'pdf'
                ? await this.app.vault.readBinary(activeFile)
                : new TextEncoder().encode(await this.app.vault.read(activeFile));

            indexName = await this.plugin.calculateSHA256(fileContent);
        } else {
            indexName = this.indexSelect.value;
        }

        const response = await fetch(`${this.plugin.settings.serverAddress}/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                index_name: indexName
            }),
        });

        return await response.json();
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h4", { text: "LLM Chat" });

        this.chatContainer = container.createEl("div", { cls: "llm-chat-container" });
        this.chatContainer.style.flexGrow = "1";
        this.chatContainer.style.overflowY = "auto";
        this.chatContainer.style.display = "flex";
        this.chatContainer.style.flexDirection = "column";

        const inputContainer = container.createEl("div", { cls: "llm-input-container" });

        const indexContainer = inputContainer.createEl("div", { cls: "index-container" });
        indexContainer.createEl("label", { text: "Search Index:" });

        const radioGroup = indexContainer.createEl("div", { cls: "radio-group" });
        radioGroup.style.display = "flex";
        radioGroup.style.gap = "15px";
        radioGroup.style.marginBottom = "10px";

        // Index radio
        const indexRadioLabel = radioGroup.createEl("label", { cls: "radio-label" });
        this.indexRadio = indexRadioLabel.createEl("input", {
            type: "radio",
            name: "search-source",
            value: "index"
        });
        indexRadioLabel.appendText(" Use Index");

        // Current file radio
        const fileRadioLabel = radioGroup.createEl("label", { cls: "radio-label" });
        this.currentFileRadio = fileRadioLabel.createEl("input", {
            type: "radio",
            name: "search-source",
            value: "current-file"
        });
        fileRadioLabel.appendText(" Current File");

        // Set initial states
        this.indexRadio.checked = true;
        this.currentFileRadio.checked = false;

        // Single event handler for both radio buttons
        radioGroup.addEventListener("change", (e) => {
            const target = e.target as HTMLInputElement;
            if (target.type === "radio") {
                this.indexSelectContainer.style.display =
                    target.value === "index" ? "block" : "none";

                // Uncheck the other radio button
                if (target.value === "index") {
                    this.currentFileRadio.checked = false;
                } else {
                    this.indexRadio.checked = false;
                }
            }
        });

        this.indexSelectContainer = indexContainer.createEl("div", { cls: "index-select-container" });
        this.indexSelectContainer.style.display = "block";

        const indexSelectGroup = this.indexSelectContainer.createEl("div", { cls: "index-select-group" });
        indexSelectGroup.style.display = "flex";
        indexSelectGroup.style.gap = "5px";

        this.indexSelect = indexSelectGroup.createEl("select", { cls: "index-select" });

        const refreshButton = indexSelectGroup.createEl("button", {
            cls: "index-refresh-button",
            text: "↻"
        });

        await this.updateIndices();

        const searchContainer = inputContainer.createEl("div", { cls: "search-container" });
        searchContainer.createEl("label", { text: "Search Query:" });
        this.searchInputEl = searchContainer.createEl("textarea", {
            attr: { placeholder: "Enter your search query..." },
            cls: "llm-search-input"
        });

        const promptContainer = inputContainer.createEl("div", { cls: "prompt-container" });
        promptContainer.createEl("label", { text: "LLM Prompt:" });
        this.promptInputEl = promptContainer.createEl("textarea", {
            attr: { placeholder: "Enter your prompt for the LLM..." },
            cls: "llm-prompt-input"
        });

        const buttonContainer = inputContainer.createEl("div", { cls: "llm-button-container" });

        this.attachButton = buttonContainer.createEl("button", {
            text: "Attach Image",
            cls: "llm-attach-button"
        });

        this.sendButton = buttonContainer.createEl("button", {
            text: "Send",
            cls: "llm-send-button"
        });

        this.attachButton.addEventListener("click", this.handleAttachImage.bind(this));
        this.sendButton.addEventListener("click", this.handleSend.bind(this));

        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.height = "100%";
        inputContainer.style.marginTop = "auto";

        this.searchInputEl.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.promptInputEl.focus();
            }
        });

        this.promptInputEl.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
    }

    async handleAttachImage() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                this.attachedImage = await this.convertToBase64(file);
                this.attachButton.setText("Image Attached");
                this.attachButton.addClass("image-attached");
            }
        };
        fileInput.click();
    }

    async handleSend() {
        const searchQuery = this.searchInputEl.value;
        const prompt = this.promptInputEl.value;

        if (!searchQuery.trim()) {
          // If search query is empty, send only the prompt directly to LLM
          if (prompt.trim()) {
              const messages = [{
                  type: "text",
                  text: prompt
              }];

              if (this.attachedImage) {
                  messages.push({
                      type: "image_url",
                      image_url: { url: this.attachedImage }
                  });
              }

              const response = await this.sendToLLM(messages);
              const assistantMessage = { role: "assistant", content: response.choices[0].message.content };
              this.conversationHistory.push(assistantMessage);
              this.displayMessage(assistantMessage);

              this.promptInputEl.value = '';

              if (this.attachedImage) {
                  this.attachedImage = null;
                  this.attachButton.setText("Attach Image");
                  this.attachButton.removeClass("image-attached");
              }
              return;
          }
      }

        if (searchQuery.trim()) {
            console.log("Sending search query:", searchQuery);

            const searchResults = await this.performSearch(searchQuery);
            console.log("Received search results:", searchResults);

            new SearchResultsModal(this.app, searchResults, (selectedImages, selectedTexts) => {
                console.log("Selected images:", selectedImages);
                console.log("Selected texts:", selectedTexts);

                const messages = [];

                selectedImages.forEach(image => {
                    messages.push({
                        type: "image_url",
                        image_url: { url: image.base64 }
                    });
                });

                selectedTexts.forEach(text => {
                    messages.push({
                        type: "text",
                        text: `[From ${text.doc_id}]: ${text.content}`
                    });
                });

                if (prompt.trim()) {
                    messages.push({
                        type: "text",
                        text: prompt
                    });
                }

                if (this.attachedImage) {
                    messages.push({
                        type: "image_url",
                        image_url: { url: this.attachedImage }
                    });
                }

                this.sendToLLM(messages).then(response => {
                    const assistantMessage = { role: "assistant", content: response.choices[0].message.content };
                    this.conversationHistory.push(assistantMessage);
                    this.displayMessage(assistantMessage);

                    this.searchInputEl.value = '';
                    this.promptInputEl.value = '';

                    this.attachedImage = null;
                    this.attachButton.setText("Attach Image");
                    this.attachButton.removeClass("image-attached");
                });
            }).open();
        }
    }

    async sendToLLM(messages: any[]) {
        const response = await fetch(`${this.plugin.settings.serverAddress}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: messages
            }),
        });

        return await response.json();
    }

    displayMessage(message: any) {
        console.log("Displaying message:", message);
        const messageEl = this.chatContainer.createEl("div", { cls: `${message.role}-message` });
        messageEl.createEl("strong", { text: `${message.role === 'user' ? 'You' : 'LLM'}: ` });

        if (message.image) {
            console.log("Displaying attached image");
            this.displayImage(messageEl, message.image);
        }

        if (message.selectedImages) {
            console.log("Displaying selected images:", message.selectedImages);
            message.selectedImages.forEach(img => this.displayImage(messageEl, img.base64));
        }

        if (message.selectedTexts) {
            console.log("Displaying selected texts:", message.selectedTexts);
            message.selectedTexts.forEach(text => {
                messageEl.createEl("p", { text: `Selected Text: ${text.content.substring(0, 100)}...` });
            });
        }

        messageEl.createEl("p", { text: message.content });
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    displayImage(container: HTMLElement, base64Data: string) {
        console.log("Displaying image with base64 data:", base64Data.substring(0, 50) + "...");
        const imageContainer = container.createEl("div", { cls: "attached-image-container" });
        const img = imageContainer.createEl("img", {
            cls: "attached-image",
            attr: { src: `data:image/png;base64,${base64Data}` }
        });
        img.style.maxWidth = "200px";
        img.style.maxHeight = "200px";
        img.onerror = () => console.error("Failed to load image");
        img.onload = () => console.log("Image loaded successfully");
    }

    async convertToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    async updateIndices() {
        try {
            const response = await fetch(`${this.plugin.settings.serverAddress}/get_indices`);
            const indices = await response.json();

            const currentValue = this.indexSelect.value;

            this.indexSelect.empty();

            this.indexSelect.createEl("option", {
                value: "universal",
                text: "universal"
            });

            indices.forEach((index: string) => {
                this.indexSelect.createEl("option", {
                    value: index,
                    text: index
                });
            });

            const options = [...new Set(Array.from(this.indexSelect.options))];
            const hasValue = options.some(option => option.value === currentValue);
            if (hasValue) {
                this.indexSelect.value = currentValue;
            } else {
                this.indexSelect.value = "universal";
            }

            console.log("Updated indices:", indices);
            console.log("Current selected value:", this.indexSelect.value);

        } catch (error) {
            console.error("Failed to fetch indices:", error);

            if (this.indexSelect.options.length === 0) {
                this.indexSelect.createEl("option", {
                    value: "universal",
                    text: "universal"
                });
            }
        }
    }
}
