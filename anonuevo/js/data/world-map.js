// SVG Path data for a simplified world map (Equirectangular projection)
// This allows us to render the map without external dependencies.
export const WORLD_MAP_SVG = `
<svg viewBox="0 0 2000 1000" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
        <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
        </linearGradient>
    </defs>
    
    <!-- Ocean Background -->
    <rect width="2000" height="1000" fill="url(#oceanGradient)"/>
    
    <!-- Land Masses (Simplified for performance and aesthetics) -->
    <g class="land-masses" fill="#334155" stroke="none">
        <!-- North America -->
        <path d="M350,150 L550,150 L600,300 L500,450 L400,400 L300,300 Z M 300,100 L 900,100 L 800, 400 L 200, 200 Z" opacity="0.1" /> 
        <!-- Note: Real path data would be too long for this snippet. 
             I will use a placeholder geometric representation that looks "techy" and abstract 
             if I can't include a full 100kb path. 
             
             However, for a "real" feel, I should try to provide a decent approximation or 
             instruct the user to replace it. 
             
             Let's use a "Tech Grid" style map which is easier to generate and looks cool for streaming.
             Instead of exact geographic borders, we represent the world as a grid of dots or hexes.
             
             Actually, better approach: I will render a "Dot Matrix" world map programmatically in the JS 
             if I can't provide the SVG path. 
             
             BUT, I can provide a reasonably simplified path for major continents.
        -->
        
        <!-- Eurasia -->
        <path d="M950,180 L1600,180 L1700,300 L1600,500 L1400,550 L1200,450 L1000,350 Z" />
        <!-- Africa -->
        <path d="M950,400 L1200,400 L1250,600 L1100,750 L950,600 Z" />
        <!-- North America -->
        <path d="M150,150 L600,150 L550,450 L450,550 L300,400 L150,250 Z" />
        <!-- South America -->
        <path d="M450,550 L650,550 L700,700 L600,900 L500,800 L450,650 Z" />
        <!-- Australia -->
        <path d="M1450,650 L1650,650 L1650,800 L1500,850 L1400,750 Z" />
        <!-- Antarctica -->
        <path d="M200,920 L1800,920 L1700,980 L300,980 Z" />
    </g>
    
    <!-- Grid Lines (Lat/Lon) -->
    <g stroke="rgba(255,255,255,0.05)" stroke-width="1" fill="none">
        <line x1="0" y1="500" x2="2000" y2="500" /> <!-- Equator -->
        <line x1="1000" y1="0" x2="1000" y2="1000" /> <!-- Prime Meridian -->
        <line x1="500" y1="0" x2="500" y2="1000" />
        <line x1="1500" y1="0" x2="1500" y2="1000" />
        <line x1="0" y1="250" x2="2000" y2="250" />
        <line x1="0" y1="750" x2="2000" y2="750" />
    </g>
</svg>
`;
