import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Mapa interactivo (Leaflet + OpenStreetMap) con un marcador en la sucursal
 * y un circulo que delimita la zona de cobertura de envios.
 *
 * @param {number} lat      Latitud de la sucursal
 * @param {number} lng      Longitud de la sucursal
 * @param {number} radius   Radio de cobertura en METROS (ej. 5000 = 5 km)
 * @param {string} color    Color del circulo y el marcador
 * @param {string} label    Texto del popup del marcador
 */
export default function CoverageMap({ lat, lng, radius = 5000, color = '#db3a1e', label }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false, // evita secuestrar el scroll de la pagina
      zoomControl: true,
    })
    // Vista inicial requerida: sin ella circle.getBounds() no puede proyectar
    map.setView([lat, lng], 13)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    // Circulo de zona de cobertura (mismo lenguaje visual que el competidor)
    const circle = L.circle([lat, lng], {
      radius,
      color,
      weight: 2,
      opacity: 1,
      dashArray: '6 4',
      lineCap: 'round',
      lineJoin: 'round',
      fillColor: color,
      fillOpacity: 0.07,
    }).addTo(map)

    // Marcador de la sucursal (circleMarker: no requiere imagenes externas)
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    }).addTo(map)

    if (label) marker.bindPopup(label)

    // Encuadra el mapa para que entre todo el circulo
    map.fitBounds(circle.getBounds(), { padding: [16, 16] })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [lat, lng, radius, color, label])

  return <div ref={containerRef} className="leaflet-coverage-map" aria-label={label} />
}
