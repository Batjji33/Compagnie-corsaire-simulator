import { COAST_DESTINATIONS, COAST_ROUTES } from '../world/EmeraldCoast';
import { SHOALS } from '../weather/Marine';
import { BAY, BUOYS, DOCKS, LANDS, ROUTE } from '../world/geography';
import { icon } from './icons';
export function bayMapMarkup(): string {
  const width=BAY.maxX-BAY.minX, height=BAY.maxZ-BAY.minZ;
  return `<aside id="bay-map" hidden aria-label="Carte schématique de la baie">
    <div class="panel-title"><h2>Côte d’Émeraude</h2><button id="map-close" aria-label="Fermer la carte">${icon('close')}</button></div>
    <button id="map-scale" aria-pressed="false">Centrer sur le navire</button>
    <svg id="bay-chart" viewBox="${BAY.minX} ${BAY.minZ} ${width} ${height}" role="img" aria-label="Côte d’Émeraude, de Saint-Malo au Cap Fréhel. Itinéraires de jeu en pointillés.">
      ${LANDS.map(land=>`<polygon points="${land.outline.map(p=>p.join(',')).join(' ')}"/>`).join('')}
      ${SHOALS.map(a=>`<ellipse class="map-shoal" cx="${a.x}" cy="${a.z}" rx="${a.rx}" ry="${a.rz}"/>`).join('')}
      <polyline class="map-route" points="${ROUTE.map(p=>p.join(',')).join(' ')}"/>
      ${COAST_ROUTES.map(r=>`<polyline class="map-route" points="${r.points.map(p=>p.join(',')).join(' ')}"><title>${r.name}</title></polyline>`).join('')}
      ${BUOYS.map(b=>`<circle class="map-buoy ${b.red?'port':'starboard'}" cx="${b.x}" cy="${b.z}" r="40"/>`).join('')}
      ${DOCKS.map(d=>`<circle class="map-dock" cx="${d.point[0]}" cy="${d.point[1]}" r="80"/>`).join('')}
      <text x="1400" y="-600">Saint-Malo</text><text x="-3200" y="1600">Dinard</text>
      <text x="-900" y="-1700">Les Bé</text><text x="950" y="-1600">Fort National</text>
      <text x="-13800" y="-6000">N ↑</text>
      ${COAST_DESTINATIONS.filter(d=>d.id!=='malo'&&d.id!=='dinard').map(d=>`<g><circle class="map-dock" cx="${d.x}" cy="${d.z}" r="65"/><text x="${d.x+140}" y="${d.z-160}">${d.name.split(' · ')[0]}</text></g>`).join('')}
      <text x="-7400" y="-1600">Ébihens</text>
      <circle id="map-camera" cx="0" cy="0" r="90"/>
      <g id="map-taxis"></g>
      <path id="map-vessel" d="M0 -120 L75 100 L0 65 L-75 100 Z" fill="#83e3bd" stroke="#172c31" stroke-width="20"/>
    </svg>
    <p>Triangle vert : navire · Point blanc : caméra · Cales en ocre · Hauts-fonds cerclés</p>
    <div id="map-taxi-legend" aria-label="Bateaux-taxis"></div>
    <p id="map-berth-status"></p>
    <p>Distances comprimées. Chenal, balises et profondeurs fictifs. Ne pas utiliser pour naviguer réellement. Référence : <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© contributeurs OpenStreetMap</a>.</p>
  </aside>`;
}
