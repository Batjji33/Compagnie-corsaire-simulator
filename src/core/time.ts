/** Simulation hour, wrapped at midnight; minute boundaries tolerate fixed-step rounding. */
export function formatHour(hour:number):string {
  const minutes=((Math.floor(hour*60+1e-8)%1440)+1440)%1440;
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
}
