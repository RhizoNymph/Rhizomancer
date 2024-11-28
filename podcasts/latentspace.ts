import { App, Modal, Notice, request } from 'obsidian';
import Rhizomancer from '../main';
import { parseString } from 'xml2js';
import { transcribeAudio } from '../util/whisper';

interface Episode {
    title: string;
    mp3Url: string;
    pubDate: string;
    link: string;
    description: string; // This will contain the transcript
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

        // Create header container
        const headerContainer = contentEl.createEl('div', { cls: 'header-container' });
        headerContainer.createEl('h1', { text: 'Latent Space Podcast Episodes' });

        // Add Process All button
        const processAllButton = headerContainer.createEl('button', {
            text: 'Process All Episodes',
            cls: 'process-all-button'
        });
        processAllButton.addEventListener('click', () => this.processAllEpisodes());

        await this.fetchEpisodes();

        this.episodes.forEach(episode => {
            const episodeContainer = contentEl.createEl('div', { cls: 'episode-container' });
            const processButton = episodeContainer.createEl('button', { text: 'Process Episode' });
            episodeContainer.createEl('span', { text: episode.title });

            processButton.addEventListener('click', async () => {
                await this.processEpisode(episode);
            });
        });
    }

    async fetchEpisodes() {
        const url = 'https://api.substack.com/feed/podcast/1084089.rss';
        try {
            const xml = await request({ url });
            const result = await this.parseXml(xml);
            this.episodes = this.extractEpisodes(result);
        } catch (error) {
            console.error('Failed to fetch episodes:', error);
            new Notice('Failed to fetch episodes.');
        }
    }

    parseXml(xml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            parseString(xml, (err: Error | null, result: any) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }

    extractEpisodes(result: any): Episode[] {
        if (!result.rss || !result.rss.channel || !Array.isArray(result.rss.channel)) {
            console.error('Unexpected RSS structure:', result);
            return [];
        }

        const channel = result.rss.channel[0];
        if (!channel.item || !Array.isArray(channel.item)) {
            console.error('No items found in the channel:', channel);
            return [];
        }

        return channel.item.map((item: any) => ({
            title: item.title ? item.title[0].replace(/\s#\d+/, '') : 'Unknown Title',
            mp3Url: item.enclosure ? item.enclosure[0].$.url : '',
            pubDate: item.pubDate ? item.pubDate[0] : '',
            link: item.link ? item.link[0] : '',
            description: item.description ? item.description[0] : ''
        }));
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
        console.log(`Starting to process episode: ${episode.title}`);
        new Notice(`Processing episode: ${episode.title}`);

        const sanitizedTitle = this.sanitizeFilename(episode.title);
        const basePath = 'Podcasts/Latent Space';

        // Ensure directory exists
        await this.ensureDirectoryExists(basePath);

        // Create markdown file with transcript from description
        const markdownPath = `${basePath}/${sanitizedTitle}.md`;
        const markdownContent = this.createMarkdownContent(episode);
        await this.app.vault.create(markdownPath, markdownContent);

        // Optionally download and transcribe audio
        if (this.plugin.settings.downloadAudio) {
            const mp3Path = `${basePath}/${sanitizedTitle}.mp3`;
            await this.downloadFile(episode.mp3Url, mp3Path);

            if (this.plugin.settings.transcribeAudio) {
                const transcription = await transcribeAudio(this.app, mp3Path, {
                    modelSize: 'large',
                    chunkLength: 60,
                    temperature: 0.2
                });

                // Append transcription to markdown file
                if (transcription) {
                    const updatedContent = markdownContent + '\n\n## AI Transcription\n\n' + transcription;
                    await this.app.vault.modify(
                        this.app.vault.getAbstractFileByPath(markdownPath) as TFile,
                        updatedContent
                    );
                }
            }
        }

        new Notice(`Finished processing episode: ${episode.title}`);
    }

    createMarkdownContent(episode: Episode): string {
        return `# ${episode.title}
Published: ${episode.pubDate}
Link: ${episode.link}

## Description/Transcript
${episode.description}`;
    }

    async downloadFile(url: string, filePath: string) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        await this.app.vault.adapter.writeBinary(filePath, buffer);
    }

    sanitizeFilename(filename: string): string {
        return filename.replace(/[\\/:*?"<>|]/g, '-');
    }

    async ensureDirectoryExists(path: string): Promise<void> {
        if (!(await this.app.vault.adapter.exists(path))) {
            await this.app.vault.createFolder(path);
        }
    }
}
