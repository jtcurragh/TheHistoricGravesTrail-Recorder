interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-tmt-navy text-white px-4 py-3 min-h-[56px] flex items-center">
      {/* TODO: Insert Historic Graves logo SVG — awaiting asset */}
      <span className="font-bold text-lg">
        {title ?? 'Historic Graves Trail'}
      </span>
    </header>
  )
}
