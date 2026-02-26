import logoSvg from '../assets/logo-banner.svg'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-tmt-navy text-white px-4 py-3 min-h-[56px] flex items-center gap-3 border-b border-[#3a9b8e]">
      <img src={logoSvg} alt="" className="h-8 w-8 shrink-0" aria-hidden />
      <span className="font-semibold text-[20px]">
        {title ?? 'The Historic Graves Trail'}
      </span>
    </header>
  )
}
