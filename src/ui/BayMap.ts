import { SHOALS } from '../weather/Marine';
import { BAY, BUOYS, DOCKS, LANDS, ROUTE } from '../world/geography';
export function bayMapMarkup(): string {
  const width=BAY.maxX-BAY.minX, height=BAY.maxZ-BAY.minZ;
  return `<aside id="bay-map" hidden aria-label="Carte schématique de la baie">
    <h2>La baie, en repères</h2>
    <svg viewBox="${BAY.minX} ${BAY.minZ} ${width} ${height}" role="img" aria-label="Saint-Malo à l’est, Dinard au sud-ouest, les forts au nord. Traversée schématique en pointillés.">
      ${LANDS.map(land=>`<polygon points="${land.outline.map(p=>p.join(',')).join(' ')}"/>`).join('')}
      ${SHOALS.map(a=>`<ellipse class="map-shoal" cx="${a.x}" cy="${a.z}" rx="${a.rx}" ry="${a.rz}"/>`).join('')}
      <polyline class="map-route" points="${ROUTE.map(p=>p.join(',')).join(' ')}"/>
      ${BUOYS.map(b=>`<circle class="map-buoy ${b.red?'port':'starboard'}" cx="${b.x}" cy="${b.z}" r="40"/>`).join('')}
      ${DOCKS.map(d=>`<circle class="map-dock" cx="${d.point[0]}" cy="${d.point[1]}" r="80"/>`).join('')}
      <text x="1400" y="-600">Saint-Malo</text><text x="-3200" y="1600">Dinard</text>
      <text x="-900" y="-1700">Les Bé</text><text x="950" y="-1600">Fort National</text>
      <text x="-3700" y="-2800">N ↑</text>
      <circle id="map-camera" cx="0" cy="0" r="90"/>
      <path id="map-vessel" d="M0 -120 L75 100 L0 65 L-75 100 Z" fill="#83e3bd" stroke="#172c31" stroke-width="20"/>
    </svg>
    <p>Triangle vert : navire · Point blanc : caméra · Cales en ocre · Hauts-fonds cerclés</p>
    <p>Côtes interprétées. Chenal, balises et hauts-fonds fictifs. Carte non navigable.</p>
  </aside>`;
}
