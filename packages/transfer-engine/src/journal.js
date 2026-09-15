const inMemoryStore = new Map();

export class TransferJournal {
  static getJournalPath(partFilePath) {
    return `${partFilePath}.transfer.json`;
  }

  static async saveJournal(partFilePath, metadata) {
    const journalPath = this.getJournalPath(partFilePath);
    const data = {
      ...metadata,
      updatedAt: new Date().toISOString()
    };
    if (typeof window === 'undefined') {
      try {
        const modName = 'fs';
        const fsModule = await import(/* @vite-ignore */ modName);
        if (fsModule && fsModule.promises) {
          await fsModule.promises.writeFile(journalPath, JSON.stringify(data, null, 2), 'utf-8');
          return;
        }
      } catch {}
    }
    inMemoryStore.set(journalPath, JSON.stringify(data));
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(journalPath, JSON.stringify(data)); } catch {}
    }
  }

  static async readJournal(partFilePath) {
    const journalPath = this.getJournalPath(partFilePath);
    if (typeof window === 'undefined') {
      try {
        const modName = 'fs';
        const fsModule = await import(/* @vite-ignore */ modName);
        if (fsModule && fsModule.promises) {
          const content = await fsModule.promises.readFile(journalPath, 'utf-8');
          return JSON.parse(content);
        }
      } catch {}
    }
    const content = inMemoryStore.get(journalPath) || (typeof localStorage !== 'undefined' ? localStorage.getItem(journalPath) : null);
    return content ? JSON.parse(content) : null;
  }

  static async deleteJournal(partFilePath) {
    const journalPath = this.getJournalPath(partFilePath);
    if (typeof window === 'undefined') {
      try {
        const modName = 'fs';
        const fsModule = await import(/* @vite-ignore */ modName);
        if (fsModule && fsModule.promises) {
          await fsModule.promises.unlink(journalPath);
          return;
        }
      } catch {}
    }
    inMemoryStore.delete(journalPath);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(journalPath); } catch {}
    }
  }
}
