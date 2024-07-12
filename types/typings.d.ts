declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module 'create-desktop-shortcuts' {
  export interface ShortcutOptions {
    onlyCurrentOS?: boolean;
    verbose?: boolean;
    customLogger?: (message: string, error: object) => void;
    windows?: {
      filePath: string;
      outputPath?: string;
      name?: string;
      comment?: string;
      icon?: string;
      arguments?: string;
      windowMode?: 'normal' | 'minimized' | 'maximized';
      hotkey?: string;
      VBScriptPath?: string;
    };
    linux?: {
      filePath: string;
      outputPath?: string;
      name?: string;
      description?: string;
      icon?: string;
      type?: 'Application' | 'Directory' | 'Link';
      terminal?: boolean;
      chmod?: boolean;
      arguments?: string;
    };
    osx?: {
      filePath: string;
      outputPath?: string;
      name?: string;
      overwrite?: boolean;
    };
  }

  function createDesktopShortcut(options: ShortcutOptions): boolean;

  export = createDesktopShortcut;
}
