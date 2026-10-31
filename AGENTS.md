<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## ImoIndex architecture
- Post-sign-in destinations use a browser-safe allowlist of existing routes and validated search criteria; never navigate to an arbitrary redirect string.
- Maintain the public sitemap as a static, reviewed file while the index has no published records; build scripts must not depend on the removed legacy sitemap generator.
- Real-estate domain schemas, scoring and source-policy validation live in `src/packages/imobiliare`; keep them browser-safe and unit tested to separate domain rules from presentation.
- Index reads and saved-search mutations use TanStack server functions with explicit public projections or authenticated RLS; never load the full index in the browser.
- The external database must be configured as a complete matching URL/key pair with no inherited-project fallback; migrations are staged separately from legacy Alevanta migrations and require target verification before application.
- Crawler contracts explicitly separate Lovable dry-run tests from Vercel production; source fetching stays disabled until approved adapters and durable execution are configured.
- ImoIndex admin health uses authenticated server functions and RLS; safety controls may pause sources or stop ingestion but cannot grant source permission.
- Apply the isolated clean profile/role foundation before index migrations; initial admin assignment is explicit and never inferred from signup metadata.
