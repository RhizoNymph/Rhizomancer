import { App, Plugin, Modal, ItemView, TFile, TFolder, TAbstractFile, MarkdownView, WorkspaceLeaf } from 'obsidian';

export class SearchResultsModal extends Modal {
    results: { images: any[], texts: any[] };
    onSubmit: (selectedImages: any[], selectedTexts: any[]) => void;

    constructor(app: App, results: { images: any[], texts: any[] }, onSubmit: (selectedImages: any[], selectedTexts: any[]) => void) {
        super(app);
        this.results = results;
        this.onSubmit = onSubmit;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.style.display = 'flex';
        contentEl.style.flexDirection = 'column';
        contentEl.style.height = '90vh';
        contentEl.style.width = '90vw';
        this.modalEl.style.width = '90vw';
        this.modalEl.style.maxWidth = '90vw';

        const header = contentEl.createDiv({ cls: 'modal-header' });
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.backgroundColor = 'var(--background-primary)';
        header.style.zIndex = '1';
        header.style.padding = '10px';
        header.style.borderBottom = '1px solid var(--background-modifier-border)';

        header.createEl('h2', { text: 'RAG Results' });

        const tabContainer = header.createDiv({ cls: 'tab-container' });
        const imagesTabButton = tabContainer.createEl('button', { text: 'Images' });
        const textsTabButton = tabContainer.createEl('button', { text: 'Texts' });

        const contentArea = contentEl.createDiv({ cls: 'modal-content' });
        contentArea.style.flex = '1';
        contentArea.style.overflow = 'auto';
        contentArea.style.padding = '10px';

        const imagesContent = contentArea.createDiv({ cls: 'tab-content' });
        const textsContent = contentArea.createDiv({ cls: 'tab-content' });

        textsContent.style.display = 'none';

        imagesTabButton.onclick = () => {
            imagesContent.style.display = 'block';
            textsContent.style.display = 'none';
            imagesTabButton.classList.add('active');
            textsTabButton.classList.remove('active');
        };

        textsTabButton.onclick = () => {
            imagesContent.style.display = 'none';
            textsContent.style.display = 'block';
            textsTabButton.classList.add('active');
            imagesTabButton.classList.remove('active');
        };

        this.createImagesContent(imagesContent);

        this.createTextsContent(textsContent);

        const footer = contentEl.createDiv({ cls: 'modal-footer' });
        footer.style.position = 'sticky';
        footer.style.bottom = '0';
        footer.style.backgroundColor = 'var(--background-primary)';
        footer.style.zIndex = '1';
        footer.style.padding = '10px';
        footer.style.borderTop = '1px solid var(--background-modifier-border)';

        const submitButton = footer.createEl('button', { text: 'Submit' });
        submitButton.style.width = '100%';
        submitButton.onclick = () => {
            const selectedImages = Array.from(imagesContent.querySelectorAll('input[type="checkbox"]:checked'))
                .map((checkbox, index) => this.results.images[index]);
            const selectedTexts = Array.from(textsContent.querySelectorAll('input[type="checkbox"]:checked'))
                .map((checkbox, index) => this.results.texts[index]);
            this.onSubmit(selectedImages, selectedTexts);
            this.close();
        };

        imagesTabButton.click();
    }

        createImagesContent(container: HTMLElement) {
            const imageGrid = container.createDiv({ cls: 'image-grid' });
            imageGrid.style.display = 'grid';
            imageGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
            imageGrid.style.gap = '15px';

            this.results.images.forEach((image, index) => {
                const wrapper = imageGrid.createDiv({ cls: 'image-wrapper' });
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'center';
                wrapper.style.border = '1px solid #ccc';
                wrapper.style.padding = '15px';
                wrapper.style.borderRadius = '5px';

                if (image.base64) {
                    const img = wrapper.createEl('img', {
                        attr: {
                            src: `data:image/png;base64,${image.base64}`,
                            style: 'width: 100%; height: 380px; object-fit: contain;'
                        }
                    });
                    img.onerror = () => console.error(`Failed to load image ${index}`);
                    img.onload = () => console.log(`Image ${index} loaded successfully`);
                } else {
                    console.error(`No base64 data for image ${index}`);
                    wrapper.createEl('span', { text: 'Image data not available' });
                }

                const checkbox = wrapper.createEl('input', { type: 'checkbox', attr: { checked: true } });

                const metadataDiv = wrapper.createEl('div', { cls: 'image-metadata' });
                metadataDiv.style.marginTop = '10px';
                metadataDiv.style.textAlign = 'left';
                metadataDiv.style.width = '100%';
                metadataDiv.style.fontSize = '0.9em';

                metadataDiv.createEl('p', { text: `Title: ${image.title}` }).style.margin = '2px 0';
                metadataDiv.createEl('p', { text: `Authors: ${image.authors}` }).style.margin = '2px 0';
                metadataDiv.createEl('p', { text: `Filename: ${image.filename}` }).style.margin = '2px 0';
                metadataDiv.createEl('p', { text: `Page: ${image.page_num}` }).style.margin = '2px 0';
            });
        }

        createTextsContent(container: HTMLElement) {
            const textGrid = container.createDiv({ cls: 'text-grid' });
            textGrid.style.display = 'grid';
            textGrid.style.gridTemplateColumns = '1fr';
            textGrid.style.gap = '15px';

            // Sort texts by score
            const sortedTexts = [...this.results.texts].sort((a, b) => b.score - a.score);

            sortedTexts.forEach((text, index) => {
                const wrapper = textGrid.createDiv({ cls: 'text-wrapper' });
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.border = '1px solid #ccc';
                wrapper.style.padding = '15px';
                wrapper.style.borderRadius = '5px';

                const checkbox = wrapper.createEl('input', { type: 'checkbox', attr: { checked: true } });

                // Add score display
                const scoreEl = wrapper.createEl('p', {
                    text: `Relevance Score: ${text.score.toFixed(2)}`,
                    cls: 'metadata-score'
                });
                scoreEl.style.fontWeight = 'bold';
                scoreEl.style.color = 'var(--text-accent)';
                scoreEl.style.margin = '5px 0';

                // Add content preview
                const textPreview = wrapper.createEl('p', {
                    text: text.content,
                    cls: 'text-preview'
                });
                textPreview.style.margin = '10px 0';
                textPreview.style.lineHeight = '1.4';
                textPreview.style.maxHeight = '150px';
                textPreview.style.overflow = 'auto';
                textPreview.style.backgroundColor = 'var(--background-secondary)';
                textPreview.style.padding = '10px';
                textPreview.style.borderRadius = '5px';

                const metadataDiv = wrapper.createEl('div', { cls: 'text-metadata' });
                metadataDiv.style.marginTop = '10px';
                metadataDiv.style.textAlign = 'left';

                metadataDiv.createEl('p', { text: `Title: ${text.title}` });
                metadataDiv.createEl('p', { text: `Authors: ${text.authors}` });
                metadataDiv.createEl('p', { text: `Filename: ${text.filename}` });
            });
        }
}
