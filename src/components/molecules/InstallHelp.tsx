import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallPlatform = 'ios' | 'android' | 'other'

const DISMISSED_KEY = 'ai-reader-install-help-dismissed'

function isStandalone(): boolean {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  return (
    standaloneNavigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches === true
  )
}

function detectPlatform(): InstallPlatform {
  const userAgent = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isIOS) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'other'
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function InstallHelp() {
  const [platform] = useState(detectPlatform)
  const [isInstalled, setIsInstalled] = useState(isStandalone)
  const [isDismissed, setIsDismissed] = useState(wasDismissed)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installError, setInstallError] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (isInstalled || isDismissed || (platform === 'other' && !installPrompt)) return null

  const dismiss = () => {
    setIsDismissed(true)
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // Dismissal remains effective for this page even when storage is unavailable.
    }
  }

  const install = async () => {
    if (!installPrompt) return
    setInstallError(false)
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
    } catch {
      setInstallPrompt(null)
      setInstallError(true)
    }
  }

  return (
    <section
      aria-labelledby="install-help-title"
      className="relative rounded-2xl border border-teal/20 bg-teal-soft p-5 pr-14 sm:p-6 sm:pr-14"
    >
      <button
        type="button"
        aria-label="Închide instrucțiunile de instalare"
        onClick={dismiss}
        className="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl text-ink-muted hover:bg-white/70"
      >
        <span aria-hidden="true">×</span>
      </button>
      <h2 id="install-help-title" className="mb-2 font-display text-xl text-ink">
        Instalează AI Reader
      </h2>

      {installPrompt && (
        <button
          type="button"
          onClick={() => void install()}
          className="mb-3 min-h-11 rounded-xl bg-teal px-4 py-2 font-semibold text-white hover:bg-teal/90"
        >
          Instalează aplicația
        </button>
      )}
      {installError && (
        <p role="alert" className="mb-3 text-sm text-danger">
          Instalarea nu a putut fi pornită. Folosește meniul browserului pentru a adăuga aplicația.
        </p>
      )}

      {platform === 'ios' && (
        <div className="space-y-2 text-sm leading-relaxed text-ink-muted">
          <p>Pe iPhone sau iPad:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Deschide AI Reader în Safari.</li>
            <li>Apasă butonul Partajare.</li>
            <li>Alege „Adaugă la ecranul principal”.</li>
            <li>Confirmă numele și apasă „Adaugă”.</li>
          </ol>
          <p>În Chrome pe iOS, acest flux poate să nu fie disponibil; folosește Safari.</p>
        </div>
      )}

      {platform === 'android' && (
        <div className="space-y-2 text-sm leading-relaxed text-ink-muted">
          <p>Pe Android:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Deschide AI Reader în Chrome.</li>
            <li>Deschide meniul browserului.</li>
            <li>Alege „Instalează aplicația” sau „Adaugă la ecranul de pornire”.</li>
            <li>Confirmă instalarea.</li>
          </ol>
        </div>
      )}
    </section>
  )
}
