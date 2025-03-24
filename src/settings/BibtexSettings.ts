export interface BibtexSettings {
    exportedBibPath: string,
    force: boolean,
}

export const DEFAULT_SETTINGS: BibtexSettings = {
    exportedBibPath: "",
    force: false,
};
