import { BibtexSettings } from "../settings/BibtexSettings";
import { Notice, App, TFolder, TFile} from "obsidian";
import { BibTeXItem } from "./BibTeXItem"

import Fuse from 'fuse.js';

export class BibtexAdapter {
    settings: BibtexSettings
    refs: BibTeXItem[]
    _fuse: Fuse<BibTeXItem> | null = null

    constructor(settings: BibtexSettings, app: App) {
        this.settings = settings;
        this.refs = [];

        app.workspace.onLayoutReady(() => this.loadReferences(app));
    }

    private loadReferences(app: App) {
        const folder = app.vault.getAbstractFileByPath(this.settings.bibFolder);
        
        if (folder == null || !(folder instanceof TFolder)) {
            new Notice(`Invalid reference folder path \`${this.settings.bibFolder}\`.`);
            return;
        }

        const promises = folder.children
            .filter(file => file instanceof TFile)
            .map(file => app.vault.read(file as TFile));

        Promise.all(promises).then(contents => {
            contents.map(content => {
                const regex = /@article\{[^}]+\}([\s\S]*?)(?=@article\{|$)/g;
                    
                const regexKey = /@article\{([^,]+),/;
                const regexAuthors = /author\s*=\s*\{([^}]*)\}/;
                const regexTitle = /title\s*=\s*\{([^}]*)\}/;
                const regexYear = /year\s*=\s*\{\s*(\d{4})\s*\}/;
                const regexJournal = /journal\s*=\s*\{([^}]*)\}/;

                let match;
                while ((match = regex.exec(content)) !== null) {
                    const key = match[0].match(regexKey);
                    const authors = match[0].match(regexAuthors);
                    const title = match[0].match(regexTitle);
                    const year = match[0].match(regexYear);
                    const journal = match[0].match(regexJournal);

                    if (key == null) {
                        continue;
                    }

                    const entry = new BibTeXItem(
                        key[1],
                        authors ? authors[1].trim().split(' and ') : null,
                        title ? title[1].trim() : null,
                        year ? year[1].trim() : null,
                        journal ? journal[1].trim() : null,
                    );

                    this.refs.push(entry);
                }
            })

            new Notice(`Loaded ${this.refs.length} BibTeX items.`);
        }).catch(error => {
            console.error("Error reading files:", error);
        });
    }

    public async searchEverything(query: string) : Promise<BibTeXItem[]> {
        if (this._fuse == null) {
            this._fuse = new Fuse(this.refs, {
                keys: [
                    "title",
                    "authors.name",
                    "year",
                    "journal",
                    "key",
                ],
                ignoreLocation: true,
                threshold: .2,
            });
        }

        return this._fuse.search(query).map(result => result.item).slice(0, 10);
    }
}