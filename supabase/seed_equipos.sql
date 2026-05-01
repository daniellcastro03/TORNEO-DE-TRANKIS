-- ============================================================
-- SEED: Catálogos de Equipos por tipo de torneo
-- Ejecutar DESPUÉS del schema.sql
-- ============================================================

-- ==================== CHAMPIONS LEAGUE ====================
INSERT INTO catalogos_equipos (nombre, escudo_url, tipo_torneo) VALUES
  ('Real Madrid', 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', 'champions'),
  ('FC Barcelona', 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', 'champions'),
  ('Manchester City', 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', 'champions'),
  ('Liverpool FC', 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg', 'champions'),
  ('Bayern München', 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', 'champions'),
  ('Paris Saint-Germain', 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg', 'champions'),
  ('Juventus', 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Juventus_FC_-_pictogram.svg', 'champions'),
  ('AC Milan', 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg', 'champions'),
  ('Inter de Milán', 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg', 'champions'),
  ('Chelsea FC', 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg', 'champions'),
  ('Arsenal FC', 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg', 'champions'),
  ('Atlético de Madrid', 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg', 'champions'),
  ('Borussia Dortmund', 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg', 'champions'),
  ('SSC Napoli', 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg', 'champions'),
  ('Manchester United', 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg', 'champions'),
  ('Benfica', 'https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg', 'champions'),
  ('Porto FC', 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg', 'champions'),
  ('Ajax', 'https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg', 'champions'),
  ('RB Leipzig', 'https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg', 'champions'),
  ('Tottenham Hotspur', 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg', 'champions'),
  ('Sporting CP', 'https://upload.wikimedia.org/wikipedia/en/3/3e/Sporting_Clube_de_Portugal_%28Logo%29.svg', 'champions'),
  ('Sevilla FC', 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg', 'champions'),
  ('Shakhtar Donetsk', 'https://upload.wikimedia.org/wikipedia/en/a/a1/FC_Shakhtar_Donetsk.svg', 'champions'),
  ('Celtic FC', 'https://upload.wikimedia.org/wikipedia/en/3/35/Celtic_FC.svg', 'champions'),
  ('Galatasaray', 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.svg', 'champions'),
  ('Lazio', 'https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg', 'champions'),
  ('AS Roma', 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg', 'champions'),
  ('Olympique de Marseille', 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg', 'champions'),
  ('PSV Eindhoven', 'https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg', 'champions'),
  ('Feyenoord', 'https://upload.wikimedia.org/wikipedia/en/e/e3/Feyenoord_logo.svg', 'champions'),
  ('Real Sociedad', 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg', 'champions'),
  ('Bayer Leverkusen', 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg', 'champions');

-- ==================== MUNDIAL (Selecciones) ====================
INSERT INTO catalogos_equipos (nombre, escudo_url, tipo_torneo) VALUES
  ('Argentina', 'https://upload.wikimedia.org/wikipedia/en/c/c1/Argentina_national_football_team_logo.svg', 'mundial'),
  ('Brasil', 'https://upload.wikimedia.org/wikipedia/en/1/1b/Football_Association_of_Brazil_logo.svg', 'mundial'),
  ('Francia', 'https://upload.wikimedia.org/wikipedia/en/1/12/French_Football_Federation_logo.svg', 'mundial'),
  ('Alemania', 'https://upload.wikimedia.org/wikipedia/en/e/e3/DFBEagle.svg', 'mundial'),
  ('España', 'https://upload.wikimedia.org/wikipedia/en/3/3d/RFEF_logo.svg', 'mundial'),
  ('Inglaterra', 'https://upload.wikimedia.org/wikipedia/en/b/be/Football_Association_England_logo.svg', 'mundial'),
  ('Italia', 'https://upload.wikimedia.org/wikipedia/en/9/98/Logo_of_the_Italian_Football_Federation.svg', 'mundial'),
  ('Portugal', 'https://upload.wikimedia.org/wikipedia/en/4/4e/Portuguese_Football_Federation_logo.svg', 'mundial'),
  ('Países Bajos', 'https://upload.wikimedia.org/wikipedia/en/1/1f/Royal_Dutch_Football_Association_Logo.svg', 'mundial'),
  ('Bélgica', 'https://upload.wikimedia.org/wikipedia/en/3/3f/Royal_Belgian_Football_Association_logo.svg', 'mundial'),
  ('Croacia', 'https://upload.wikimedia.org/wikipedia/en/5/5c/Croatian_Football_Federation_logo.svg', 'mundial'),
  ('Uruguay', 'https://upload.wikimedia.org/wikipedia/en/4/4b/Uruguayan_Football_Association_logo.svg', 'mundial'),
  ('Colombia', 'https://upload.wikimedia.org/wikipedia/en/a/ab/Colombian_Football_Federation_logo.svg', 'mundial'),
  ('México', 'https://upload.wikimedia.org/wikipedia/en/5/50/Mexican_Football_Federation_logo.svg', 'mundial'),
  ('Estados Unidos', 'https://upload.wikimedia.org/wikipedia/en/5/5c/United_States_Soccer_Federation_logo.svg', 'mundial'),
  ('Japón', 'https://upload.wikimedia.org/wikipedia/en/6/6e/Japan_Football_Association_logo.svg', 'mundial'),
  ('Corea del Sur', 'https://upload.wikimedia.org/wikipedia/en/5/52/Korea_Football_Association_logo.svg', 'mundial'),
  ('Australia', 'https://upload.wikimedia.org/wikipedia/en/8/80/Football_Australia_logo.svg', 'mundial'),
  ('Marruecos', 'https://upload.wikimedia.org/wikipedia/en/f/f6/Royal_Moroccan_Football_Federation_logo.svg', 'mundial'),
  ('Senegal', 'https://upload.wikimedia.org/wikipedia/en/3/32/Senegalese_Football_Federation_logo.svg', 'mundial'),
  ('Ghana', 'https://upload.wikimedia.org/wikipedia/en/0/04/Ghana_Football_Association_logo.svg', 'mundial'),
  ('Camerún', 'https://upload.wikimedia.org/wikipedia/en/d/d4/Cameroon_Football_Federation_logo.svg', 'mundial'),
  ('Nigeria', 'https://upload.wikimedia.org/wikipedia/en/1/10/Nigeria_Football_Federation_logo.svg', 'mundial'),
  ('Ecuador', 'https://upload.wikimedia.org/wikipedia/en/c/c4/Ecuadorian_Football_Federation_logo.svg', 'mundial'),
  ('Chile', 'https://upload.wikimedia.org/wikipedia/en/d/d4/Chilean_Football_Federation_logo.svg', 'mundial'),
  ('Paraguay', 'https://upload.wikimedia.org/wikipedia/en/5/52/Paraguayan_Football_Association_logo.svg', 'mundial'),
  ('Perú', 'https://upload.wikimedia.org/wikipedia/en/3/3e/Peruvian_Football_Federation_logo.svg', 'mundial'),
  ('Costa Rica', 'https://upload.wikimedia.org/wikipedia/en/f/f4/Costa_Rica_Football_Federation_logo.svg', 'mundial'),
  ('Honduras', 'https://upload.wikimedia.org/wikipedia/en/a/a4/Honduran_Football_Federation_logo.svg', 'mundial'),
  ('Canadá', 'https://upload.wikimedia.org/wikipedia/en/b/b1/Canada_Soccer_Logo.svg', 'mundial'),
  ('Arabia Saudita', 'https://upload.wikimedia.org/wikipedia/en/a/a0/Saudi_Arabian_Football_Federation_logo.svg', 'mundial'),
  ('Suiza', 'https://upload.wikimedia.org/wikipedia/en/4/45/Swiss_Football_Association_Logo.svg', 'mundial');

-- ==================== LIGA - La Liga ====================
INSERT INTO catalogos_equipos (nombre, escudo_url, tipo_torneo, liga) VALUES
  ('Real Madrid', 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', 'liga', 'la_liga'),
  ('FC Barcelona', 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', 'liga', 'la_liga'),
  ('Atlético de Madrid', 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg', 'liga', 'la_liga'),
  ('Sevilla FC', 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg', 'liga', 'la_liga'),
  ('Real Sociedad', 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg', 'liga', 'la_liga'),
  ('Real Betis', 'https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg', 'liga', 'la_liga'),
  ('Villarreal CF', 'https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg', 'liga', 'la_liga'),
  ('Athletic Bilbao', 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg', 'liga', 'la_liga'),
  ('Valencia CF', 'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg', 'liga', 'la_liga'),
  ('RC Celta de Vigo', 'https://upload.wikimedia.org/wikipedia/en/1/12/RC_Celta_de_Vigo_logo.svg', 'liga', 'la_liga');

-- ==================== LIGA - Premier League ====================
INSERT INTO catalogos_equipos (nombre, escudo_url, tipo_torneo, liga) VALUES
  ('Manchester City', 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg', 'liga', 'premier_league'),
  ('Arsenal FC', 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg', 'liga', 'premier_league'),
  ('Liverpool FC', 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg', 'liga', 'premier_league'),
  ('Chelsea FC', 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg', 'liga', 'premier_league'),
  ('Manchester United', 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg', 'liga', 'premier_league'),
  ('Tottenham Hotspur', 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg', 'liga', 'premier_league'),
  ('Newcastle United', 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg', 'liga', 'premier_league'),
  ('Aston Villa', 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg', 'liga', 'premier_league'),
  ('West Ham United', 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg', 'liga', 'premier_league'),
  ('Brighton', 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg', 'liga', 'premier_league');

-- ==================== LIBRE (General) ====================
-- In 'libre' type, ALL teams from other catalogs are available
-- Plus some extra teams
INSERT INTO catalogos_equipos (nombre, escudo_url, tipo_torneo) VALUES
  ('Flamengo', 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg', 'libre'),
  ('River Plate', 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Escudo_del_C_A_River_Plate.svg', 'libre'),
  ('Boca Juniors', 'https://upload.wikimedia.org/wikipedia/commons/4/41/Boca_Juniors_logo18.svg', 'libre'),
  ('Olimpia', 'https://upload.wikimedia.org/wikipedia/en/2/23/Club_Olimpia_logo.svg', 'libre'),
  ('Al-Hilal', 'https://upload.wikimedia.org/wikipedia/en/3/34/Al-Hilal_FC_logo.svg', 'libre'),
  ('Palmeiras', 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg', 'libre'),
  ('Santos FC', 'https://upload.wikimedia.org/wikipedia/commons/1/15/Santos_Logo.svg', 'libre'),
  ('Club América', 'https://upload.wikimedia.org/wikipedia/commons/6/63/Club_America_Logo.svg', 'libre'),
  ('Peñarol', 'https://upload.wikimedia.org/wikipedia/commons/5/57/Pe%C3%B1arol_logo.svg', 'libre'),
  ('Nacional', 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Nacional_Montevideo.svg', 'libre');
