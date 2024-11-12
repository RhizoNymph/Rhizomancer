import { App, Modal, Setting } from 'obsidian';

export class IndexNameModal extends Modal {
    private indexName: string = 'universal';
    private onSubmit: (indexName: string) => void;

    constructor(app: App, onSubmit: (indexName: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Enter Index Name' });

        new Setting(contentEl)
            .setName('Index Name')
            .setDesc('Enter the name of the index to use')
            .addText((text) =>
                text
                    .setValue(this.indexName)
                    .onChange((value) => {
                        this.indexName = value;
                    })
                    .inputEl.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            this.onSubmit(this.indexName);
                            this.close();
                        }
                    })
            );

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Submit')
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(this.indexName);
                        this.close();
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => {
                        this.close();
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
