import { useRef } from 'react'
import { features } from '../config/features'

interface ImportButtonProps {
  isImporting: boolean
  onImport: (file: File) => void
  disabled?: boolean
}

export function ImportButton({ isImporting, onImport, disabled = false }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!features.IMPORT_ZIP_ENABLED) {
    return null
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImport(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select ZIP file to import"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isImporting}
        className="min-h-[56px] w-full px-6 bg-tmt-teal text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isImporting ? 'Importing...' : 'Import Trail ZIP'}
      </button>
    </>
  )
}
