import { ZoteroBridgeSettings, DEFAULT_SETTINGS as ZOTERO_BRIDGE_DEFAULT_SETTINGS } from './ZoteroBridgeSettings';
import { BibtexSettings, DEFAULT_SETTINGS as BIBTEX_DEFAULT_SETTINGS } from './BibtexSettings';

export interface PluginSettings {
    zoteroBridgeSettings: ZoteroBridgeSettings;
    bibtexSettings: BibtexSettings;
    templatePath: string;
    referenceNotesFolder: string;
    PDFFolder: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    templatePath: "",
    zoteroBridgeSettings: ZOTERO_BRIDGE_DEFAULT_SETTINGS,
    bibtexSettings: BIBTEX_DEFAULT_SETTINGS,
    referenceNotesFolder: "",
    PDFFolder: "",
}
