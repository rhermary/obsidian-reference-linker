import { App, SuggestModal, debounce, Debouncer } from 'obsidian';
import { ZoteroItem } from './zotero/ZoteroItem';
import { BibTeXItem } from './bibtex/BibTeXItem';

// Debouncer implementation from https://github.com/joethei/obsidian-calibre/blob/master/src/modals/BookSuggestModal.ts#L56

type RefItem = ZoteroItem | BibTeXItem 

export abstract class _DebouncedSuggest extends SuggestModal<RefItem> {
    
	private _query: string;
	private _results: RefItem[] = [];
	private readonly _debouncedSearch: Debouncer<[string], void>;

    constructor(app: App) {
        super(app);
        
        this._debouncedSearch = debounce(this.updateSearchResults, 700);
        this._query = "";
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

	async getSuggestions(query: string): Promise<RefItem[]> {
		this._debouncedSearch(query);
		return this._results;
	}

    abstract getSuggestions_(query: string) : Promise<RefItem[]>;
}
