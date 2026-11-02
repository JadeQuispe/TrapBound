# Tutorial art repair v147

The welcome scene uses TRAPBOUND's actual six heroes redrawn in the reference's pixel/chibi style. The Warden uses a separate transparent sprite. Reference illustrations have explicit SVG clip paths, so extra space around an illustration cannot reveal adjoining headings, dialogue, or characters from the original sheet.

Assets (built-in image generation):

- `public/assets/tutorial-v147/heroes.webp`
- `public/assets/tutorial-v147/warden.webp`

## Hero illustration prompt

Use case: style-transfer. Asset: wide 3:1 browser game tutorial welcome illustration, no interface or text. First input is style/composition reference: use ONLY its dark dungeon, chunky pixel/chibi rendering, tiny expressive faces, amber sun banner and violet moon banner. The second input is a two-row atlas of all six EXACT heroes. They are the EXACT TRAPBOUND heroes to depict, Keep their identities and palettes, not the unrelated characters in the first input. Make EXACTLY SIX full-body heroes, evenly spaced, all feet, hair and weapons fully within canvas, three beneath Amber banner on left and three beneath Violet on right, small clear gap between teams. Left: Leafstep Scout brown hair green leafy cloak bow/quiver; Mossback Guardian is the stocky HUMAN brown beard, blue/gold plate shield and hammer (not a green monster); Sunseed Forager blonde hair floral ornament cream/green dress, nature staff. Right: Moonveil Mage hooded purple/blue with black face warm eyes and blue crystal staff; Rook Shadowblade silver white hair burgundy scarf dark rogue clothes twin daggers; Gearleaf Trapper orange hair brass goggles olive/cream mechanic clothes tool belt crossbow. Keep exactly the six references' identity, adjust proportions to the first reference's chibi style, coherent softly lit 2D pixel art, crisp pixels, no realistic painting or smooth vector. Dungeon stone floor/wall, subtle torches, amber and purple banners, moderate detail, muted dark fantasy colors. No Warden, no extra characters, no UI, no words, no dialogue, no panels, no logos, no cropped body parts, no merged weapons.

## Warden prompt

Use case: background-extraction. From the supplied TRAPBOUND reference, extract/recreate ONLY its large Warden character from upper left: friendly chibi tiny hooded dungeon guide, cream and purple hood with gold trim, black face two warm ivory glowing oval eyes, short purple/cream/gold robe and cloak, small hand holding golden staff with glowing purple round gemstone on the right. Keep the exact reference's pixel/chibi design, compact body, same colors and silhouette. Full body including cloak hem and staff entirely visible with 12% transparent padding, centered on a square canvas. Actual fully transparent background everywhere outside character and small local staff glow. No dungeon background or brown/black rectangular patches or smears, no text or logo or dialogue box, no decorative frame, no other character. Clean crisp pixel art cutout, no cropping, no giant oversized staff.
