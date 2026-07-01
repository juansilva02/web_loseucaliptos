// Imágenes bundleadas de productos, indexadas por nombre (match).
// Fallback de imagen cuando el producto no tiene una imagen administrada.
import imgLadrilloHueco12 from '../assets/featured-products/ladrillo-hueco-12.webp'
import imgLadrilloHueco8 from '../assets/featured-products/ladrillo-hueco-8.webp'
import imgLadrilloComun from '../assets/featured-products/ladrillo-comun.webp'
import imgPortland25 from '../assets/featured-products/portland-25kg.webp'
import imgCalCacique from '../assets/featured-products/cal-cacique-25kg.webp'
import imgBloqueLiso13 from '../assets/featured-products/bloque-liso-13.webp'
import imgBloqueLiso20 from '../assets/featured-products/bloque-liso-20.webp'
import imgBloqueLiso10 from '../assets/featured-products/bloque-liso-10.webp'
import imgHierro6 from '../assets/featured-products/hierro-6.webp'
import imgHierro8 from '../assets/featured-products/hierro-8.webp'
import imgHierro10 from '../assets/featured-products/hierro-10.webp'
import imgHierro42 from '../assets/featured-products/hierro-4-2.webp'
import imgLadrilloCordoba from '../assets/featured-products/ladrillo-cordoba-media-vista.webp'
import imgArenaBolson from '../assets/featured-products/arena-bolson.webp'
import imgPegamentoCeramica from '../assets/featured-products/pegamento-ceramica.webp'
import imgTelgopor10 from '../assets/featured-products/telgopor-10.webp'
import imgTelgopor125 from '../assets/featured-products/telgopor-12-5.webp'
import imgCableUnipolar from '../assets/featured-products/cable-unipolar-2-5.webp'

export const productImages = {
  'LADRILLO HUECO 12': imgLadrilloHueco12,
  'LADRILLO HUECO 8': imgLadrilloHueco8,
  'LADRILLO COMUN': imgLadrilloComun,
  'PORTLAND 25': imgPortland25,
  'CACIQUE MAX 25': imgCalCacique,
  'BLOQUE LISO 13': imgBloqueLiso13,
  'BLOQUE LISO 20': imgBloqueLiso20,
  'BLOQUE LISO 10': imgBloqueLiso10,
  'HIERRO 6': imgHierro6,
  'HIERRO 8': imgHierro8,
  'HIERRO 10': imgHierro10,
  'HIERRO 4,2': imgHierro42,
  'CORDOBA MEDIA VISTA': imgLadrilloCordoba,
  'ARENA BOLSON': imgArenaBolson,
  'PEGAMENTO CERAMICA': imgPegamentoCeramica,
  'TELGOPOR 10': imgTelgopor10,
  'TELGOPOR 12.5': imgTelgopor125,
  'UNIPOLAR 1 X2.5': imgCableUnipolar,
}

export const productImagesById = {
  'ladrillo-hueco-12': imgLadrilloHueco12,
  'ladrillo-hueco-8': imgLadrilloHueco8,
  'ladrillo-comun': imgLadrilloComun,
  'ladrillo-cordoba-mv': imgLadrilloCordoba,
  'bloque-cemento-10': imgBloqueLiso10,
  'bloque-cemento-13': imgBloqueLiso13,
  'bloque-cemento-20': imgBloqueLiso20,
  'telgopor-10': imgTelgopor10,
  'telgopor-12-5': imgTelgopor125,
  'portland-25kg': imgPortland25,
  'cal-25kg': imgCalCacique,
  'arena-bolson': imgArenaBolson,
  'arena-fina-bolsa': imgArenaBolson,
  'arena-gruesa-bolsa': imgArenaBolson,
  'cascote-bolson': imgArenaBolson,
  'piedra-partida': imgArenaBolson,
  'hierro-4-2': imgHierro42,
  'hierro-6': imgHierro6,
  'hierro-8': imgHierro8,
  'hierro-10': imgHierro10,
  'pegamento-ceramica': imgPegamentoCeramica,
  'cable-unipolar-2-5': imgCableUnipolar,
}

export function getBundledProductImage(product) {
  if (!product) return null
  const byId = product.id ? productImagesById[product.id] : null
  if (byId) return byId
  if (!product.name) return null
  return productImages[String(product.name).toUpperCase()] || null
}
