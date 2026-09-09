// ============================================================
//  js/mascot.js — original 3D-styled category badge
//
//  A small, dimensional "mascot" badge: a glossy shaded sphere in
//  the category's theme color, carrying that category's icon,
//  with a soft contact shadow and a gentle float animation. This
//  is built entirely from CSS (radial-gradient highlight + inset
//  shadow for the glossy-sphere shading), not a photo or stock
//  illustration — see README on why stock character art isn't
//  used here.
// ============================================================

export function mascotBadgeHTML({ icon, color, size = 64, floaty = true }) {
  return `
    <span class="mascot-badge${floaty ? " mascot-float" : ""}" style="--mascot-color:${color}; --mascot-size:${size}px">
      <span class="mascot-shadow"></span>
      <span class="mascot-sphere"><span class="mascot-icon">${icon}</span></span>
    </span>`;
}
