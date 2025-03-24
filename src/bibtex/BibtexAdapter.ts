import { BibtexSettings } from "../settings/BibtexSettings";
import * as fs from 'fs';
import { Notice, App } from "obsidian";
import { BibTeXItem } from "./BibTeXItem"

import Fuse from 'fuse.js';

export class BibtexAdapter {
    settings: BibtexSettings
    refs: BibTeXItem[]
    _fuse: Fuse<BibTeXItem> | null = null

    constructor(settings: BibtexSettings, app: App) {
        this.settings = settings;

        const file = app.vault.getAbstractFileByPath(this.settings.exportedBibPath)
        if (file != null) {
            const vaultRoot = (app.vault.adapter as any).basePath;
            const absolutePath = `${vaultRoot}/${file.path}`;
            const content = fs.readFileSync(absolutePath, "utf8")

            const regex = /@article\{[^}]+\}([\s\S]*?)(?=@article\{|$)/g;
            
            const regexKey = /@article\{([^,]+),/;
            const regexAuthors = /author\s*=\s*\{([^}]*)\}/;
            const regexTitle = /title\s*=\s*\{([^}]*)\}/;
            const regexYear = /year\s*=\s*\{\s*(\d{4})\s*\}/;
            const regexJournal = /journal\s*=\s*\{([^}]*)\}/;

            this.refs = [];
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
        } else {
            new Notice(`Could not read BibTeX file \`${this.settings.exportedBibPath}\`.`)
            this.refs = []
        }

        new Notice(`Loaded ${this.refs?.length} BibTeX items.`)
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