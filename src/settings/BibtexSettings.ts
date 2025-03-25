export interface BibtexSettings {
    bibFolder: string,
    force: boolean,
}

export const DEFAULT_SETTINGS: BibtexSettings = {
    bibFolder: "",
    force: false,
};
