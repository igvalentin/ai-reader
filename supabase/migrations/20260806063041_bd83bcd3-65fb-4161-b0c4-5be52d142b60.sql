
CREATE TABLE public.vocational_dimensions (
  code text PRIMARY KEY,
  label text NOT NULL,
  short_label text NOT NULL,
  description text NOT NULL,
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  competencies text[] NOT NULL DEFAULT '{}',
  activities text[] NOT NULL DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vocational_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  dimension text NOT NULL REFERENCES public.vocational_dimensions(code) ON DELETE RESTRICT,
  order_index integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vocational_questions_order_idx ON public.vocational_questions (active, order_index);

CREATE TABLE public.vocational_professions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  r smallint NOT NULL DEFAULT 0,
  i smallint NOT NULL DEFAULT 0,
  a smallint NOT NULL DEFAULT 0,
  s smallint NOT NULL DEFAULT 0,
  e smallint NOT NULL DEFAULT 0,
  c smallint NOT NULL DEFAULT 0,
  education_level text,
  typical_salary text,
  demand_level text,
  future_outlook text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vocational_professions_active_idx ON public.vocational_professions (active);

CREATE TABLE public.vocational_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profession_id uuid NOT NULL REFERENCES public.vocational_professions(id) ON DELETE CASCADE,
  university text NOT NULL,
  faculty text NOT NULL,
  program text NOT NULL,
  city text NOT NULL,
  admission_link text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vocational_programs_profession_idx ON public.vocational_programs (profession_id, active);

CREATE TABLE public.vocational_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vocational_dimensions TO anon, authenticated;
GRANT SELECT ON public.vocational_questions TO anon, authenticated;
GRANT SELECT ON public.vocational_professions TO anon, authenticated;
GRANT SELECT ON public.vocational_programs TO anon, authenticated;
GRANT SELECT ON public.vocational_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vocational_dimensions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vocational_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vocational_professions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vocational_programs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vocational_content TO authenticated;
GRANT ALL ON public.vocational_dimensions TO service_role;
GRANT ALL ON public.vocational_questions TO service_role;
GRANT ALL ON public.vocational_professions TO service_role;
GRANT ALL ON public.vocational_programs TO service_role;
GRANT ALL ON public.vocational_content TO service_role;

ALTER TABLE public.vocational_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocational_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocational_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocational_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocational_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY vocational_dimensions_public_read ON public.vocational_dimensions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY vocational_dimensions_admin_write ON public.vocational_dimensions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY vocational_questions_public_read ON public.vocational_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY vocational_questions_admin_write ON public.vocational_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY vocational_professions_public_read ON public.vocational_professions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY vocational_professions_admin_write ON public.vocational_professions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY vocational_programs_public_read ON public.vocational_programs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY vocational_programs_admin_write ON public.vocational_programs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY vocational_content_public_read ON public.vocational_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY vocational_content_admin_write ON public.vocational_content FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER vocational_dimensions_set_updated_at BEFORE UPDATE ON public.vocational_dimensions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vocational_questions_set_updated_at BEFORE UPDATE ON public.vocational_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vocational_professions_set_updated_at BEFORE UPDATE ON public.vocational_professions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vocational_programs_set_updated_at BEFORE UPDATE ON public.vocational_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vocational_content_set_updated_at BEFORE UPDATE ON public.vocational_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.vocational_dimensions (code, label, short_label, description, strengths, weaknesses, competencies, activities, order_index) VALUES
('R', 'Realistic — Practic', 'Practic', 'Preferi lucrul concret, cu obiecte, unelte, mașini, plante sau animale. Îți plac rezultatele vizibile și activitățile în care poți folosi mâinile și corpul.',
 ARRAY['Îndemânare practică','Orientare spre rezultate concrete','Rezistență fizică și perseverență','Gândire tehnică aplicată'],
 ARRAY['Răbdare redusă la sarcini pur teoretice','Disconfort în roluri strict sociale sau de reprezentare'],
 ARRAY['Utilizarea uneltelor și echipamentelor','Citirea schemelor tehnice','Mentenanță și depanare','Norme de securitate a muncii'],
 ARRAY['Ateliere practice și cluburi de robotică','Proiecte DIY și reparații','Stagii în producție, construcții sau agricultură'], 10),
('I', 'Investigative — Analitic', 'Analitic', 'Îți place să cercetezi, să analizezi și să înțelegi cauzele. Ești atras de date, teorii, experimente și probleme fără soluție evidentă.',
 ARRAY['Gândire analitică și critică','Curiozitate intelectuală','Rigoare metodologică','Rezolvare de probleme complexe'],
 ARRAY['Tendința de a amâna decizia până la date complete','Disconfort în activități repetitive sau de rutină'],
 ARRAY['Statistică și analiză de date','Metodologia cercetării','Programare și modelare','Comunicarea rezultatelor științifice'],
 ARRAY['Olimpiade și concursuri științifice','Proiecte de cercetare','Cursuri online de matematică, fizică sau informatică'], 20),
('A', 'Artistic — Creativ', 'Creativ', 'Te exprimi prin creație: imagine, text, sunet, mișcare sau design. Preferi contextele flexibile, cu libertate de expresie.',
 ARRAY['Originalitate și imaginație','Sensibilitate estetică','Expresivitate','Gândire divergentă'],
 ARRAY['Dificultăți în medii foarte reglementate','Inconstanță când sarcina devine rutinieră'],
 ARRAY['Design și compoziție','Instrumente digitale de creație','Storytelling','Prezentarea portofoliului'],
 ARRAY['Construirea unui portofoliu personal','Cercuri de artă, teatru sau muzică','Concursuri creative și expoziții'], 30),
('S', 'Social — Orientat spre oameni', 'Social', 'Te împlinește să ajuți, să înveți pe alții și să lucrezi în echipă. Ești atent la nevoile celorlalți și comunici cu ușurință.',
 ARRAY['Empatie și ascultare activă','Comunicare interpersonală','Lucru în echipă','Răbdare didactică'],
 ARRAY['Risc de epuizare emoțională','Dificultate în a stabili limite sau a lua decizii impopulare'],
 ARRAY['Comunicare și mediere','Psihologia dezvoltării','Metode de predare și facilitare','Prim ajutor și etică profesională'],
 ARRAY['Voluntariat în ONG-uri','Mentorat pentru colegi mai mici','Proiecte comunitare și de educație'], 40),
('E', 'Enterprising — Antreprenorial', 'Antreprenorial', 'Îți place să conduci, să convingi și să pui în mișcare proiecte. Ești motivat de obiective, competiție și rezultate măsurabile.',
 ARRAY['Leadership și inițiativă','Persuasiune și negociere','Toleranță la risc','Orientare spre obiective'],
 ARRAY['Impulsivitate în decizii','Răbdare redusă la detalii operaționale'],
 ARRAY['Management de proiect','Vânzări și negociere','Finanțe pentru antreprenori','Public speaking'],
 ARRAY['Companii pentru elevi / studenți','Concursuri de business plan','Coordonarea unor evenimente sau echipe'], 50),
('C', 'Conventional — Organizat', 'Organizat', 'Lucrezi bine cu proceduri, date și documente. Îți place ordinea, acuratețea și predictibilitatea.',
 ARRAY['Atenție la detalii','Organizare și planificare','Consecvență','Acuratețea datelor'],
 ARRAY['Rezistență la schimbări bruște','Disconfort în situații ambigue, fără reguli clare'],
 ARRAY['Excel și baze de date','Contabilitate primară','Managementul documentelor','Control intern și conformitate'],
 ARRAY['Certificări de operare software','Stagii în back-office sau financiar','Organizarea evidențelor unui proiect'], 60);

INSERT INTO public.vocational_questions (text, dimension, order_index) VALUES
('Îmi place să repar obiecte stricate.', 'R', 1),
('Mă simt bine când lucrez cu unelte sau echipamente.', 'R', 2),
('Prefer activitățile practice în locul celor pur teoretice.', 'R', 3),
('Îmi place să lucrez în aer liber.', 'R', 4),
('Mă atrag mașinile, motoarele și mecanismele.', 'R', 5),
('Aș construi cu plăcere ceva cu mâinile mele.', 'R', 6),
('Îmi place activitatea fizică susținută.', 'R', 7),
('Mă descurc bine cu instrucțiuni tehnice și scheme.', 'R', 8),
('Aș lucra cu plăcere într-un atelier sau pe un șantier.', 'R', 9),
('Îmi place să întrețin și să reglez aparate.', 'R', 10),
('Îmi place să rezolv probleme complexe.', 'I', 11),
('Sunt curios să înțeleg cum funcționează lucrurile.', 'I', 12),
('Îmi place să analizez date și cifre.', 'I', 13),
('Mă atrag experimentele științifice.', 'I', 14),
('Citesc cu plăcere articole de știință.', 'I', 15),
('Îmi plac matematica și raționamentul logic.', 'I', 16),
('Prefer să documentez temeinic o problemă înainte de a decide.', 'I', 17),
('Mă interesează teoriile și explicațiile abstracte.', 'I', 18),
('Îmi place să lucrez la probleme care nu au o soluție evidentă.', 'I', 19),
('Aș lucra cu plăcere într-un laborator.', 'I', 20),
('Îmi place să desenez, să pictez sau să fotografiez.', 'A', 21),
('Mă exprim ușor prin scris.', 'A', 22),
('Îmi place să compun sau să interpretez muzică.', 'A', 23),
('Prefer sarcinile care îmi permit să fiu creativ.', 'A', 24),
('Mă atrag teatrul, filmul sau dansul.', 'A', 25),
('Îmi place să creez lucruri frumoase și bine proiectate.', 'A', 26),
('Am des idei originale.', 'A', 27),
('Mă simt limitat de reguli rigide.', 'A', 28),
('Îmi place să improvizez.', 'A', 29),
('Apreciez arta și estetica în viața de zi cu zi.', 'A', 30),
('Îmi place să îi ajut pe ceilalți.', 'S', 31),
('Mă simt bine când explic altora lucruri noi.', 'S', 32),
('Oamenii îmi cer des sfaturi.', 'S', 33),
('Îmi place să lucrez în echipă.', 'S', 34),
('Aș lucra cu plăcere cu copii sau adolescenți.', 'S', 35),
('Sunt atent la nevoile celor din jur.', 'S', 36),
('Îmi place să mediez conflicte.', 'S', 37),
('Mă atrag activitățile de voluntariat.', 'S', 38),
('Aș lucra cu plăcere în sănătate sau în educație.', 'S', 39),
('Ascult cu răbdare problemele altora.', 'S', 40),
('Îmi place să conduc un grup.', 'E', 41),
('Mă simt bine când conving pe cineva de ideea mea.', 'E', 42),
('Aș porni cu plăcere o afacere.', 'E', 43),
('Îmi plac competiția și provocările.', 'E', 44),
('Îmi asum ușor riscuri calculate.', 'E', 45),
('Îmi place să negociez.', 'E', 46),
('Mă atrag vânzările și promovarea.', 'E', 47),
('Îmi place să iau decizii rapide.', 'E', 48),
('Aș coordona cu plăcere un proiect mare.', 'E', 49),
('Mă motivează obiectivele ambițioase.', 'E', 50),
('Îmi plac ordinea și organizarea.', 'C', 51),
('Lucrez bine după proceduri clare.', 'C', 52),
('Îmi place să țin evidențe și liste.', 'C', 53),
('Sunt atent la detalii.', 'C', 54),
('Îmi place să lucrez cu tabele și documente.', 'C', 55),
('Prefer sarcinile cu reguli precise.', 'C', 56),
('Îmi place să îmi planific totul din timp.', 'C', 57),
('Mă simt bine într-un program stabil și previzibil.', 'C', 58),
('Aș lucra cu plăcere în contabilitate sau administrație.', 'C', 59),
('Verific de două ori ceea ce am lucrat.', 'C', 60);

INSERT INTO public.vocational_professions (name, description, r, i, a, s, e, c, education_level, typical_salary, demand_level, future_outlook) VALUES
('Inginer software', 'Proiectează, scrie și întreține aplicații și sisteme informatice.', 45, 95, 45, 30, 45, 60, 'Licență (Informatică / Calculatoare)', '8.000 – 20.000 lei net', 'Foarte ridicată', 'Creștere susținută, cu accent pe cloud și inteligență artificială.'),
('Analist de date', 'Transformă datele brute în rapoarte și decizii de business.', 25, 95, 30, 30, 45, 85, 'Licență (Statistică / Informatică economică)', '7.000 – 15.000 lei net', 'Foarte ridicată', 'Cerere în creștere în toate industriile.'),
('Medic', 'Diagnostichează și tratează pacienți; combină știința cu relația umană.', 55, 90, 25, 90, 40, 65, 'Medicină (6 ani) + rezidențiat', '6.000 – 20.000 lei net', 'Foarte ridicată', 'Deficit constant de personal medical.'),
('Asistent medical', 'Îngrijește pacienți și susține echipa medicală.', 60, 55, 20, 95, 30, 65, 'Postliceală sau licență (Asistență medicală)', '4.500 – 8.000 lei net', 'Foarte ridicată', 'Cerere ridicată intern și extern.'),
('Psiholog', 'Evaluează și sprijină persoane în dificultăți emoționale sau de dezvoltare.', 15, 80, 55, 95, 35, 45, 'Licență + master (Psihologie)', '4.000 – 10.000 lei net', 'Ridicată', 'Interes în creștere pentru sănătatea mintală.'),
('Profesor', 'Predă, evaluează și ghidează elevii în procesul de învățare.', 20, 70, 55, 95, 45, 60, 'Licență + modul psihopedagogic', '4.000 – 7.500 lei net', 'Ridicată', 'Deficit de cadre didactice, mai ales la discipline STEM.'),
('Arhitect', 'Proiectează clădiri, îmbinând estetica cu cerințele tehnice.', 65, 75, 90, 35, 55, 60, 'Arhitectură (6 ani)', '5.000 – 14.000 lei net', 'Medie', 'Legată de ciclul construcțiilor și de renovarea energetică.'),
('Designer grafic', 'Creează identități vizuale, materiale digitale și tipărite.', 25, 40, 95, 35, 45, 45, 'Licență (Arte / Design)', '4.000 – 10.000 lei net', 'Ridicată', 'Cerere susținută de marketingul digital.'),
('Designer UX/UI', 'Proiectează experiențe digitale utilizabile și estetice.', 25, 70, 85, 55, 50, 55, 'Licență (Design / Informatică) + portofoliu', '6.000 – 15.000 lei net', 'Ridicată', 'Rol tot mai important în produsele digitale.'),
('Jurnalist', 'Documentează, verifică și povestește evenimente de interes public.', 20, 70, 85, 60, 55, 45, 'Licență (Jurnalism / Comunicare)', '3.500 – 8.000 lei net', 'Medie', 'Transformare accelerată spre formate digitale.'),
('Avocat', 'Consiliază și reprezintă clienți în raporturi juridice.', 15, 80, 45, 65, 85, 80, 'Licență (Drept) + examen de admitere în barou', '5.000 – 20.000 lei net', 'Medie', 'Stabilă, cu nișe în drept digital și mediu.'),
('Contabil', 'Ține evidența financiară și asigură conformitatea fiscală.', 15, 55, 10, 30, 40, 98, 'Licență (Contabilitate / Finanțe)', '4.500 – 10.000 lei net', 'Ridicată', 'Automatizare parțială, dar cerere constantă.'),
('Auditor financiar', 'Verifică situațiile financiare și controlul intern.', 15, 75, 10, 35, 55, 95, 'Licență + certificare profesională', '7.000 – 16.000 lei net', 'Ridicată', 'Stabilă, cu cerere pentru raportarea de sustenabilitate.'),
('Analist financiar', 'Evaluează investiții, bugete și performanța companiilor.', 10, 85, 20, 30, 70, 90, 'Licență (Finanțe / Bănci)', '6.000 – 15.000 lei net', 'Ridicată', 'Bună, mai ales în servicii financiare.'),
('Antreprenor', 'Identifică oportunități și construiește o afacere de la zero.', 40, 60, 60, 55, 98, 55, 'Variabil', 'Foarte variabil', 'Ridicată', 'Depinde de sector; risc și potențial mari.'),
('Manager de proiect', 'Planifică, coordonează și livrează proiecte în termen și buget.', 30, 65, 40, 70, 85, 80, 'Licență + certificare (PMP / Prince2)', '8.000 – 18.000 lei net', 'Ridicată', 'Cerere constantă în IT, construcții și industrie.'),
('Specialist marketing digital', 'Planifică și optimizează campanii online.', 15, 65, 70, 55, 85, 65, 'Licență (Marketing / Comunicare)', '5.000 – 12.000 lei net', 'Ridicată', 'Creștere, cu accent pe date și automatizare.'),
('Reprezentant de vânzări', 'Identifică clienți, negociază și încheie contracte.', 25, 35, 30, 65, 95, 50, 'Liceu / Licență', '4.000 – 15.000 lei net (cu comision)', 'Ridicată', 'Stabilă în toate industriile.'),
('Specialist resurse umane', 'Recrutează, dezvoltă și administrează personalul.', 10, 55, 35, 85, 65, 80, 'Licență (Psihologie / Management)', '5.000 – 11.000 lei net', 'Medie', 'Stabilă, cu accent pe retenție și cultură organizațională.'),
('Inginer mecanic', 'Proiectează și optimizează sisteme și echipamente mecanice.', 90, 85, 30, 25, 45, 65, 'Licență (Inginerie mecanică)', '5.500 – 12.000 lei net', 'Ridicată', 'Bună, susținută de industria auto și de producție.'),
('Inginer electric / automatist', 'Proiectează instalații electrice și sisteme de automatizare.', 90, 85, 25, 25, 45, 70, 'Licență (Electric / Automatică)', '6.000 – 13.000 lei net', 'Foarte ridicată', 'Creștere, susținută de energie și automatizare.'),
('Inginer constructor', 'Proiectează și supraveghează execuția construcțiilor.', 85, 75, 40, 35, 60, 75, 'Licență (Construcții civile)', '5.500 – 13.000 lei net', 'Ridicată', 'Legată de infrastructură și fonduri europene.'),
('Electrician', 'Instalează și întreține instalații electrice.', 95, 45, 10, 30, 30, 55, 'Școală profesională / calificare', '4.000 – 9.000 lei net', 'Foarte ridicată', 'Deficit de meseriași calificați.'),
('Tehnician auto', 'Diagnostichează și repară autovehicule.', 95, 55, 15, 30, 35, 50, 'Școală profesională / liceu tehnologic', '4.000 – 9.000 lei net', 'Ridicată', 'Adaptare spre vehicule electrice și hibride.'),
('Agronom', 'Gestionează culturi și tehnologii agricole.', 85, 75, 20, 40, 55, 65, 'Licență (Agronomie)', '4.500 – 10.000 lei net', 'Medie', 'Susținută de digitalizarea agriculturii.'),
('Medic veterinar', 'Îngrijește și tratează animalele.', 80, 80, 20, 75, 45, 55, 'Medicină veterinară (6 ani)', '5.000 – 12.000 lei net', 'Ridicată', 'Cerere în creștere pentru animale de companie.'),
('Farmacist', 'Eliberează medicamente și consiliază pacienți.', 35, 80, 15, 70, 45, 90, 'Farmacie (5 ani)', '5.000 – 10.000 lei net', 'Ridicată', 'Stabilă.'),
('Kinetoterapeut', 'Recuperează funcțional pacienți prin exercițiu terapeutic.', 70, 60, 25, 90, 40, 50, 'Licență (Kinetoterapie)', '4.000 – 9.000 lei net', 'Ridicată', 'Creștere odată cu îmbătrânirea populației.'),
('Asistent social', 'Sprijină persoane și familii aflate în dificultate.', 15, 50, 30, 98, 45, 65, 'Licență (Asistență socială)', '3.800 – 7.000 lei net', 'Medie', 'Stabilă, în sistemul public și ONG.'),
('Cercetător științific', 'Desfășoară cercetare fundamentală sau aplicată.', 40, 98, 40, 35, 30, 65, 'Master + doctorat', '5.000 – 12.000 lei net', 'Medie', 'Depinde de finanțarea programelor de cercetare.'),
('Biolog', 'Studiază organismele vii și ecosistemele.', 55, 92, 30, 40, 25, 60, 'Licență (Biologie)', '4.000 – 9.000 lei net', 'Medie', 'Nișe în biotehnologie și mediu.'),
('Chimist', 'Analizează și dezvoltă substanțe și procese chimice.', 60, 92, 25, 30, 30, 70, 'Licență (Chimie)', '4.500 – 10.000 lei net', 'Medie', 'Bună în industria farmaceutică și materiale.'),
('Specialist securitate cibernetică', 'Protejează sistemele informatice împotriva atacurilor.', 50, 92, 30, 35, 50, 80, 'Licență (Informatică) + certificări', '9.000 – 22.000 lei net', 'Foarte ridicată', 'Creștere accelerată.'),
('Administrator de rețea / sisteme', 'Configurează și menține infrastructura IT.', 65, 80, 20, 40, 40, 80, 'Licență / certificări', '6.000 – 14.000 lei net', 'Ridicată', 'Stabilă, cu migrare spre cloud.'),
('Pilot', 'Operează aeronave în siguranță.', 85, 75, 20, 45, 55, 90, 'Școală de aviație + licențe', '15.000 – 40.000 lei net', 'Medie', 'Revenire post-pandemie, cerere în creștere.'),
('Bucătar', 'Creează și pregătește preparate culinare.', 80, 35, 70, 50, 50, 55, 'Școală profesională / calificare', '4.000 – 10.000 lei net', 'Ridicată', 'Cerere constantă în HoReCa.'),
('Arhitect peisagist', 'Proiectează spații verzi și amenajări exterioare.', 70, 60, 85, 40, 45, 55, 'Licență (Peisagistică)', '4.500 – 10.000 lei net', 'Medie', 'Creștere odată cu regenerarea urbană.'),
('Traducător / interpret', 'Transpune texte și discursuri între limbi.', 10, 65, 70, 55, 35, 70, 'Licență (Limbi moderne aplicate)', '3.800 – 9.000 lei net', 'Medie', 'Concurență cu traducerea automată; nișe specializate.'),
('Logistician', 'Optimizează fluxul de mărfuri și lanțul de aprovizionare.', 45, 65, 15, 40, 65, 90, 'Licență (Logistică / Economie)', '5.000 – 11.000 lei net', 'Ridicată', 'Creștere susținută de comerțul online.'),
('Notar / consilier juridic', 'Autentifică acte și consiliază juridic.', 10, 70, 15, 55, 60, 95, 'Licență (Drept) + examen', '7.000 – 20.000 lei net', 'Medie', 'Stabilă.');

INSERT INTO public.vocational_programs (profession_id, university, faculty, program, city)
SELECT p.id, v.university, v.faculty, v.program, v.city
FROM (VALUES
  ('Inginer software', 'Universitatea Politehnica din București', 'Automatică și Calculatoare', 'Calculatoare și Tehnologia Informației', 'București'),
  ('Inginer software', 'Universitatea Babeș-Bolyai', 'Matematică și Informatică', 'Informatică', 'Cluj-Napoca'),
  ('Inginer software', 'Universitatea Alexandru Ioan Cuza', 'Informatică', 'Informatică', 'Iași'),
  ('Analist de date', 'Academia de Studii Economice', 'Cibernetică, Statistică și Informatică Economică', 'Statistică și previziune economică', 'București'),
  ('Analist de date', 'Universitatea Babeș-Bolyai', 'Științe Economice și Gestiunea Afacerilor', 'Informatică economică', 'Cluj-Napoca'),
  ('Medic', 'UMF Carol Davila', 'Medicină', 'Medicină', 'București'),
  ('Medic', 'UMF Iuliu Hațieganu', 'Medicină', 'Medicină', 'Cluj-Napoca'),
  ('Asistent medical', 'UMF Grigore T. Popa', 'Medicină', 'Asistență medicală generală', 'Iași'),
  ('Psiholog', 'Universitatea din București', 'Psihologie și Științele Educației', 'Psihologie', 'București'),
  ('Psiholog', 'Universitatea Babeș-Bolyai', 'Psihologie și Științe ale Educației', 'Psihologie', 'Cluj-Napoca'),
  ('Profesor', 'Universitatea din București', 'Psihologie și Științele Educației', 'Pedagogia învățământului primar și preșcolar', 'București'),
  ('Arhitect', 'Universitatea de Arhitectură și Urbanism Ion Mincu', 'Arhitectură', 'Arhitectură', 'București'),
  ('Arhitect', 'Universitatea Tehnică din Cluj-Napoca', 'Arhitectură și Urbanism', 'Arhitectură', 'Cluj-Napoca'),
  ('Designer grafic', 'Universitatea Națională de Arte', 'Arte Plastice', 'Grafică', 'București'),
  ('Designer UX/UI', 'Universitatea Politehnica din București', 'Automatică și Calculatoare', 'Calculatoare', 'București'),
  ('Jurnalist', 'Universitatea din București', 'Jurnalism și Științele Comunicării', 'Jurnalism', 'București'),
  ('Avocat', 'Universitatea din București', 'Drept', 'Drept', 'București'),
  ('Avocat', 'Universitatea Babeș-Bolyai', 'Drept', 'Drept', 'Cluj-Napoca'),
  ('Contabil', 'Academia de Studii Economice', 'Contabilitate și Informatică de Gestiune', 'Contabilitate și informatică de gestiune', 'București'),
  ('Auditor financiar', 'Academia de Studii Economice', 'Contabilitate și Informatică de Gestiune', 'Audit financiar', 'București'),
  ('Analist financiar', 'Academia de Studii Economice', 'Finanțe, Asigurări, Bănci și Burse de Valori', 'Finanțe și bănci', 'București'),
  ('Antreprenor', 'Academia de Studii Economice', 'Administrarea Afacerilor', 'Administrarea afacerilor', 'București'),
  ('Manager de proiect', 'Academia de Studii Economice', 'Management', 'Management', 'București'),
  ('Specialist marketing digital', 'Academia de Studii Economice', 'Marketing', 'Marketing', 'București'),
  ('Specialist resurse umane', 'Universitatea din București', 'Sociologie și Asistență Socială', 'Resurse umane', 'București'),
  ('Inginer mecanic', 'Universitatea Politehnica din București', 'Inginerie Mecanică și Mecatronică', 'Inginerie mecanică', 'București'),
  ('Inginer electric / automatist', 'Universitatea Politehnica din București', 'Inginerie Electrică', 'Inginerie electrică', 'București'),
  ('Inginer electric / automatist', 'Universitatea Tehnică din Cluj-Napoca', 'Automatică și Calculatoare', 'Automatică și informatică aplicată', 'Cluj-Napoca'),
  ('Inginer constructor', 'Universitatea Tehnică de Construcții București', 'Construcții Civile, Industriale și Agricole', 'Construcții civile', 'București'),
  ('Agronom', 'USAMV București', 'Agricultură', 'Agricultură', 'București'),
  ('Medic veterinar', 'USAMV Cluj-Napoca', 'Medicină Veterinară', 'Medicină veterinară', 'Cluj-Napoca'),
  ('Farmacist', 'UMF Carol Davila', 'Farmacie', 'Farmacie', 'București'),
  ('Kinetoterapeut', 'UNEFS București', 'Kinetoterapie', 'Kinetoterapie și motricitate specială', 'București'),
  ('Asistent social', 'Universitatea din București', 'Sociologie și Asistență Socială', 'Asistență socială', 'București'),
  ('Cercetător științific', 'Universitatea din București', 'Fizică', 'Fizică', 'Măgurele'),
  ('Biolog', 'Universitatea din București', 'Biologie', 'Biologie', 'București'),
  ('Chimist', 'Universitatea Babeș-Bolyai', 'Chimie și Inginerie Chimică', 'Chimie', 'Cluj-Napoca'),
  ('Specialist securitate cibernetică', 'Universitatea Politehnica din București', 'Automatică și Calculatoare', 'Securitatea informației', 'București'),
  ('Administrator de rețea / sisteme', 'Universitatea Politehnica din Timișoara', 'Automatică și Calculatoare', 'Calculatoare și tehnologia informației', 'Timișoara'),
  ('Bucătar', 'Universitatea de Științe Agricole și Medicină Veterinară', 'Știința și Tehnologia Alimentelor', 'Tehnologia prelucrării produselor agricole', 'Cluj-Napoca'),
  ('Arhitect peisagist', 'USAMV București', 'Horticultură', 'Peisagistică', 'București'),
  ('Traducător / interpret', 'Universitatea Babeș-Bolyai', 'Litere', 'Limbi moderne aplicate', 'Cluj-Napoca'),
  ('Logistician', 'Academia de Studii Economice', 'Business și Turism', 'Logistică și management operațional', 'București'),
  ('Notar / consilier juridic', 'Universitatea Alexandru Ioan Cuza', 'Drept', 'Drept', 'Iași')
) AS v(profession, university, faculty, program, city)
JOIN public.vocational_professions p ON p.name = v.profession;

INSERT INTO public.vocational_content (key, value) VALUES
('faq', '[
  {"question":"Ce este testul RIASEC?","answer":"Este un chestionar de orientare profesională bazat pe modelul lui John Holland, care descrie interesele vocaționale prin șase dimensiuni: Realistic, Investigative, Artistic, Social, Enterprising și Conventional."},
  {"question":"Cum este calculată compatibilitatea cu profesiile?","answer":"Fiecare profesie are un profil RIASEC. Comparăm profilul tău cu cel al profesiei folosind similaritatea cosinus, o metodă matematică ce măsoară cât de asemănătoare sunt cele două tipare de interese, indiferent de intensitatea răspunsurilor."},
  {"question":"Este un test psihologic oficial?","answer":"Nu. Este un instrument orientativ de autocunoaștere. Nu înlocuiește o evaluare psihologică realizată de un specialist acreditat."},
  {"question":"Cât durează testul?","answer":"Aproximativ 10 minute. Sunt 60 de afirmații, iar rezultatele se actualizează în timp real, pe măsură ce răspunzi."},
  {"question":"Cum aleg facultatea potrivită?","answer":"Pornește de la profesiile cu compatibilitate ridicată, citește descrierile și verifică programele universitare recomandate. Combină rezultatul cu notele tale, cu interesele reale și cu discuții cu profesioniști din domeniu."},
  {"question":"Ce înseamnă codul Holland?","answer":"Este combinația primelor trei dimensiuni ale profilului tău, în ordine descrescătoare — de exemplu IAS. Rezumă în trei litere tiparul tău dominant de interese."}
]'::jsonb),
('texts', '{
  "heroTitle":"Calculator Vocațional — Alegerea Meseriei",
  "heroSubtitle":"Test de orientare profesională bazat pe modelul Holland (RIASEC). Descoperă ce meserii ți se potrivesc și ce facultăți din România te pot duce acolo.",
  "duration":"~10 minute",
  "ctaLabel":"Începe testul",
  "disclaimer":"Acest test reprezintă un instrument orientativ de autocunoaștere bazat pe modelul Holland (RIASEC) și nu constituie o evaluare psihologică oficială sau un test psihologic acreditat."
}'::jsonb),
('scoring', '{"minAnswer":1,"maxAnswer":5,"topProfessions":20,"hollandCodeLength":3}'::jsonb);
