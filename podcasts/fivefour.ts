import { App, Modal, Notice, request } from 'obsidian';
import Rhizomancer from '../main';

interface Episode {
    number: string;
    title: string;
    transcriptUrl?: string;
}

export class EpisodeListModal extends Modal {
    plugin: Rhizomancer;
    episodes: Episode[] = [];

    constructor(app: App, plugin: Rhizomancer) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Create header
        const headerContainer = contentEl.createEl('div', { cls: 'header-container' });
        headerContainer.createEl('h1', { text: '5-4 Podcast Episodes' });

        // Add Process All button
        const processAllButton = headerContainer.createEl('button', {
            text: 'Process All Episodes',
            cls: 'process-all-button'
        });
        processAllButton.addEventListener('click', () => this.processAllEpisodes());

        await this.fetchEpisodes();

        // Create episode list
        this.episodes.forEach(episode => {
            const episodeContainer = contentEl.createEl('div', { cls: 'episode-container' });
            const processButton = episodeContainer.createEl('button', { text: 'Process Episode' });
            episodeContainer.createEl('span', {
                text: `${episode.number}: ${episode.title} ${episode.transcriptUrl ? '(Has Transcript)' : '(No Transcript)'}`
            });

            processButton.addEventListener('click', async () => {
                await this.processEpisode(episode);
            });
        });
    }

    async fetchEpisodes() {
        try {
            const response = await fetch('https://www.fivefourpod.com/');
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Find all collapsible divs (episode headers)
            const episodeElements = doc.querySelectorAll('.collapsible');

            this.episodes = Array.from(episodeElements).map(episodeEl => {
                const contentEl = episodeEl.nextElementSibling as HTMLElement;

                // Extract episode number
                const numberEl = episodeEl.querySelector('a[style*="float:right"]');
                const number = numberEl ? numberEl.textContent?.trim() : '';

                // Extract title
                const title = episodeEl.textContent?.replace(number || '', '').trim() || '';

                // Get transcript link
                const transcriptLink = contentEl?.querySelector('.transcript-wrapper a');
                const transcriptUrl = transcriptLink?.getAttribute('href');

                // Convert relative URL to absolute
                const fullTranscriptUrl = transcriptUrl ?
                    `https://www.fivefourpod.com${transcriptUrl}` : undefined;

                return {
                    number,
                    title,
                    transcriptUrl: fullTranscriptUrl
                };
            });

            console.log('Found episodes:', this.episodes);

        } catch (error) {
            console.error('Failed to fetch episodes:', error);
            new Notice('Failed to fetch episodes');
        }
    }

    async processAllEpisodes() {
        new Notice('Starting to process all episodes...');

        for (const episode of this.episodes) {
            try {
                await this.processEpisode(episode);
            } catch (error) {
                console.error(`Failed to process episode ${episode.title}:`, error);
                new Notice(`Failed to process episode ${episode.title}`);
            }
        }

        new Notice('Finished processing all episodes');
    }

    async processEpisode(episode: Episode) {
        if (!episode.transcriptUrl) {
            new Notice(`No transcript URL for episode: ${episode.title}`);
            return;
        }

        console.log(`Processing episode: ${episode.title}`);
        new Notice(`Processing episode: ${episode.title}`);

        const sanitizedTitle = this.sanitizeFilename(episode.title);
        const transcriptPath = `Podcasts/5-4/${sanitizedTitle}.md`;

        // Ensure directory exists
        await this.ensureDirectoryExists('Podcasts/5-4');

        // Check if transcript already exists
        if (await this.app.vault.adapter.exists(transcriptPath)) {
            console.log(`Transcript already exists for: ${episode.title}`);
            new Notice(`Transcript already exists for: ${episode.title}`);
            return;
        }

        try {
            const transcriptContent = await this.downloadTranscript(episode.transcriptUrl);
            const markdownContent = `# ${episode.title}\n\n${transcriptContent}`;
            await this.app.vault.create(transcriptPath, markdownContent);
            new Notice(`Successfully processed: ${episode.title}`);
        } catch (error) {
            console.error(`Failed to process transcript for ${episode.title}:`, error);
            new Notice(`Failed to process transcript for ${episode.title}`);
            throw error;
        }
    }

    async downloadTranscript(url: string): Promise<string> {
        const response = await fetch(url);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find the transcript content in the page-section
        const transcriptSection = doc.querySelector('.page-section');
        if (!transcriptSection) {
            throw new Error('Could not find transcript section');
        }

        // Extract all paragraphs from the transcript
        const paragraphs = transcriptSection.querySelectorAll('p');
        const transcriptText = Array.from(paragraphs)
            .map(p => p.textContent?.trim())
            .filter(text => text && text.length > 0)
            .join('\n\n');

        return transcriptText;
    }

    sanitizeFilename(filename: string): string {
        return filename.replace(/[\\/:*?"<>|]/g, '-');
    }

    async ensureDirectoryExists(path: string): Promise<void> {
        const dirs = path.split('/');
        let currentPath = '';

        for (const dir of dirs) {
            currentPath += dir + '/';
            if (!(await this.app.vault.adapter.exists(currentPath))) {
                await this.app.vault.createFolder(currentPath);
            }
        }
    }
}
