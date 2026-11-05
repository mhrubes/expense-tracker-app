# Moje výdaje

Webová aplikace pro evidenci výdajů a příjmů: přehled s grafy, kalendář (měsíc / týden / den), seznam plateb s filtry a správa kategorií. Světlý i tmavý režim.

**Online:** https://vydajo.vercel.app

React + TypeScript + Vite, `zustand`, `date-fns`. Grafy jsou vlastní SVG/CSS bez knihovny.

## Spuštění

```bash
npm install
npm run dev      # http://localhost:5173
```

Další příkazy: `npm run build` (produkční build), `npm run lint`.
Testy logiky (Node 22+): `node --test test/*.test.ts`.

## Data

Platby a kategorie se ukládají **jen do localStorage prohlížeče** (klíč `expense-tracker:v1`). Nejsou v repozitáři a vážou se k adrese včetně portu, takže spouštěj vždy na stejném.

- Záloha a obnova: záložka **Kategorie → Data** (JSON). Export plateb do CSV je v záložce **Platby**.
- Ukázková data (vymyšlená, generují se v `src/lib/demo.ts`) jdou načíst a zase smazat v záložce Kategorie.
- Soubory se zálohami (`vydaje-zaloha-*.json`, `platby-*.csv`) jsou v `.gitignore`, aby se osobní data omylem nedostala do gitu.

## Ovládání

- **N** nebo tlačítko **+ Přidat**: nová platba (výdaj nebo příjem), název nabízí dříve použité položky.
- **Kalendář**: dvojklik na prázdné místo ve dni přidá platbu, klik na platbu ji upraví.
- **Kategorie**: barva, ikona, měsíční limit; při mazání se platby přesunou do jiné kategorie.

## Struktura

```
src/
  pages/        Přehled, Kalendář, Platby, Kategorie
  components/   Navbar, grafy, dialogy
  lib/          statistiky, formátování, záloha, ukázková data
  store.ts      stav (zustand + localStorage)
test/           testy logiky
```
