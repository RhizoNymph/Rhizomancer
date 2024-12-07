import { App, Modal, Notice, Setting } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import Rhizomancer from '../main';

const execAsync = promisify(exec);

export class YtPlaylistModal extends Modal {
    plugin: Rhizomancer;
    playlistUrl: string = '';
    customTitle: string = '';

    constructor(app: App, plugin: Rhizomancer) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Create header
        contentEl.createEl('h1', { text: 'Download YouTube Playlist' });

        // Create URL input field
        new Setting(contentEl)
            .setName('Playlist URL')
            .setDesc('Enter the YouTube playlist URL')
            .addText(text => text
                .setValue(this.playlistUrl)
                .onChange(value => this.playlistUrl = value));

        // Create custom title input field
        new Setting(contentEl)
            .setName('Directory Name (Optional)')
            .setDesc('Enter a custom name for the directory, or leave empty to use playlist title')
            .addText(text => text
                .setValue(this.customTitle)
                .setPlaceholder('Optional custom directory name')
                .onChange(value => this.customTitle = value));

        // Create download button
        const downloadButton = contentEl.createEl('button', {
            text: 'Download Playlist',
            cls: 'mod-cta'
        });

        downloadButton.addEventListener('click', () => this.downloadPlaylist());
    }

    async downloadPlaylist() {
        if (!this.playlistUrl) {
            new Notice('Please enter a playlist URL');
            return;
        }

        const notice = new Notice('Starting playlist download...', 0);

        try {
            // Ensure the Videos directory exists
            const baseDir = 'Videos';
            await this.ensureDirectoryExists(baseDir);

            let directoryName: string;

            if (this.customTitle) {
                directoryName = this.sanitizeFilename(this.customTitle.trim());
            } else {
                // Get the playlist title if no custom title is provided
                const { stdout: playlistTitle } = await execAsync(
                    `yt-dlp --get-filename -o "%(playlist_title)s" "${this.playlistUrl}"`
                );
                directoryName = this.sanitizeFilename(playlistTitle.trim());
            }

            const playlistDir = `${baseDir}/${directoryName}`;
            await this.ensureDirectoryExists(playlistDir);

            // Create archive file path in the playlist directory
            const archiveFile = `${playlistDir}/archive.txt`;

            // Construct yt-dlp command
            const command = [
                'yt-dlp',
                '--download-archive',
                `"${archiveFile}"`,
                '-o',
                `"${playlistDir}/%(title)s.%(ext)s"`,
                '--restrict-filenames',
                this.playlistUrl
            ].join(' ');

            const { stdout, stderr } = await execAsync(command);

            console.log('Download output:', stdout);
            if (stderr) console.error('Download errors:', stderr);

            notice.hide();
            new Notice('Playlist download completed!');

        } catch (error) {
            notice.hide();
            console.error('Download error:', error);
            new Notice(`Failed to download playlist: ${error.message}`);
        }
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

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
