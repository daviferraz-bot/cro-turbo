import sharp from 'sharp'

/**
 * Limite da Claude Vision — qualquer lado da imagem não pode passar de 8000px.
 * Usamos 7800 como teto para ter margem de segurança.
 */
const CLAUDE_MAX_DIM = 7800

/**
 * Corta o TOPO da imagem se ela for mais alta que CLAUDE_MAX_DIM.
 * Mantém as primeiras ~9 dobras (em viewport mobile de 844px) em vez
 * de descartar a análise por causa de uma página muito longa.
 *
 * - Recebe base64 (sem prefixo data:) + mime.
 * - Se a imagem couber no limite, devolve ela mesma sem reprocessar.
 * - Se não couber, corta a partir do topo e devolve base64 + mime atualizados.
 */
export async function cortarSeNecessario(
  base64: string,
  mime: string,
): Promise<{ base64: string; mime: string }> {
  try {
    const buffer = Buffer.from(base64, 'base64')
    const image = sharp(buffer)
    const metadata = await image.metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0

    // Já cabe — não mexe
    if (width <= CLAUDE_MAX_DIM && height <= CLAUDE_MAX_DIM) {
      return { base64, mime }
    }

    // Corta o topo, mantendo as dimensões que couberem
    const cropWidth = Math.min(width, CLAUDE_MAX_DIM)
    const cropHeight = Math.min(height, CLAUDE_MAX_DIM)

    // Normaliza para JPEG com qualidade 80 (equilíbrio tamanho x legibilidade)
    const cropped = await image
      .extract({ left: 0, top: 0, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 80 })
      .toBuffer()

    return {
      base64: cropped.toString('base64'),
      mime: 'image/jpeg',
    }
  } catch (err) {
    console.warn('Falha ao cortar imagem, devolvendo original:', err)
    return { base64, mime }
  }
}
