# Alevanta

**Alege cu avantaj.** Informații și instrumente pentru decizii mai bune.

Alevanta este o platformă românească ce combină educație financiară practică
cu instrumente interactive de calcul: salariu net, credit, pensie, investiții,
buget, admitere la liceu și la facultate, orientare vocațională. Fiecare
instrument este însoțit de explicații, ipoteze declarate, metodologie și limite.

## Aplicații

**Finanțe**

| Aplicație | Rută |
|---|---|
| Calculator Salariu Net | `/calculator-salariu-net` |
| Calculator Credit | `/calculator-credit` |
| Calculator Pensie | `/calculator-pensie` |
| Calculator Investiții | `/investitii` |
| Calculator Buget | `/buget` |

**Educație**

| Aplicație | Rută |
|---|---|
| Admitere Liceu | `/admitere-liceu` |
| Admitere Facultate | `/admitere-facultate` |
| Calculator Vocațional | `/calculator-vocational` |

Conținut editorial: `/educatie-financiara` (12 articole + ghid per calculator).

## Stivă tehnică

- TanStack Start v1 (React 19 + Vite 7), SSR + server functions
- TypeScript, Tailwind CSS v4 (`src/styles.css`, tokens semantici)
- Supabase extern (Postgres + Auth + RLS + Storage), Google Authentication
- Resend (email), GA4 + Microsoft Clarity, Google AdSense + Funding Choices CMP

## Infrastructură

Dezvoltare în Lovable → sincronizare GitHub → producție pe **Vercel**
(`https://alevanta.info`), cu proiect **Supabase extern**. Lovable Cloud
(backend intern) este deconectat; nu mai există o a doua bază de date.

## Dezvoltare locală

```sh
git clone <repo>
cd <repo>
bun install
bun run dev      # http://localhost:8080
```

Copiază `.env.example` în `.env` și completează variabilele (vezi
[Configurare](./docs/CONFIGURATION.md)).

```sh
bun run build       # include generarea public/sitemap.xml
bun run typecheck
bunx vitest run
```

## Documentație

- [Arhitectura platformei](./docs/ARCHITECTURE.md)
- [Aplicațiile platformei și algoritmii folosiți](./docs/APPLICATIONS.md)
- [Configurare](./docs/CONFIGURATION.md)
- [Ghidul dezvoltatorului](./docs/DEVELOPER_GUIDE.md)
- [Cum creezi o aplicație nouă](./docs/HOW_TO_CREATE_NEW_APPLICATION.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Ghid de administrare și conținut](./docs/ADMINISTRATION_GUIDE.md)
- [Modelul de acces (Premium dezactivat)](./docs/PREMIUM_ACCESS_MODEL.md)
- [Pachetul de migrare Vercel + Supabase extern](./docs/migration/README.md)
