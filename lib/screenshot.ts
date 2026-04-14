import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

const FOLDS = 3
const FOLD_HEIGHT = 844
const CAPTURE_HEIGHT = FOLD_HEIGHT * FOLDS // 2532px

// Seletores comuns de popups, modais, cookie banners e widgets
const POPUP_SELECTORS = [
  // Cookie banners
  '[class*="cookie"]', '[id*="cookie"]', '[class*="Cookie"]', '[id*="Cookie"]',
  '[class*="consent"]', '[id*="consent"]', '[class*="lgpd"]', '[id*="lgpd"]',
  '[class*="gdpr"]', '[id*="gdpr"]',
  // Popups e modais
  '[class*="popup"]', '[id*="popup"]', '[class*="Popup"]', '[id*="Popup"]',
  '[class*="modal"]', '[id*="modal"]', '[class*="Modal"]', '[id*="Modal"]',
  '[class*="overlay"]', '[id*="overlay"]', '[class*="Overlay"]',
  '[class*="lightbox"]', '[class*="newsletter"]', '[class*="Newsletter"]',
  '[class*="exit-intent"]', '[class*="exitintent"]',
  // Widgets de chat/WhatsApp
  '[class*="whatsapp"]', '[id*="whatsapp"]', '[class*="Whatsapp"]',
  '[class*="chat-widget"]', '[id*="chat-widget"]',
  '[class*="tidio"]', '[id*="tidio"]',
  '[class*="intercom"]', '[id*="intercom"]',
  '[class*="crisp"]', '[id*="crisp"]',
  '[class*="zendesk"]', '[id*="zendesk"]',
  '[class*="drift"]', '[id*="drift"]',
  '[class*="hubspot"]', '[id*="hubspot"]',
  '#smartarget-popup', '#smartarget-overlay',
  // Shopify específicos
  '.shopify-section-overlay', '[class*="klaviyo"]', '[id*="klaviyo"]',
  '[class*="privy"]', '[id*="privy"]', '[class*="justuno"]',
  '[class*="optinmonster"]', '[id*="optinmonster"]',
  // Genéricos com z-index alto
  '[role="dialog"]', '[aria-modal="true"]',
]

const DISMISS_SCRIPT = `
  // 1. Remove elementos por seletores conhecidos
  const selectors = ${JSON.stringify(POPUP_SELECTORS)};
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.remove());
  });

  // 2. Remove elementos fixed/sticky com z-index alto que cobrem a tela
  document.querySelectorAll('*').forEach(el => {
    const style = window.getComputedStyle(el);
    const pos = style.position;
    const zIndex = parseInt(style.zIndex) || 0;
    const rect = el.getBoundingClientRect();
    const coversScreen = rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.3;
    if ((pos === 'fixed' || pos === 'sticky') && zIndex > 100 && coversScreen) {
      const isHeader = rect.height < 100 && rect.top < 10;
      const isBottomBar = rect.height < 80 && rect.top > window.innerHeight - 100;
      if (!isHeader && !isBottomBar) el.remove();
    }
  });

  // 3. Restaura scroll no body
  document.body.style.overflow = 'auto';
  document.body.style.position = 'static';
  document.documentElement.style.overflow = 'auto';
`

export async function capturarScreenshot(url: string): Promise<{ base64: string; mime: string } | null> {
  let browser = null

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 390,
        height: FOLD_HEIGHT, // viewport normal de 1 dobra — site renderiza naturalmente
        isMobile: true,
        deviceScaleFactor: 2,
      },
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()

    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )

    // Navega e espera carregar
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 })

    // Espera 2s para popups aparecerem
    await new Promise(r => setTimeout(r, 2000))

    // Remove popups
    await page.evaluate(DISMISS_SCRIPT)

    // Scrola até o fim das 3 dobras para forçar lazy-loading
    await page.evaluate((h) => window.scrollTo({ top: h, behavior: 'instant' }), CAPTURE_HEIGHT)
    await new Promise(r => setTimeout(r, 800))

    // Volta ao topo
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await new Promise(r => setTimeout(r, 300))

    // CORREÇÃO: expande o viewport para as 3 dobras antes de tirar o print
    await page.setViewport({
      width: 390,
      height: CAPTURE_HEIGHT,
      isMobile: true,
      deviceScaleFactor: 2,
    })

    // Aguarda um pouco para o layout se ajustar ao novo viewport
    await new Promise(r => setTimeout(r, 500))

    // Agora o viewport abrange as 3 dobras — captura o que está visível
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 85,
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: CAPTURE_HEIGHT,
      },
    })

    const base64 = Buffer.from(buffer).toString('base64')
    return { base64, mime: 'image/jpeg' }

  } catch (err) {
    console.error('Erro ao capturar screenshot:', err)
    return null
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
