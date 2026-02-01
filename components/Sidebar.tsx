import React from 'react';
import { FileObj } from '../types';
import { cn } from '../lib/utils';
import { FileText, Plus, FolderOpen, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';

interface SidebarProps {
  files: FileObj[];
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onCloseFile: (id: string) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onNewFile,
  onOpenFile,
  onCloseFile,
  className
}) => {
  return (
    <div className={cn("flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-64", className)}>
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <span className="font-semibold text-zinc-200">Explorer</span>
        <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onNewFile} title="New File">
                <Plus className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onOpenFile} title="Open File from Disk">
                <FolderOpen className="h-4 w-4" />
            </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 && (
            <div className="text-center text-zinc-500 text-sm mt-8 px-4">
                No open files. <br/> Create new or open from disk.
            </div>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "group flex items-center justify-between px-3 py-2 mx-2 rounded-md cursor-pointer transition-colors text-sm",
              activeFileId === file.id
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            )}
            onClick={() => onSelectFile(file.id)}
          >
            <div className="flex items-center overflow-hidden">
                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                {file.isDirty && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>}
            </div>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-all"
            >
                <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-600">
        Obsidian Clone Web
      </div>
    </div>
  );
};