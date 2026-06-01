'use client'
import { useState, useRef } from 'react'
import { Upload, X, FileText, Film, Image, CheckCircle, Loader2 } from 'lucide-react'
import { adminAPI } from '@/lib/api'

interface FileUploadProps {
  onUploaded: (url: string, filename: string) => void
  accept?: string
  label?: string
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  mp4: Film,
  webm: Film,
  jpg: Image,
  jpeg: Image,
  png: Image,
}

export default function FileUpload({ onUploaded, accept = '*', label = 'اسحب الملف أو اضغط للرفع' }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await adminAPI.uploadFile(formData)
      const { url, filename } = res.data
      setUploadedFile({ name: filename || file.name, url })
      onUploaded(url, filename || file.name)
    } catch {
      setError('فشل رفع الملف — تحقق من الحجم والنوع')
    } finally {
      setUploading(false)
    }
  }

  const ext = uploadedFile?.name.split('.').pop()?.toLowerCase() || ''
  const FileIcon = FILE_ICONS[ext] || FileText

  return (
    <div className="space-y-2">
      {uploadedFile ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-uni-green/10 border border-uni-green/30">
          <FileIcon className="w-5 h-5 text-uni-green flex-shrink-0" />
          <span className="text-sm text-uni-text truncate flex-1">{uploadedFile.name}</span>
          <CheckCircle className="w-4 h-4 text-uni-green flex-shrink-0" />
          <button onClick={() => setUploadedFile(null)} className="text-uni-muted hover:text-uni-red">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
            ${dragOver ? 'border-uni-gold bg-uni-gold/5' : 'border-uni-border/40 hover:border-uni-gold/40 hover:bg-uni-card/30'}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-uni-gold animate-spin" />
              <p className="text-sm text-uni-muted">جاري الرفع...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-uni-muted" />
              <p className="text-sm text-uni-muted">{label}</p>
              <p className="text-xs text-uni-muted/60">PDF، فيديو، صور — حتى 100 ميغابايت</p>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-uni-red">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}
