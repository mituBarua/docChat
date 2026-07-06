'use client'

interface Document {
    id: string
    name: string
    size: string
    chunks: number
    uploadedAt: string
}

interface DocSidebarProps {
    documents: Document[]
    activeDoc: Document | null
    uploading: boolean
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSelectDoc: (doc: Document) => void
    onDeleteDoc: (docId: string, docName: string) => void
}

export default function DocSidebar({
    documents,
    activeDoc,
    uploading,
    onUpload,
    onSelectDoc,
    onDeleteDoc,
}: DocSidebarProps) {
    return (
        <>
            {/* Brand */}
            <div className="p-4 pb-3">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#534AB7] to-[#7F77DD] flex items-center justify-center text-white text-sm">
                        ◆
                    </div>
                    <span className="text-white font-medium text-sm">
                        <span className="text-[#AFA9EC]">Doc</span>Chat
                    </span>
                </div>

                <label className="flex items-center gap-2 border border-dashed border-white/10 rounded-xl p-3 cursor-pointer hover:border-[#7F77DD]/40 hover:bg-[#7F77DD]/5 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-[#7F77DD]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#AFA9EC] text-sm">↑</span>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-white/70">
                            {uploading ? 'Processing...' : 'Upload document'}
                        </div>
                        <div className="text-xs text-white/30">PDF up to 10MB</div>
                    </div>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={onUpload}
                        className="hidden"
                        disabled={uploading}
                    />
                </label>
            </div>


            <div className="text-[10px] font-medium text-white/20 px-4 py-2 uppercase tracking-widest">
                Your documents
            </div>


            <div className="flex-1 overflow-auto px-2 pb-2">
                {documents.length === 0 && (
                    <div className="text-xs text-white/20 text-center py-8 px-3">
                        No documents yet
                    </div>
                )}
                {documents.map(doc => (
                    <div
                        key={doc.id}
                        onClick={() => onSelectDoc(doc)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer mb-1 transition-all group ${activeDoc?.id === doc.id ? 'bg-[#534AB7]/15' : 'hover:bg-white/4'
                            }`}
                    >
                        <div className="w-8 h-10 rounded-md bg-[#1A1D2B] border border-white/8 flex items-center justify-center flex-shrink-0">
                            <span className={`text-sm ${activeDoc?.id === doc.id ? 'text-[#AFA9EC]' : 'text-white/25'}`}>
                                📄
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium truncate ${activeDoc?.id === doc.id ? 'text-[#AFA9EC]' : 'text-white/75'}`}>
                                {doc.name}
                            </div>
                            <div className={`text-[10px] ${activeDoc?.id === doc.id ? 'text-[#534AB7]/60' : 'text-white/25'}`}>
                                {doc.size} · {doc.chunks} chunks · {doc.uploadedAt}
                            </div>
                        </div>
                        {activeDoc?.id === doc.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#534AB7] flex-shrink-0 group-hover:hidden" />
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDeleteDoc(doc.id, doc.name)
                            }}
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 text-red-400 flex-shrink-0 transition-all"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-3.5 border-t border-white/5">
                <div className="flex justify-between mb-1.5">
                    <span className="text-[10px] text-white/25">Storage</span>
                    <span className="text-[10px] text-white/25">
                        {documents.reduce((acc, d) => acc + parseInt(d.size), 0)} KB / 5 MB
                    </span>
                </div>
                <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[35%] bg-[#534AB7] rounded-full" />
                </div>
            </div>
        </>
    )
}