import { App, TFile, Notice } from 'obsidian';

interface EpisodeComponents {
    baseTitle: string;
    displayTitle: string;
    audioFile?: TFile;
    transcriptFile?: TFile;
    summaryFile?: TFile;
}

function stripBrackets(title: string): string {
    return title.replace(/[\[\]]/g, '');
}

export async function addMissingEpisodes(app: App) {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice('No active file');
        return;
    }

    const currentFolder = activeFile.parent;
    if (!currentFolder) {
        new Notice('Current file is not in a folder');
        return;
    }

    // Get all files in the current directory
    const files = app.vault.getFiles().filter(file => file.parent === currentFolder);
    if (!files.length) {
        new Notice('No files found in current directory');
        return;
    }

    // Group files by their base name
    const episodeGroups = new Map<string, EpisodeComponents>();

    files.forEach((file) => {
        // Determine if this is a summary file
        const isSummary = file.basename.endsWith(' - Summary');
        // Get base title by removing ' - Summary' if present
        let displayTitle = isSummary ? file.basename.slice(0, -9) : file.basename;
        let baseTitle = stripBrackets(displayTitle);

        // Get or create group
        let group = episodeGroups.get(baseTitle) || {
            baseTitle: baseTitle,
            displayTitle: displayTitle,
        };

        // Categorize the file
        if (file.extension === 'wav' || file.extension === 'mp3') {
            group.audioFile = file;
        } else if (file.extension === 'md') {
            if (isSummary) {
                group.summaryFile = file;
            } else {
                group.transcriptFile = file;
            }
        }

        episodeGroups.set(baseTitle, group);
    });

    // Get current file content
    const currentContent = await app.vault.read(activeFile);
    const lines = currentContent.split('\n');

    // Find the Episodes section
    let episodesIndex = lines.findIndex(line => line.trim() === 'Episodes:');
    if (episodesIndex === -1) {
        new Notice('No Episodes section found in the overview file');
        return;
    }

    // Get existing episodes to avoid duplicates
    const existingEpisodes = new Set<string>();
    for (let i = episodesIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('- ')) {
            const title = stripBrackets(line.slice(2).split('\n')[0]);
            existingEpisodes.add(title);
        } else if (line.startsWith('#') || (line !== '' && !line.startsWith('  '))) {
            break;
        }
    }

    // Build new episodes entries
    let newContent = '';
    let addedCount = 0;

    episodeGroups.forEach((group) => {
        // Only process if not already in the list and has at least one component
        if (!existingEpisodes.has(group.baseTitle) &&
            (group.audioFile || group.transcriptFile || group.summaryFile)) {
            newContent += `- ${group.displayTitle}\n`;

            if (group.audioFile) {
                newContent += `  - Audio: [[${group.audioFile.basename}]]\n`;
            }
            if (group.transcriptFile) {
                newContent += `  - Transcript: [[${group.transcriptFile.basename}]]\n`;
            }
            if (group.summaryFile) {
                newContent += `  - Summary: [[${group.summaryFile.basename}]]\n`;
            }

            newContent += '\n';
            addedCount++;
        }
    });

    if (newContent) {
        // Insert new content after the Episodes section
        lines.splice(episodesIndex + 1, 0, newContent);
        const updatedContent = lines.join('\n');
        await app.vault.modify(activeFile, updatedContent);
        new Notice(`Added ${addedCount} new episodes to the overview`);
    } else {
        new Notice('No new episodes to add');
    }
}
