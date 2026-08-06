# Barboard Exchange

Act as a Principal Front-End Engineer and Premium UI/UX Designer specializing in React, TypeScript, Tailwind CSS, and Framer Motion.

Your task is to build a "Bar Stock Exchange" (Алкогольная биржа) TV Dashboard. The UI must be highly intuitive, extremely elegant, and readable by bar patrons from a distance. 

CRITICAL DESIGN RULE: The aesthetic must strictly follow a premium, high-fidelity minimalist design language (similar to Apple's design ecosystem). Use smooth glassmorphism (translucent panels with backdrop blur). 

ABSOLUTELY NO "TRAFFIC LIGHT" COLORS. Avoid highly saturated, pure reds or greens. Use elegant, muted shades (e.g., `emerald-400/20` with `text-emerald-300` for positive, and `rose-400/20` with `text-rose-300` for negative). 

ABSOLUTELY NO EMOJIS OR AI-GENERATED 3D ICONS. Use crisp, professional SVG icons exclusively from the `lucide-react` library.

### Layout & Logic Requirements (16:9 Screen):

1. Color Psychology for Bar Patrons:

   - Price DROPS = Good for the guest. Highlight with subtle Emerald/Mint.

   - Price RISES = Bad for the guest. Highlight with subtle Rose/Coral.

2. Typography & Data Formatting:

   - Font must be bold, clean, and sans-serif. 

   - ROUND ALL PRICES to the nearest whole integer (e.g., Math.round). Absolutely no decimals.

   - Append the Kazakhstani Tenge symbol " ₸" to all prices (e.g., "1500 ₸").

3. Category Rotation (Anti-Clutter):

   - Do not cram all items onto one screen. Display a maximum of 12-16 items in a clean grid.

   - Implement an auto-rotation system that switches the displayed category (e.g., from "Beer" to "Cocktails") every 15 seconds. Ensure the transition is a smooth crossfade using Framer Motion.

4. Item Row Structure:

   - High-quality placeholder bottle image (left).

   - Drink Name (clean, readable).

   - Current Price.

   - Delta (Percentage + Lucide Icon Arrow) with the correct muted color tint.

   - FOMO Indicator (Fear Of Missing Out): If an item is at its lowest price, display a clean Lucide `Flame` or `TrendingDown` icon next to it in a subtle gold/amber tint.

5. The "Market Crash" Event (Обвал рынка):

   - Implement a `useEffect` interval that triggers a "Market Crash" EXACTLY EVERY 30 SECONDS.

   - During the crash, the entire UI should smoothly shift into a temporary "Alert State" (e.g., a dark, subtle crimson glassmorphism overlay).

   - Display a highly visible but elegant banner: "ОБВАЛ РЫНКА! ВСЕ ЦЕНЫ СНИЖЕНЫ".

   - Animate all prices dropping to their minimum values instantly. 

6. Bottom Marquee (Бегущая строка):

   - A dedicated horizontal ticker at the bottom.

   - Clean background (glassmorphism).

   - Dynamic text examples: "🔥 ОСТАЛОСЬ 5 ПОРЦИЙ HEINEKEN ПО МИНИМУМУ!", "🚨 ОБВАЛ РЫНКА ЧЕРЕЗ 10 СЕКУНД!", "📈 WHISKEY SOUR БЬЕТ РЕКОРДЫ ПРОДАЖ!".

Please output the complete, copy-pasteable functional code for this React component, ensuring all styling strictly adheres to the premium, non-saturated aesthetic required.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fe8f6409-e914-45ba-bafd-f88d4304e631).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
