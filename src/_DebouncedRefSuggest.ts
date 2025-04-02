import { App, SuggestModal, debounce, Debouncer } from 'obsidian';
import { ZoteroItem } from './zotero/ZoteroItem';
import { BibTeXItem } from './bibtex/BibTeXItem';
import { ReferenceLinker } from './ReferenceLinker';
import { ZoteroAdapter } from './zotero/ZoteroAdapter';
import { BibtexAdapter } from './bibtex/BibtexAdapter';
import Fuse from 'fuse.js'

// Debouncer implementation from https://github.com/joethei/obsidian-calibre/blob/master/src/modals/BookSuggestModal.ts#L56

type RefItem = ZoteroItem | BibTeXItem

export abstract class _DebouncedRefSuggest extends SuggestModal<RefItem> {
    plugin: ReferenceLinker
    referencedFiles : RefItem[] = []
    _fuse: Fuse<RefItem> | null = null
    
	private _query: string;
	private _results: RefItem[] = [];
	private readonly _debouncedSearch: Debouncer<[string], void>;

    constructor(app: App, plugin: ReferenceLinker) {
        super(app);
        this.plugin = plugin
        
        this._debouncedSearch = debounce(this.updateSearchResults, 700);
        this._query = "";

        app.workspace.onLayoutReady(() => this.listReferencedFiles());
    }

    private listReferencedFiles() {
        const folderPath = this.plugin.settings.referenceNotesFolder;
        const files = this.app.vault.getFiles().filter(file => file.path.startsWith(folderPath));

        this.referencedFiles = files.map(file => {
            const metadata = this.app.metadataCache.getCache(file.path)?.frontmatter;
            if (metadata) {
                return new BibTeXItem(
                    metadata.citeKey || "",
                    metadata.authors ? metadata.authors.split(",") : [],
                    metadata.title || "",
                    metadata.year || "",
                    metadata.journal || ""
                )
            }
            
            return null;
        }).filter((item): item is BibTeXItem => item !== null);
    }

    filteredReferencedFiles(query: string) : RefItem[] {
        if (this._fuse == null) {
            this._fuse = new Fuse(this.referencedFiles, {
                keys: [
                    "title",
                    "authors.name",
                    "year",
                    "journal",
                    "key",
                ],
                ignoreLocation: true,
                threshold: .2,
                useExtendedSearch: true,
            });
        }

        return this._fuse.search(query).map(result => result.item).slice(0, 10);
    }

    async getSuggestions_(query: string): Promise<RefItem[]> {
        let adapter : ZoteroAdapter | BibtexAdapter = this.plugin.zoteroAdapter;
        if (this.plugin.bibtexAdapter.settings.force) {
            adapter = this.plugin.bibtexAdapter;
        }

        return adapter.searchEverything(query)
            .then((items) => {
                if (items.length == 0) {
                    return this.filteredReferencedFiles(query);
                } else {
                    return items;
                }
            })
            .then((items: RefItem[]) =>
                Object.fromEntries(items.map(x => [x.getCiteKey(), x]))
            )
            .then((items) => Object.values(items));
    }

    async updateSearchResults(query: string) {
		if(query === this._query) {
            return
        }
        
        this._query = query;

        this._results = await this.getSuggestions_(query);

        //@ts-ignore
        this.updateSuggestions();
    }

    onOpen() {
        const { inputEl } = this;

        inputEl.empty();
    }

    onClose() {
        const { inputEl } = this;
        inputEl.empty();
    }

    renderSuggestion(reference: RefItem, el: HTMLElement) {
        el.createEl("div", { text: reference.getTitle() });
        el.createEl("small", { text: reference.getAuthors() });
    }

	async getSuggestions(query: string): Promise<RefItem[]> {
		this._debouncedSearch(query);
		return this._results;
	}

    newFilePath(citeKey: string) : string {
        return `${this.plugin.settings.referenceNotesFolder}/${citeKey}.md`
    }
    
    fileExists(newFilePath: string) : boolean {
        return this.app.vault.getFiles().filter(
            file => file.path == newFilePath
        ).length > 0
    }
}
