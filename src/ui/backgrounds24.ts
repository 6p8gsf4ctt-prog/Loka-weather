/** LOKA V24 — registre des 24 masters officiels.
 * Les PNG sont servis comme Static Assets Cloudflare depuis /public/masters24.
 * Le numéro de scène est l’identifiant stable.
 */
export interface Scene24Master {
  id: number;
  label: string;
  file: string;
  url: string;
  description: string;
  sha256: string;
}

export const SCENE24_MASTERS: readonly Scene24Master[] = [
  {"id": 1, "label": "GRAND SOLEIL", "file": "01_GRAND_SOLEIL.png", "url": "/masters24/01_GRAND_SOLEIL.png", "description": "Ciel très dégagé, journée lumineuse et stable.", "sha256": "baf09520ff874b72be7c97e8f7b608daffd67e0fbc5955957d68aa05f18a7ffb"},
  {"id": 2, "label": "SOLEIL VOILÉ", "file": "02_SOLEIL_VOILE.png", "url": "/masters24/02_SOLEIL_VOILE.png", "description": "Soleil présent sous un voile léger, lumière douce.", "sha256": "254da8a9fcc6353a01512cad892090d5483e24679a3a0cb30c62464675c7bb5e"},
  {"id": 3, "label": "ÉCLAIRCIES", "file": "03_ECLAIRCIES.png", "url": "/masters24/03_ECLAIRCIES.png", "description": "Alternance de passages nuageux et d'ouvertures lumineuses.", "sha256": "14c7184fa01a3c9a596c6a82a8b3f38972c52d9b9dfcff80076657b08e7702f6"},
  {"id": 4, "label": "VARIABLE LUMINEUX", "file": "04_VARIABLE_LUMINEUX.png", "url": "/masters24/04_VARIABLE_LUMINEUX.png", "description": "Ciel changeant mais lumineux, éclaircies fréquentes.", "sha256": "3971e910682a4acf1c748838b791d1fe370f0040130bc4d016499b6be314a28f"},
  {"id": 5, "label": "DÉGRADATION", "file": "05_DEGRADATION.png", "url": "/masters24/05_DEGRADATION.png", "description": "Le ciel se charge progressivement au fil de la journée.", "sha256": "4335bf7e18b677f0285a383edaf47af9e9c5e343cbf3bc7c0bd3679d02435bd1"},
  {"id": 6, "label": "SOLEIL + VENT", "file": "06_SOLEIL_PLUS_VENT.png", "url": "/masters24/06_SOLEIL_PLUS_VENT.png", "description": "Temps lumineux avec vent sensible et ciel mobile.", "sha256": "79a9e97c5ee8aa7df7ff0dffd1511ba94e7f4bb6a9a845eb1f73bf53fe9798c8"},
  {"id": 7, "label": "SOLEIL VOILÉ DENSE", "file": "07_SOLEIL_VOILE_DENSE.png", "url": "/masters24/07_SOLEIL_VOILE_DENSE.png", "description": "Lumière blanche très filtrée, voile épais et temps calme.", "sha256": "0b2e23e0c2fd44c8818cac9bfde23ac1f4d56a8c2392089023268e9f449b160c"},
  {"id": 8, "label": "BRUME / BROUILLARD", "file": "08_BRUME_BROUILLARD.png", "url": "/masters24/08_BRUME_BROUILLARD.png", "description": "Visibilité réduite, ambiance grise et uniforme.", "sha256": "e2ebe4249c35e70ec21795bf4d6c72caf92a5a17a630829ffd65961ac9e43d57"},
  {"id": 9, "label": "COUVERT", "file": "09_COUVERT.png", "url": "/masters24/09_COUVERT.png", "description": "Ciel bas et couvert, lumière faible mais temps plutôt stable.", "sha256": "12f88cf926f85f6cae435ec9dd8e0b893f04f0944bdb87437e9e7a2b567dd15d"},
  {"id": 10, "label": "VENT FORT", "file": "10_VENT_FORT.png", "url": "/masters24/10_VENT_FORT.png", "description": "Atmosphère très mobile, vent soutenu et ciel changeant.", "sha256": "ba273aa88a955b06a53034726a180f6d4a336d5646e230411edf55b8ad2b1e47"},
  {"id": 11, "label": "AMÉLIORATION", "file": "11_AMELIORATION.png", "url": "/masters24/11_AMELIORATION.png", "description": "Les éclaircies gagnent du terrain et la lumière revient.", "sha256": "9f982f10e5ebfe9b91cdac92987ba543c643630e5ce8fcbba8d4d63a9870297c"},
  {"id": 12, "label": "PLUIE SOUTENUE", "file": "12_PLUIE_SOUTENUE.png", "url": "/masters24/12_PLUIE_SOUTENUE.png", "description": "Pluie durable, continue et régulière, sans vent dominant.", "sha256": "9f4b338abece107b16f02de10c8596b720077e5dd6dce72f554b3bbce1ee4230"},
  {"id": 13, "label": "AVERSES", "file": "13_AVERSES.png", "url": "/masters24/13_AVERSES.png", "description": "Averses localisées, séparées par de vraies accalmies.", "sha256": "759cc09c6a840cfbe94737337e304403349818ec726e9f3c3c37324fd1052cbc"},
  {"id": 14, "label": "ÉCLAIRCIES + VENT", "file": "14_ECLAIRCIES_PLUS_VENT.png", "url": "/masters24/14_ECLAIRCIES_PLUS_VENT.png", "description": "Alternance lumineuse avec vent marqué et ciel mobile.", "sha256": "d40ff8aa9cfab048253e62a7584d5fe67cbb72a73599996ccf485cc2fd539228"},
  {"id": 15, "label": "AMÉLIORATION LUMINEUSE", "file": "15_AMELIORATION_LUMINEUSE.png", "url": "/masters24/15_AMELIORATION_LUMINEUSE.png", "description": "La lumière domine, les derniers nuages se retirent.", "sha256": "f9f5987fbc7c7a0a648dc3aaaf8f9cba193dba73befd6ba11e394c7d773ecf89"},
  {"id": 16, "label": "SOLEIL + PASSAGES NUAGEUX", "file": "16_SOLEIL_PLUS_PASSAGES_NUAGEUX.png", "url": "/masters24/16_SOLEIL_PLUS_PASSAGES_NUAGEUX.png", "description": "Beau temps dominant avec quelques passages temporaires.", "sha256": "854435a1c9f164ff9ad91a4db71fc642e2a10408db0ba0cde3717ffc853e09fb"},
  {"id": 17, "label": "BROUILLARD DENSE", "file": "17_BROUILLARD_DENSE.png", "url": "/masters24/17_BROUILLARD_DENSE.png", "description": "Matière diffuse et compacte, visibilité très fortement réduite.", "sha256": "ce39812fba959bbc89917124742f1d6e9295565ab87dcf5207da2a008f726450"},
  {"id": 18, "label": "VARIABLE", "file": "18_VARIABLE.png", "url": "/masters24/18_VARIABLE.png", "description": "Alternance régulière de zones claires et plus nuageuses.", "sha256": "54d2cf12311ad38f69391195bbc7c540dca1a9c8c426a9e65c19d01941db3fea"},
  {"id": 19, "label": "INSTABLE", "file": "19_INSTABLE.png", "url": "/masters24/19_INSTABLE.png", "description": "Changements rapides et désordonnés, sans phénomène dominant.", "sha256": "5e8827678f3be3ac05048fb251ee55bf2e1bc6e31bfe7b6d03d076d9a2597e71"},
  {"id": 20, "label": "NUAGEUX + VENT", "file": "20_NUAGEUX_PLUS_VENT.png", "url": "/masters24/20_NUAGEUX_PLUS_VENT.png", "description": "Ciel chargé avec mouvement soutenu et vent bien présent.", "sha256": "6f8f39189387bfbbfa0a579eba29b69d38009d02c04ec2dfdb17f9e7b2e36567"},
  {"id": 21, "label": "GRANDES ÉCLAIRCIES", "file": "21_GRANDES_ECLAIRCIES.png", "url": "/masters24/21_GRANDES_ECLAIRCIES.png", "description": "De larges trouées lumineuses s'ouvrent dans un ciel encore partagé.", "sha256": "73ea62b6e47dadd420c79b1f12d3bb2bf07eeac214ff1894e4da5f5bd6eaa4f0"},
  {"id": 22, "label": "ORAGEUX", "file": "22_ORAGEUX.png", "url": "/masters24/22_ORAGEUX.png", "description": "Atmosphère lourde et menaçante, forte instabilité possible.", "sha256": "f4d48f3fb79111056b4a4ad05bdfb93675760ba0285c0713ca9698b42fb8317e"},
  {"id": 23, "label": "COUVERT DENSE", "file": "23_COUVERT_DENSE.png", "url": "/masters24/23_COUVERT_DENSE.png", "description": "Couverture nuageuse épaisse et uniforme, lumière atténuée.", "sha256": "1989013a632b5c874693cbef88b592d0f7121e54edbee77bc37674fabedb2fcc"},
  {"id": 24, "label": "PLUIE + VENT", "file": "24_PLUIE_PLUS_VENT.png", "url": "/masters24/24_PLUIE_PLUS_VENT.png", "description": "Pluie poussée par le vent, conditions humides et agitées.", "sha256": "c16e98edc45a1cc4bdd9d3a97855de3b195c90bcd1734ffec9ef97977225687b"},
] as const;

export const SCENE24_MASTER_BY_ID: Readonly<Record<number, Scene24Master>> = Object.freeze(
  Object.fromEntries(SCENE24_MASTERS.map((scene) => [scene.id, scene])) as Record<number, Scene24Master>
);
