import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileObj, ViewMode } from './types';
import { generateId, cn } from './lib/utils';
import { Sidebar } from './components/Sidebar';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { Button } from './components/ui/Button';
import { 
    Save, 
    Columns, 
    Eye, 
    Edit3, 
    Menu,
    Download
} from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<FileObj[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Load state from local storage on mount
  useEffect(() => {
    const savedFiles = localStorage.getItem('obsidian-clone-files');
    const savedActiveId = localStorage.getItem('obsidian-clone-active-id');
    
    if (savedFiles) {
        try {
            // Note: We cannot persist FileSystemHandles in localStorage.
            // They will be undefined after reload.
            // A real PWA would use IndexedDB for handles.
            // Here we just restore content.
            const parsed = JSON.parse(savedFiles) as FileObj[];
            // Reset handles to undefined as they are not serializable
            const sanitized = parsed.map(f => ({...f, handle: undefined}));
            setFiles(sanitized);
        } catch (e) {
            console.error("Failed to load files", e);
        }
    }
    
    if (savedActiveId) {
        setActiveFileId(savedActiveId);
    } else if (savedFiles) {
        // If files exist but no active ID, set first one
        const parsed = JSON.parse(savedFiles);
        if (parsed.length > 0) setActiveFileId(parsed[0].id);
    } else {
        // Init with a welcome file
        createNewFile("Welcome.md", "# Welcome to Obsidian Clone\n\nStart typing to create your notes.\n\n- [x] Supports Markdown\n- [x] Local File System Access\n- [x] Live Preview");
    }
  }, []);

  // Save state to local storage whenever files change
  useEffect(() => {
    if (files.length > 0) {
        // Strip handles before saving to localStorage
        const filesToSave = files.map(({ handle, ...rest }) => rest);
        localStorage.setItem('obsidian-clone-files', JSON.stringify(filesToSave));
    }
    if (activeFileId) {
        localStorage.setItem('obsidian-clone-active-id', activeFileId);
    }
  }, [files, activeFileId]);

  const activeFile = files.find(f => f.id === activeFileId);

  const createNewFile = (name = "Untitled.md", content = "") => {
    const newFile: FileObj = {
      id: generateId(),
      name,
      content,
      isDirty: true,
      handle: undefined
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const updateFileContent = (newContent: string) => {
    if (!activeFileId) return;
    setFiles(prev => prev.map(f => 
        f.id === activeFileId 
            ? { ...f, content: newContent, isDirty: true } 
            : f
    ));
  };

  const handleOpenFile = async () => {
    try {
      if (!window.showOpenFilePicker) {
        alert("Your browser does not support the File System Access API.");
        return;
      }
      
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [{
          description: 'Markdown Files',
          accept: { 'text/markdown': ['.md', '.markdown'] }
        }]
      });

      const newFiles: FileObj[] = [];
      
      for (const handle of handles) {
        const file = await handle.getFile();
        const text = await file.text();
        newFiles.push({
            id: generateId(),
            name: file.name,
            content: text,
            handle: handle,
            isDirty: false
        });
      }

      setFiles(prev => [...prev, ...newFiles]);
      if (newFiles.length > 0) {
          setActiveFileId(newFiles[0].id);
      }

    } catch (err) {
      console.error("Error opening file:", err);
    }
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;

    try {
        let handle = activeFile.handle;

        // If no handle (newly created in app), ask where to save
        if (!handle) {
            handle = await window.showSaveFilePicker({
                suggestedName: activeFile.name,
                types: [{
                    description: 'Markdown File',
                    accept: { 'text/markdown': ['.md'] }
                }]
            });
        }

        if (handle) {
            const writable = await handle.createWritable();
            await writable.write(activeFile.content);
            await writable.close();
            
            // Update state
            setFiles(prev => prev.map(f => 
                f.id === activeFile.id 
                    ? { ...f, handle: handle, name: handle!.name, isDirty: false } 
                    : f
            ));
        }
    } catch (err) {
        console.error("Error saving file:", err);
    }
  };
  
  // Fake download for browsers without File System Access API
  const handleDownload = () => {
      if (!activeFile) return;
      const element = document.createElement("a");
      const file = new Blob([activeFile.content], {type: 'text/markdown'});
      element.href = URL.createObjectURL(file);
      element.download = activeFile.name;
      document.body.appendChild(element); // Required for this to work in FireFox
      element.click();
      document.body.removeChild(element);
  };

  const closeFile = (id: string) => {
      const file = files.find(f => f.id === id);
      if (file?.isDirty) {
          if(!confirm(`Save changes to ${file.name} before closing?`)) {
              // If user cancels closing (wants to keep working), just return.
              // If user says "No" (don't save), actually we usually just close. 
              // But standard `confirm` is boolean. 
              // Simplified: If they click Cancel, we abort close. 
              // If they click OK, we close (losing data). 
              // Let's assume confirm means "Are you sure you want to close and lose unsaved changes?"
          }
      }
      
      const newFiles = files.filter(f => f.id !== id);
      setFiles(newFiles);
      if (activeFileId === id) {
          setActiveFileId(newFiles.length > 0 ? newFiles[newFiles.length - 1].id : null);
      }
  };

  // Keyboard shortcut for Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSaveFile();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, handleSaveFile]); // Add dependencies

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div 
        className={cn(
            "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
            "md:w-64" // Fixed width on desktop when open
        )}
      >
        <Sidebar 
            files={files}
            activeFileId={activeFileId}
            onSelectFile={setActiveFileId}
            onNewFile={() => createNewFile()}
            onOpenFile={handleOpenFile}
            onCloseFile={closeFile}
            className="w-full h-full shadow-xl"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative transition-all">
        
        {/* Top Bar */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                    <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-sm font-semibold truncate max-w-[200px] text-zinc-300">
                    {activeFile ? activeFile.name : "No File Open"} 
                    {activeFile?.isDirty && <span className="text-muted-foreground ml-2 text-xs italic">(unsaved)</span>}
                </h1>
            </div>

            {activeFile && (
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex bg-secondary/50 rounded-lg p-0.5 mr-2">
                         <button 
                            onClick={() => setViewMode(ViewMode.EDITOR)}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === ViewMode.EDITOR ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            title="Editor Only"
                        >
                            <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode(ViewMode.SPLIT)}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === ViewMode.SPLIT ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            title="Split View"
                        >
                            <Columns className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode(ViewMode.PREVIEW)}
                            className={cn("p-1.5 rounded-md transition-all", viewMode === ViewMode.PREVIEW ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            title="Preview Only"
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                    </div>

                    <Button variant="ghost" size="sm" onClick={handleSaveFile} title="Save (Ctrl+S)">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </Button>
                     {/* Fallback download for simple saving without File System Access API permission */}
                     {!activeFile.handle && (
                        <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>

        {/* Editor Area */}
        {activeFile ? (
             <div className="flex-1 flex overflow-hidden">
                {/* Raw Input */}
                <div className={cn(
                    "h-full flex flex-col bg-zinc-950",
                    viewMode === ViewMode.PREVIEW ? "hidden" : "flex-1",
                    viewMode === ViewMode.SPLIT ? "w-1/2 border-r border-border" : "w-full"
                )}>
                    <textarea 
                        ref={editorRef}
                        className="flex-1 w-full h-full bg-zinc-950 text-zinc-300 p-8 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                        value={activeFile.content}
                        onChange={(e) => updateFileContent(e.target.value)}
                        placeholder="Start typing..."
                        spellCheck={false}
                    />
                </div>

                {/* Preview */}
                <div className={cn(
                    "h-full bg-zinc-950 overflow-y-auto",
                    viewMode === ViewMode.EDITOR ? "hidden" : "flex-1",
                    viewMode === ViewMode.SPLIT ? "w-1/2" : "w-full"
                )}>
                    <MarkdownRenderer content={activeFile.content} />
                </div>
             </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-zinc-950/50">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                    <Columns className="w-8 h-8 text-zinc-600" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-200 mb-2">No file is open</h2>
                <p className="text-sm max-w-xs text-center mb-6">Create a new file or open an existing Markdown file from your device.</p>
                <div className="flex gap-4">
                    <Button onClick={() => createNewFile()}>Create New</Button>
                    <Button variant="outline" onClick={handleOpenFile}>Open File</Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}