import { App, Modal, Notice, request, TFile } from 'obsidian';
import Rhizomancer from '../main';
import { parseString } from 'xml2js';
import { transcribeAudio } from '../util/whisper';

interface Episode {
    number: string;
    title: string;
    mp3Url: string;
    pubDate: string;
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
        headerContainer.createEl('h1', { text: 'Flirting with Models Podcast Episodes' });

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
        const url = 'https://feeds.captivate.fm/flirting-with-models/';
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

        return channel.item.map((item: any, index: number) => {
            let rawTitle = item.title ? item.title[0] : 'Unknown Title';
            let title = rawTitle.replace(/^[Ss]\d+[Ee]\d+[\s-]*/, '').trim();

            const episode: Episode = {
                number: (channel.item.length - index).toString(),
                title: title,
                mp3Url: '',
                pubDate: item.pubDate ? item.pubDate[0] : ''
            };

            if (item.enclosure && Array.isArray(item.enclosure) && item.enclosure[0] && item.enclosure[0].$) {
                episode.mp3Url = item.enclosure[0].$.url;
            }

            return episode;
        });
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
        const mp3BasePath = 'Podcasts/Flirting with Models';
        const transcriptBasePath = 'Podcasts/Flirting with Models';

        await this.ensureDirectoryExists(mp3BasePath);
        await this.ensureDirectoryExists(transcriptBasePath);

        // Download MP3 using Obsidian's request
        const mp3Path = `${mp3BasePath}/${sanitizedTitle}.mp3`;
        try {
            const response = await request({
                url: episode.mp3Url,
                method: 'GET',
                headers: {
                    'Accept': 'audio/mpeg'
                }
            });

            // Convert the response to ArrayBuffer
            const buffer = await (async () => {
                const blob = new Blob([response]);
                return await blob.arrayBuffer();
            })();

            await this.app.vault.adapter.writeBinary(mp3Path, buffer);
            console.log('MP3 downloaded successfully');

            // Continue with transcription
            const transcriptPath = `${transcriptBasePath}/${sanitizedTitle}.md`;
            try {
                const transcriptionResult = await transcribeAudio(this.app, mp3Path, {
                    modelSize: 'large',
                    chunkLength: 60,
                    temperature: 0.2
                });

                if (transcriptionResult) {
                    const markdownContent = `# ${episode.title}\nPublished: ${episode.pubDate}\n\n${transcriptionResult}`;
                    await this.app.vault.create(transcriptPath, markdownContent);
                    console.log(`Markdown file created at: ${transcriptPath}`);
                }
            } catch (error) {
                console.error('Error during transcription:', error);
                new Notice(`Failed to transcribe episode: ${error.message}`);
            }
        } catch (error) {
            console.error('Error downloading MP3:', error);
            new Notice(`Failed to download MP3: ${error.message}`);
        }

        new Notice(`Finished processing episode: ${episode.title}`);
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
