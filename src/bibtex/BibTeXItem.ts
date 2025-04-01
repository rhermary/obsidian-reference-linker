import { sprintf } from 'sprintf-js'

import { titleWords, normalizeName, stripQuotes } from '../zotero/utils'
import { Creator } from '../zotero/ZoteroItem'

export class BibTeXItem {
    key: string
    authors: Creator[] | null
    title: string | null
    year: string | null
    journal: string | null

    constructor(
        key: string,
        authors: string[] | null = null,
        title: string | null = null,
        year: string | null = null,
        journal: string | null = null
    ) {
        this.key = key;
        this.title = title;
        this.year = year;
        this.journal = journal;

        this.authors = authors?.map(authorName => ({
            creatorType: "author",
            name: authorName,
        })) || null;
    }

    getTitle() : string {
        return this.title || '';
    }

    cleanTitle() : string {
        return titleWords(
            this.title || "", { skipWords: false }
        ).join(' ');
    }

    getAuthors() : string {
        if (!this.authors) return '';

        return this.authors
            .map(creator => normalizeName(creator).fullName)
            .join(", ");
    }

    private authorsList(template: string): string[] {
        if (!this.authors) return [];

        return this.authors
            .map(normalizeName)
            .map(name => sprintf(template, {
                f: stripQuotes(name.lastName.split(' ').join('')),
            }))
    }
    
    firstAuthorFamilyName(n = 0): string {
        const family = n ? `%(f).${n}s` : '%(f)s';
        const authors = this.authorsList(family);

        return authors[0] || '';
    }

    getCiteKey() : string {
        return this.key
    }

    get raw(): object {
        return {
            ...this,
            date: this.year,
        };
    }
}
