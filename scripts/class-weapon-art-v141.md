# TRAPBOUND v141 class weapon artwork

Four equipped hero sprites were produced with the built-in image-generation tool, using the existing hero's equipped pose as the edit target. Original artwork remains unchanged. Runtime weapon icons extend the existing hero-colored SVG illustration system.

| Hero | New artwork in project | Edit target |
| --- | --- | --- |
| Moonveil Mage | public/assets/equipment-v141/witch-potion.png | public/assets/equipment-v63/witch-wand.webp |
| Mossback Guardian | public/assets/equipment-v141/golem-greatsword.png | public/assets/equipment-v63/golem-sword.webp |
| Rook Shadowblade | public/assets/equipment-v141/wisp-shuriken.png | public/assets/equipment-v63/wisp-dagger.webp |
| Gearleaf Trapper | public/assets/equipment-v141/tinker-bomb.png | public/assets/equipment-v63/tinker-crossbow.webp |

The complete prompt for each image combines the following prefix, its specific instruction below, and the suffix.

Prefix: Use case: precise-object-edit. Game equipped hero sprite, edit target is attached reference.

- Moonveil Mage: keep the identical purple hood, crescent hat, glowing eyes, small chibi body and pixel texture. Replace ALL staff/wand and floating staff magic with one clearly visible round glass POTION BOMB filled with violet-blue liquid, silver cap and small moon charm, held in the raised hand. No staff anywhere.
- Mossback Guardian: keep identical red beard and bun, blue and gold armor, shield, proportions and pixel texture. Keep a HEAVY GREATSWORD but fit the ENTIRE large broad blade, tip, hilt, shield and whole hero fully in frame. Broad silver stone-like blade with gold sun emblem and small mossy vines.
- Rook Shadowblade: keep the identical blond hair, red scarf, dark leather armor, body proportions and pixel texture. Replace BOTH daggers and red blade trails with two clearly visible four-point metal NINJA SHURIKENS with red crystal center holes, one in each hand. No daggers or swords anywhere.
- Gearleaf Trapper: keep identical ginger hair, blue goggles, green outfit, leather gloves, proportions and pixel texture. Replace the entire crossbow with one clearly visible round dark iron BOMB with brass bands, blue gear emblem and short lit fuse, held safely out in one hand. No crossbow or net anywhere.

Suffix: Preserve the exact established 2D pixel/chibi style and hero identity. Single full-body hero ONLY on genuinely transparent background, square canvas, centered with generous transparent safety margin at least 8% on every side, same scale as reference. No cropping, no edge fragments, no platform, no text, no background, no other heroes. Pose may adjust only hands to hold new weapon naturally. Crisp pixel edges, no smooth 3D rendering.

All four PNGs retain their generated alpha. CSS frames their visible silhouettes to a common 87.5% maximum extent and centers the combined hero and weapon without stretching or cropping.
