/**
 * The French demo corpus: what the jury reads on screen. Volumes are
 * load-bearing — the services and incidents lists only reveal their "load more"
 * control past 20 rows per filter, so dropping entries here quietly changes
 * what the demo shows.
 */

export type ServiceType = "free" | "paid" | "exchange";
export type ServiceDirection = "offer" | "request";

export interface ServiceSeed {
  title: string;
  description: string;
  category: string;
  type: ServiceType;
  direction: ServiceDirection;
  /** Mandatory server-side as soon as type is "paid". */
  duration?: number;
  status?: "closed";
  /** Omitted means the demo neighborhood. */
  neighborhood?: string;
  /** Pinned when the demo depends on whose listing it is. */
  author?: string;
}

export interface IncidentSeed {
  title: string;
  description: string;
  category: "neighborhood" | "reporting" | "bug";
  /** Reached through the state machine after creation, which always starts open. */
  status: "open" | "in_progress" | "resolved";
  neighborhood?: string;
  /** Pinned when the demo depends on who reported it. */
  author?: string;
}

export interface EventSeed {
  title: string;
  description: string;
  category: "culture" | "sport" | "community" | "education" | "other";
  /** Negative for past editions. */
  inDays: number;
  neighborhood?: string;
}

export interface VoteSeed {
  title: string;
  description: string;
  voteType: "binary" | "single_choice" | "multiple_choice" | "weighted";
  options: Array<{ id: string; label: string }>;
  endsInDays: number;
  /** Drives the "already voted" badge on Alice's screen. */
  aliceVotes: boolean;
  closed: boolean;
}

const YES_NO = [
  { id: "oui", label: "Oui" },
  { id: "non", label: "Non" },
];

export const SERVICES: ServiceSeed[] = [
  {
    title: "Tonte et taille de haies le samedi matin",
    description:
      "Je passe le samedi matin pour tondre, tailler les haies et ramasser les déchets verts. J'apporte mon matériel.",
    category: "gardening",
    type: "exchange",
    direction: "offer",
  },
  {
    title: "Montage de meubles en kit",
    description:
      "Armoires, bibliothèques, lits : je monte vos meubles en kit proprement, visserie et outillage fournis.",
    category: "handyman",
    type: "paid",
    duration: 90,
    direction: "offer",
  },
  {
    title: "Covoiturage vers le marché d'Aligre",
    description:
      "Je descends au marché d'Aligre le samedi matin, deux places libres à l'aller comme au retour.",
    category: "transport",
    type: "free",
    direction: "offer",
  },
  {
    title: "Courses pour les voisins qui ne sortent plus",
    description:
      "Je fais mes courses le mardi et le vendredi, je peux prendre la liste d'un voisin au passage.",
    category: "shopping",
    type: "free",
    direction: "offer",
  },
  {
    title: "Garde d'enfants après l'école",
    description:
      "Je récupère les enfants à la sortie de l'école et je les garde jusqu'au retour des parents, goûter compris.",
    category: "childcare",
    type: "paid",
    duration: 120,
    direction: "offer",
  },
  {
    title: "Dépannage informatique à domicile",
    description:
      "Ordinateur lent, imprimante qui ne répond plus, boîte mail bloquée : je viens régler ça chez vous.",
    category: "it-support",
    type: "paid",
    duration: 60,
    direction: "offer",
  },
  {
    title: "Cours de guitare pour débutants",
    description:
      "Premiers accords, rythmiques simples et lecture de tablatures. Guitare de prêt disponible.",
    category: "other",
    type: "paid",
    duration: 60,
    direction: "offer",
    status: "closed",
  },
  {
    title: "Arrosage des plantes pendant les vacances",
    description:
      "Je passe deux fois par semaine arroser vos plantes et relever le courrier pendant votre absence.",
    category: "gardening",
    type: "free",
    direction: "offer",
  },
  {
    title: "Réparation de vélos entre voisins",
    description:
      "Crevaison, dérailleur déréglé, freins qui frottent : atelier improvisé dans la cour le dimanche.",
    category: "handyman",
    type: "exchange",
    direction: "offer",
  },
  {
    title: "Aide au déménagement de petit volume",
    description:
      "Un camion de 12 m³ et deux bras pour les cartons et les meubles légers, sur une demi-journée.",
    category: "handyman",
    type: "paid",
    duration: 180,
    direction: "offer",
  },
  {
    title: "Soutien scolaire en mathématiques",
    description:
      "Niveau collège et seconde. Reprise des bases, méthode et préparation aux contrôles.",
    category: "other",
    type: "exchange",
    direction: "offer",
  },
  {
    title: "Promenade de chiens en semaine",
    description:
      "Sortie d'une heure en fin de matinée, jusqu'au square. Je m'occupe de deux chiens maximum.",
    category: "other",
    type: "free",
    direction: "offer",
  },
  {
    title: "Pose d'étagères et de fixations murales",
    description:
      "Perçage dans le plâtre comme dans la pierre meulière, chevilles adaptées et niveau à bulle.",
    category: "handyman",
    type: "paid",
    duration: 90,
    direction: "offer",
    status: "closed",
  },
  {
    title: "Transport d'encombrants en déchèterie",
    description:
      "J'ai un utilitaire le week-end, je peux emmener votre vieux canapé ou votre électroménager.",
    category: "transport",
    type: "exchange",
    direction: "offer",
  },
  {
    title: "Initiation à la couture et retouches",
    description:
      "Ourlets, boutons, reprises. Machine à disposition et petits patrons pour commencer.",
    category: "other",
    type: "exchange",
    direction: "offer",
  },
  {
    title: "Aide aux démarches administratives en ligne",
    description:
      "Déclaration d'impôts, CAF, prise de rendez-vous en préfecture : je vous accompagne pas à pas.",
    category: "it-support",
    type: "free",
    direction: "offer",
  },
  {
    title: "Prêt d'outils de jardinage",
    description:
      "Sécateur, bêche, taille-haie thermique et brouette disponibles contre un simple message.",
    category: "gardening",
    type: "free",
    direction: "offer",
  },
  {
    title: "Conversation en anglais autour d'un café",
    description:
      "Une heure d'échange pour entretenir son anglais oral, tous niveaux, sans jugement.",
    category: "other",
    type: "paid",
    duration: 60,
    direction: "offer",
  },
  {
    title: "Peinture de petites surfaces",
    description:
      "Un couloir, une chambre ou des boiseries : préparation du support, sous-couche et deux couches.",
    category: "handyman",
    type: "paid",
    duration: 120,
    direction: "offer",
  },
  {
    title: "Transport de courses lourdes jusqu'à l'étage",
    description:
      "Packs d'eau, sacs de terreau, cartons : je monte tout ça avec vous, immeubles sans ascenseur compris.",
    category: "transport",
    type: "paid",
    duration: 45,
    direction: "offer",
  },
  {
    title: "Baby-sitting le week-end",
    description:
      "Étudiante en licence, expérience avec les 3-10 ans, disponible samedi et dimanche soir.",
    category: "childcare",
    type: "paid",
    duration: 240,
    direction: "offer",
    status: "closed",
  },
  {
    title: "Sauvegarde et nettoyage d'ordinateur",
    description:
      "Sauvegarde de vos photos sur disque externe, désinstallation des logiciels inutiles, mises à jour.",
    category: "it-support",
    type: "exchange",
    direction: "offer",
  },
  {
    title: "Livraison de pain aux voisins isolés",
    description:
      "Je passe à la boulangerie tous les matins, je peux déposer une baguette en montant.",
    category: "shopping",
    type: "free",
    direction: "offer",
  },
  {
    title: "Cherche un coup de main pour tailler un figuier",
    description:
      "Le figuier de la cour dépasse sur le balcon du voisin, il faut le rabattre avant l'automne.",
    category: "gardening",
    type: "exchange",
    direction: "request",
  },
  {
    title: "Recherche quelqu'un pour poser une tringle à rideaux",
    description:
      "Murs anciens et plafond haut, je n'ai ni escabeau ni perceuse adaptée.",
    category: "handyman",
    type: "paid",
    duration: 60,
    direction: "request",
  },
  {
    title: "Besoin d'un trajet vers Roissy tôt le matin",
    description:
      "Vol à 7h le 14, départ souhaité vers 4h30. Je participe volontiers aux frais de péage.",
    category: "transport",
    type: "paid",
    duration: 90,
    direction: "request",
  },
  {
    title: "Cherche accompagnement pour les courses hebdomadaires",
    description:
      "Ma mère de 84 ans a besoin de quelqu'un pour l'accompagner au supermarché le jeudi.",
    category: "shopping",
    type: "free",
    direction: "request",
  },
  {
    title: "Recherche garde d'enfant le mercredi",
    description:
      "Deux enfants de 5 et 8 ans, de 9h à 14h, jeux et sortie au square si le temps le permet.",
    category: "childcare",
    type: "paid",
    duration: 300,
    direction: "request",
  },
  {
    title: "Besoin d'aide pour configurer une box internet",
    description:
      "Nouvelle box livrée depuis une semaine, je n'arrive pas à brancher le décodeur télé.",
    category: "it-support",
    type: "free",
    direction: "request",
  },
  {
    title: "Cherche professeur de piano pour ma fille",
    description:
      "Débutante de 9 ans, piano droit à la maison, une séance par semaine après l'école.",
    category: "other",
    type: "paid",
    duration: 60,
    direction: "request",
  },
  {
    title: "Recherche aide pour désherber une cour pavée",
    description:
      "Les herbes reprennent entre les pavés, il faudrait une matinée à deux pour en venir à bout.",
    category: "gardening",
    type: "free",
    direction: "request",
  },
  {
    title: "Cherche un coup de main pour monter un lit",
    description:
      "Lit deux places livré en pièces détachées, impossible à assembler seule.",
    category: "handyman",
    type: "exchange",
    direction: "request",
  },
  {
    title: "Besoin d'un covoiturage le dimanche matin",
    description:
      "Je vais au marché de Barbès chaque dimanche, une place au retour m'arrangerait bien.",
    category: "transport",
    type: "free",
    direction: "request",
  },
  {
    title: "Recherche quelqu'un pour nourrir mon chat",
    description:
      "Absente une semaine en août, il faut passer une fois par jour remplir les gamelles.",
    category: "other",
    type: "exchange",
    direction: "request",
    status: "closed",
  },
  {
    title: "Cherche aide pour trier des archives familiales",
    description:
      "Des cartons de papiers et de photos à trier et à ranger, du temps et de la patience surtout.",
    category: "other",
    type: "free",
    direction: "request",
  },
  {
    title: "Besoin d'une personne pour repeindre un couloir",
    description:
      "Environ 12 m² de murs, peinture déjà achetée, il manque juste la main-d'œuvre.",
    category: "handyman",
    type: "paid",
    duration: 180,
    direction: "request",
  },
  {
    title: "Recherche le prêt d'une perceuse à percussion",
    description:
      "Deux trous à faire dans un mur porteur, je rends l'outil dans la journée.",
    category: "handyman",
    type: "exchange",
    direction: "request",
  },
  {
    title: "Cherche aide pour rédiger un CV",
    description:
      "Je reprends une activité après plusieurs années, j'ai besoin d'un regard extérieur sur mon CV.",
    category: "it-support",
    type: "free",
    direction: "request",
    status: "closed",
  },
  {
    title: "Besoin de quelqu'un pour arroser mes plantes en juillet",
    description:
      "Une quinzaine de pots sur le balcon, deux passages par semaine suffisent.",
    category: "gardening",
    type: "free",
    direction: "request",
  },
  {
    title: "Recherche accompagnement à un rendez-vous médical",
    description:
      "Consultation à Lariboisière le 8, j'aimerais ne pas y aller seule après l'opération.",
    category: "other",
    type: "free",
    direction: "request",
  },
  {
    title: "Cherche un covoiturage vers Montreuil",
    description:
      "Trajet régulier le lundi et le jeudi en fin de journée, je peux conduire une fois sur deux.",
    category: "transport",
    type: "exchange",
    direction: "request",
  },
  {
    title: "Besoin d'aide pour installer une imprimante",
    description:
      "Imprimante wifi achetée hier, elle refuse de se connecter au réseau de la maison.",
    category: "it-support",
    type: "paid",
    duration: 45,
    direction: "request",
  },
  {
    title: "Recherche baby-sitter pour une soirée",
    description:
      "Samedi 20h-minuit, un enfant de 6 ans déjà couché, il faut juste rester à la maison.",
    category: "childcare",
    type: "paid",
    duration: 240,
    direction: "request",
  },
  {
    title: "Cherche quelqu'un pour monter des courses au 5e sans ascenseur",
    description:
      "Livraison hebdomadaire déposée au rez-de-chaussée, je n'arrive plus à tout monter.",
    category: "shopping",
    type: "exchange",
    direction: "request",
    status: "closed",
  },
  {
    title: "Besoin d'un dépannage pour un robinet qui fuit",
    description:
      "Goutte-à-goutte permanent sous l'évier, le joint est probablement à changer.",
    category: "handyman",
    type: "paid",
    duration: 60,
    direction: "request",
  },
  {
    title: "Recherche du soutien en français pour un lycéen",
    description:
      "Préparation de l'oral du bac de français, travail sur le commentaire et la lecture linéaire.",
    category: "other",
    type: "exchange",
    direction: "request",
  },
  {
    title: "Réparation de petit électroménager",
    description:
      "Grille-pain, bouilloire, aspirateur : je diagnostique et je répare quand c'est possible.",
    category: "handyman",
    type: "exchange",
    direction: "offer",
    neighborhood: "Marais",
  },
  {
    title: "Cours de cuisine végétarienne",
    description:
      "Trois recettes de saison par séance, du marché à l'assiette, ingrédients partagés.",
    category: "other",
    type: "paid",
    duration: 90,
    direction: "offer",
    neighborhood: "Belleville",
  },
  {
    title: "Cherche une relecture de mémoire",
    description:
      "Mémoire de master de 80 pages, relecture orthographique et cohérence des notes de bas de page.",
    category: "other",
    type: "paid",
    duration: 120,
    direction: "request",
    status: "closed",
    neighborhood: "Quartier Latin",
  },
  {
    title: "Prêt d'une remorque à vélo",
    description:
      "Remorque pour transporter des courses ou un enfant, disponible en dehors du week-end.",
    category: "transport",
    type: "free",
    direction: "offer",
    neighborhood: "Batignolles",
  },
  {
    title: "Recherche des bras pour le jardin partagé",
    description:
      "Préparation des parcelles avant les semis de printemps, un samedi matin par mois.",
    category: "gardening",
    type: "free",
    direction: "request",
    status: "closed",
    neighborhood: "Bastille",
  },
  {
    title: "Assistance smartphone pour les seniors",
    description:
      "Réglage de la taille du texte, contacts, photos et applications utiles, sans jargon.",
    category: "it-support",
    type: "free",
    direction: "offer",
    neighborhood: "Montparnasse",
  },
  // Alice's own paid listings: without them the demo account has nothing
  // bookable and its "received bookings" tab can never fill up.
  {
    title: "Cours de jardinage sur balcon",
    description:
      "Choix des plantes, rempotage et arrosage, adapté aux balcons exposés plein nord.",
    category: "gardening",
    type: "paid",
    duration: 90,
    direction: "offer",
    author: "alice@demo.fr",
  },
  {
    title: "Initiation à la photo numérique",
    description:
      "Prise en main du boîtier, cadrage et lumière, puis une sortie photo dans le quartier.",
    category: "other",
    type: "paid",
    duration: 90,
    direction: "offer",
    author: "alice@demo.fr",
  },
  {
    title: "Préparation de repas maison pour la semaine",
    description:
      "Quatre plats cuisinés chez vous à partir de vos courses, régimes particuliers bienvenus.",
    category: "other",
    type: "paid",
    duration: 120,
    direction: "offer",
    author: "alice@demo.fr",
  },
];

export const INCIDENTS: IncidentSeed[] = [
  {
    title: "Lampadaire éteint rue Lepic",
    description:
      "Le lampadaire devant le 42 ne s'allume plus depuis une semaine, le trottoir est totalement noir le soir.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Dépôt sauvage devant le 24 rue Caulaincourt",
    description:
      "Un matelas et deux cartons de gravats sont abandonnés sur le trottoir depuis samedi.",
    category: "neighborhood",
    status: "in_progress",
  },
  {
    title: "Nid-de-poule dangereux rue Ordener",
    description:
      "Trou d'une vingtaine de centimètres au niveau du passage piéton, plusieurs cyclistes ont chuté.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Tag sur la façade de l'école élémentaire",
    description:
      "Graffiti sur toute la longueur du mur côté cour, visible depuis la rue.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Conteneur à verre débordant place des Abbesses",
    description:
      "Le conteneur n'a pas été vidé depuis la semaine dernière, les bouteilles s'entassent autour.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Trottoir effondré rue Damrémont",
    description:
      "Un affaissement s'est formé après les fortes pluies, difficile à franchir en poussette.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Fuite d'eau au coin de la rue Marcadet",
    description:
      "De l'eau claire coule en continu depuis une bouche d'arrosage et ruisselle sur la chaussée.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Banc cassé square Louise-Michel",
    description:
      "Deux lattes sont arrachées et laissent apparaître des vis, risque de blessure pour les enfants.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Grille d'arbre descellée rue des Martyrs",
    description:
      "La grille bascule quand on marche dessus, elle mériterait d'être refixée rapidement.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Feu tricolore hors service rue Custine",
    description:
      "Le feu clignote en orange dans les deux sens depuis hier matin, la traversée est risquée.",
    category: "neighborhood",
    status: "in_progress",
  },
  {
    title: "Éclairage défaillant dans l'escalier de la rue Foyatier",
    description:
      "Une marche sur trois est dans l'ombre, la descente est dangereuse par temps de pluie.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Poubelles non ramassées depuis trois jours",
    description:
      "Les bacs jaunes et verts sont restés sur le trottoir, ils débordent et gênent le passage.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Rats aperçus près des poubelles du marché",
    description:
      "Plusieurs rongeurs sortent des grilles d'arbre en fin de journée, autour du local à ordures.",
    category: "neighborhood",
    status: "in_progress",
  },
  {
    title: "Voiture ventouse rue Burq",
    description:
      "Le même véhicule occupe la place depuis six semaines, pneus à plat et pare-brise couvert d'avis.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Panneau de signalisation arraché rue Lamarck",
    description:
      "Le panneau de sens interdit est au sol, les voitures s'engagent à contresens.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Nuisances sonores nocturnes rue des Trois-Frères",
    description:
      "Musique et cris jusqu'à trois heures du matin plusieurs nuits par semaine depuis un mois.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Rambarde descellée escalier rue Chappe",
    description:
      "La main courante bouge sur une dizaine de mètres, plusieurs fixations ont sauté.",
    category: "neighborhood",
    status: "in_progress",
  },
  {
    title: "Affichage sauvage sur les vitrines vacantes",
    description:
      "Des dizaines d'affiches collées sur les rideaux de fer des commerces fermés.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Branche menaçante square Jehan-Rictus",
    description:
      "Une grosse branche est fendue et surplombe l'aire de jeux, il faudrait l'élaguer.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Piste cyclable obstruée par un chantier",
    description:
      "Les barrières du chantier empiètent sur toute la largeur de la piste sans déviation balisée.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Bouche d'égout bruyante rue Véron",
    description:
      "La plaque claque à chaque passage de voiture, jour et nuit, sous les fenêtres du 12.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Vitre brisée à l'abribus rue Championnet",
    description:
      "Le panneau latéral est éclaté, des éclats de verre traînent encore sur le trottoir.",
    category: "neighborhood",
    status: "in_progress",
  },
  {
    title: "Boîte aux lettres vandalisée rue Tholozé",
    description:
      "La serrure de la boîte collective a été forcée, le courrier reste accessible à tous.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Stationnement gênant devant la crèche",
    description:
      "Des véhicules se garent systématiquement sur le bateau, les poussettes doivent passer sur la route.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Défaut d'entretien du jardin partagé",
    description:
      "Les allées sont envahies, le composteur déborde et personne ne s'en occupe depuis le printemps.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Odeurs persistantes près du local à ordures",
    description:
      "Le local n'a pas été lavé depuis longtemps, l'odeur remonte jusqu'au premier étage.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Mobilier urbain tagué rue Yvonne-le-Tac",
    description:
      "Les deux bancs et la borne d'information ont été recouverts de peinture pendant le week-end.",
    category: "neighborhood",
    status: "in_progress",
  },
  {
    title: "Chaussée glissante après les travaux rue Berthe",
    description:
      "Le revêtement provisoire devient très glissant dès qu'il pleut, deux chutes constatées.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Absence de bac de tri rue Constance",
    description:
      "L'immeuble du 7 n'a aucun bac jaune, les cartons finissent dans les ordures ménagères.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Plaque d'égout descellée rue Antoinette",
    description:
      "La plaque se soulève au passage des camions de livraison et retombe de travers.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Panneau d'information illisible place Émile-Goudeau",
    description:
      "Le plan du quartier est délavé et rayé, il n'est plus lisible pour les visiteurs.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Sonnette d'immeuble hors service rue Gabrielle",
    description:
      "Aucun interphone ne fonctionne au 15, les livreurs sonnent chez les voisins du rez-de-chaussée.",
    category: "neighborhood",
    status: "in_progress",
  },
  {
    title: "Encombrants abandonnés rue Paul-Albert",
    description:
      "Une armoire démontée bloque la moitié du trottoir devant l'entrée de l'immeuble.",
    category: "neighborhood",
    status: "open",
  },
  {
    title: "Éclairage du terrain de sport en panne",
    description:
      "Les projecteurs ne s'allument plus, le terrain est inutilisable après 18h en hiver.",
    category: "neighborhood",
    status: "resolved",
  },
  {
    title: "Annonce suspecte : paiement demandé hors plateforme",
    description:
      "Une annonce de bricolage renvoie vers un virement bancaire avant toute prestation.",
    category: "reporting",
    status: "in_progress",
    author: "alice@demo.fr",
  },
  {
    title: "Message injurieux reçu en messagerie",
    description:
      "Suite à un refus de service, l'utilisateur a envoyé plusieurs messages insultants.",
    category: "reporting",
    status: "resolved",
  },
  {
    title: "Photo de profil manifestement usurpée",
    description:
      "La photo du profil est une image de banque d'images utilisée sur plusieurs autres comptes.",
    category: "reporting",
    status: "open",
  },
  {
    title: "Annonce de covoiturage manifestement frauduleuse",
    description:
      "Trajet proposé à un tarif absurde avec demande d'acompte immédiat par lien externe.",
    category: "reporting",
    status: "resolved",
  },
  {
    title: "Propos discriminatoires dans une description d'annonce",
    description:
      "L'annonce précise des critères d'exclusion sur l'origine des demandeurs.",
    category: "reporting",
    status: "open",
  },
  {
    title: "Annonce dupliquée publiée en série",
    description:
      "La même offre de jardinage est publiée six fois avec des titres légèrement différents.",
    category: "reporting",
    status: "in_progress",
  },
  {
    title: "Contenu commercial déguisé en entraide",
    description:
      "Une société de nettoyage publie ses prestations tarifées comme s'il s'agissait d'un échange.",
    category: "reporting",
    status: "open",
  },
  {
    title: "La carte des incidents reste vide au premier chargement",
    description:
      "Les marqueurs n'apparaissent qu'après un changement d'onglet et un retour sur la carte.",
    category: "bug",
    status: "in_progress",
    author: "alice@demo.fr",
  },
  {
    title: "Le filtre par catégorie ne se réinitialise pas",
    description:
      "Après un retour arrière, la liste reste filtrée alors que le sélecteur affiche « toutes ».",
    category: "bug",
    status: "open",
  },
  {
    title: "Les notifications de messagerie arrivent en double",
    description:
      "Chaque nouveau message déclenche deux notifications identiques à quelques secondes d'écart.",
    category: "bug",
    status: "resolved",
  },
  {
    title: "Impossible de téléverser une photo de plus de 5 Mo",
    description:
      "L'envoi échoue sans message d'erreur, le formulaire reste bloqué sur l'indicateur de chargement.",
    category: "bug",
    status: "open",
  },
  {
    title: "La page de résultats de vote affiche un total erroné",
    description:
      "Le total des participations dépasse le nombre de votants sur les scrutins pondérés.",
    category: "bug",
    status: "resolved",
  },
  {
    title: "Pavés descellés rue des Rosiers",
    description:
      "Une dizaine de pavés bougent sous les pieds au milieu de la rue piétonne.",
    category: "neighborhood",
    status: "open",
    neighborhood: "Marais",
  },
  {
    title: "Éclairage public en panne rue de Belleville",
    description:
      "Trois lampadaires consécutifs sont éteints entre le métro et la boulangerie.",
    category: "neighborhood",
    status: "in_progress",
    neighborhood: "Belleville",
  },
  {
    title: "Dépôt d'encombrants rue Mouffetard",
    description:
      "Cageots et cartons entassés après le marché, non ramassés depuis deux jours.",
    category: "neighborhood",
    status: "resolved",
    neighborhood: "Quartier Latin",
  },
  {
    title: "Fuite sur la fontaine du square des Batignolles",
    description:
      "L'eau coule en continu même robinet fermé, une flaque permanente s'est formée.",
    category: "neighborhood",
    status: "open",
    neighborhood: "Batignolles",
  },
  {
    title: "Marquage au sol effacé boulevard Richard-Lenoir",
    description:
      "Le passage piéton n'est presque plus visible, notamment de nuit.",
    category: "neighborhood",
    status: "resolved",
    neighborhood: "Bastille",
  },
  {
    title: "Abribus dégradé rue de la Gaîté",
    description: "Le panneau d'horaires est arraché et le banc a été démonté.",
    category: "neighborhood",
    status: "open",
    neighborhood: "Montparnasse",
  },
  {
    title: "Annonce trompeuse sur un service de bricolage",
    description:
      "Le tarif affiché ne correspond pas à celui annoncé une fois le contact établi.",
    category: "reporting",
    status: "open",
    neighborhood: "Marais",
  },
  {
    title: "Comportement agressif signalé en messagerie",
    description:
      "Relances insistantes et menaces voilées après l'annulation d'une réservation.",
    category: "reporting",
    status: "resolved",
    neighborhood: "Belleville",
  },
  {
    title: "Faux profil de voisin",
    description:
      "Le compte utilise une adresse qui ne correspond à aucun immeuble de la rue indiquée.",
    category: "reporting",
    status: "in_progress",
    neighborhood: "Bastille",
  },
  {
    title: "Le bouton « Charger plus » ne répond pas",
    description:
      "Sur la liste des services, le bouton reste actif mais aucune nouvelle page n'est chargée.",
    category: "bug",
    status: "open",
    neighborhood: "Quartier Latin",
  },
  {
    title: "L'export PDF du contrat échoue",
    description:
      "Le téléchargement démarre puis s'interrompt, le fichier obtenu fait zéro octet.",
    category: "bug",
    status: "resolved",
    neighborhood: "Batignolles",
  },
  {
    title: "La recherche ignore les accents",
    description:
      "Une recherche sur « éclairage » ne remonte pas les annonces écrites sans accent.",
    category: "bug",
    status: "open",
    neighborhood: "Montparnasse",
  },
];

export const EVENTS: EventSeed[] = [
  {
    title: "Vide-grenier de la rue Lepic",
    description:
      "Une centaine d'exposants de 9h à 18h, inscription auprès de l'association de quartier.",
    category: "community",
    inDays: 6,
  },
  {
    title: "Concert de jazz au square Louise-Michel",
    description:
      "Quartet acoustique en plein air à la tombée du jour, entrée libre, chapeau à la fin.",
    category: "culture",
    inDays: 9,
  },
  {
    title: "Tournoi de pétanque des Abbesses",
    description:
      "Doublettes formées sur place, inscriptions à partir de 14h, buvette tenue par les bénévoles.",
    category: "sport",
    inDays: 12,
  },
  {
    title: "Atelier compost au jardin partagé",
    description:
      "Comprendre l'équilibre carbone-azote et repartir avec un seau de compost mûr.",
    category: "education",
    inDays: 14,
  },
  {
    title: "Cinéma en plein air sur la Butte",
    description:
      "Projection d'un classique du cinéma français, apportez plaid et coussins.",
    category: "culture",
    inDays: 18,
  },
  {
    title: "Nettoyage citoyen de la rue Caulaincourt",
    description:
      "Gants, pinces et sacs fournis, rendez-vous devant la mairie du 18e à 10h.",
    category: "community",
    inDays: 20,
  },
  {
    title: "Initiation au yoga au square Jehan-Rictus",
    description:
      "Séance douce d'une heure pour tous niveaux, prévoyez un tapis ou une serviette.",
    category: "sport",
    inDays: 22,
  },
  {
    title: "Café des voisins salle Ordener",
    description:
      "Un temps d'échange informel autour d'un café pour faire connaissance entre habitants.",
    category: "community",
    inDays: 25,
  },
  {
    title: "Visite guidée des vignes de Montmartre",
    description:
      "Une heure et demie d'histoire du vignoble et de la Butte, places limitées à vingt personnes.",
    category: "culture",
    inDays: 28,
  },
  {
    title: "Bourse aux vêtements d'enfants",
    description:
      "Dépôt le matin, vente l'après-midi, invendus reversés à une association du quartier.",
    category: "community",
    inDays: 31,
  },
  {
    title: "Atelier réparation de vélos",
    description:
      "Diagnostic, changement de patins et réglage de dérailleur avec des bénévoles expérimentés.",
    category: "education",
    inDays: 34,
  },
  {
    title: "Concours de tartes de quartier",
    description:
      "Une tarte par foyer, jury composé de trois commerçants de la rue des Martyrs.",
    category: "other",
    inDays: 37,
  },
  {
    title: "Course solidaire des escaliers",
    description:
      "Parcours de 5 km entre les escaliers de la Butte, bénéfices reversés au centre social.",
    category: "sport",
    inDays: 40,
  },
  {
    title: "Lecture publique à la bibliothèque de la Goutte-d'Or",
    description:
      "Lectures d'auteurs du quartier suivies d'une rencontre avec le public.",
    category: "culture",
    inDays: 43,
  },
  {
    title: "Atelier premiers secours",
    description:
      "Gestes qui sauvent et utilisation du défibrillateur, animé par la protection civile.",
    category: "education",
    inDays: 46,
  },
  {
    title: "Marché de producteurs place des Abbesses",
    description:
      "Une douzaine de producteurs d'Île-de-France, de 8h à 14h sur toute la place.",
    category: "community",
    inDays: 50,
  },
  {
    title: "Chorale de quartier à Saint-Pierre",
    description:
      "Répétition ouverte puis concert de fin de saison, aucune expérience requise.",
    category: "culture",
    inDays: 54,
  },
  {
    title: "Fête des voisins",
    description:
      "Tables dressées dans la cour, chacun apporte un plat à partager.",
    category: "community",
    inDays: -12,
  },
  {
    title: "Brocante de la rue Marcadet",
    description:
      "Une soixantaine de stands sur toute la longueur de la rue, buvette tenue par le comité de quartier.",
    category: "community",
    inDays: -25,
  },
  {
    title: "Concert à l'église Saint-Jean",
    description:
      "Ensemble vocal et orgue, programme autour des chants traditionnels européens.",
    category: "culture",
    inDays: -40,
  },
  {
    title: "Tournoi de babyfoot du café Damrémont",
    description:
      "Seize équipes engagées, tournoi à élimination directe sur toute la soirée.",
    category: "sport",
    inDays: -55,
  },
  {
    title: "Atelier zéro déchet",
    description:
      "Fabrication de produits ménagers et d'éponges lavables à partir de chutes de tissu.",
    category: "education",
    inDays: -70,
  },
  {
    title: "Projection documentaire sur la Butte",
    description:
      "Film sur l'histoire ouvrière de Montmartre, suivi d'un débat avec la réalisatrice.",
    category: "culture",
    inDays: -85,
  },
  {
    title: "Collecte solidaire de jouets",
    description:
      "Jouets en bon état collectés au profit des familles suivies par le centre social.",
    category: "community",
    inDays: -100,
  },
  {
    title: "Randonnée urbaine du 18e",
    description:
      "Douze kilomètres à travers le quartier, du square Léon aux réservoirs de Montmartre.",
    category: "sport",
    inDays: -120,
  },
  {
    title: "Repas de quartier",
    description:
      "Auberge espagnole sous la halle, une cinquantaine de participants chaque année.",
    category: "other",
    inDays: -140,
  },
  {
    title: "Balade patrimoine dans le Marais",
    description:
      "Cours d'hôtels particuliers et passages méconnus, deux heures de marche tranquille.",
    category: "culture",
    inDays: 11,
    neighborhood: "Marais",
  },
  {
    title: "Fresque participative à Belleville",
    description:
      "Deux jours de peinture collective sur le mur pignon de la rue Ramponeau.",
    category: "culture",
    inDays: 16,
    neighborhood: "Belleville",
  },
  {
    title: "Café-philo rue Mouffetard",
    description:
      "Discussion mensuelle animée par un professeur de philosophie du lycée voisin.",
    category: "education",
    inDays: 21,
    neighborhood: "Quartier Latin",
  },
  {
    title: "Troc de plantes au square des Batignolles",
    description:
      "Boutures, graines et conseils échangés entre jardiniers amateurs du quartier.",
    category: "community",
    inDays: 27,
    neighborhood: "Batignolles",
  },
  {
    title: "Course à pied autour du canal",
    description:
      "Boucle de 8 km à allure libre, départ groupé devant la mairie du 11e.",
    category: "sport",
    inDays: 33,
    neighborhood: "Bastille",
  },
  {
    title: "Marché des artisans de la Gaîté",
    description:
      "Artisans locaux et producteurs sur trois week-ends consécutifs.",
    category: "community",
    inDays: -45,
    neighborhood: "Montparnasse",
  },
  {
    title: "Visite nocturne du Père-Lachaise",
    description:
      "Parcours à la lampe torche sur les sépultures d'artistes, groupes de quinze personnes.",
    category: "culture",
    inDays: -60,
    neighborhood: "Père-Lachaise",
  },
  {
    title: "Pique-nique au bord du canal",
    description:
      "Rendez-vous sur les berges en fin de journée, chacun apporte de quoi partager.",
    category: "other",
    inDays: -90,
    neighborhood: "Canal Saint-Martin",
  },
];

export const VOTES: VoteSeed[] = [
  {
    title: "Faut-il piétonniser la rue des Abbesses le dimanche ?",
    description:
      "Fermeture à la circulation de 10h à 19h, sauf riverains et livraisons.",
    voteType: "binary",
    options: YES_NO,
    endsInDays: 12,
    aliceVotes: false,
    closed: false,
  },
  {
    title: "Installer des bancs supplémentaires square Louise-Michel ?",
    description:
      "Six bancs en bois seraient ajoutés le long de l'allée centrale.",
    voteType: "binary",
    options: YES_NO,
    endsInDays: 18,
    aliceVotes: false,
    closed: false,
  },
  {
    title: "Quel jour pour le marché de producteurs ?",
    description:
      "Le marché s'installerait place des Abbesses une fois par semaine.",
    voteType: "single_choice",
    options: [
      { id: "mercredi", label: "Mercredi" },
      { id: "samedi", label: "Samedi" },
      { id: "dimanche", label: "Dimanche" },
    ],
    endsInDays: 21,
    aliceVotes: false,
    closed: false,
  },
  {
    title: "Quels équipements ajouter au jardin partagé ?",
    description: "Le budget permet de financer deux équipements cette année.",
    voteType: "multiple_choice",
    options: [
      { id: "composteur", label: "Composteur collectif" },
      { id: "cabane", label: "Cabane à outils" },
      { id: "recuperateur", label: "Récupérateur d'eau de pluie" },
      { id: "rempotage", label: "Table de rempotage" },
    ],
    endsInDays: 24,
    aliceVotes: false,
    closed: false,
  },
  {
    title: "Répartition du budget participatif du quartier",
    description:
      "Répartissez 100 points entre les quatre postes de dépense proposés.",
    voteType: "weighted",
    options: [
      { id: "voirie", label: "Voirie et trottoirs" },
      { id: "verdure", label: "Espaces verts" },
      { id: "culture", label: "Culture et animations" },
      { id: "proprete", label: "Propreté" },
    ],
    endsInDays: 30,
    aliceVotes: false,
    closed: false,
  },
  {
    title: "Créer une boîte à livres place Émile-Goudeau ?",
    description:
      "Installation d'une boîte à livres en libre accès, entretenue par les bénévoles.",
    voteType: "binary",
    options: YES_NO,
    endsInDays: 35,
    aliceVotes: false,
    closed: false,
  },
  {
    title: "Étendre les horaires du local à vélos ?",
    description: "Passage d'une ouverture 8h-20h à un accès continu 24h/24.",
    voteType: "binary",
    options: YES_NO,
    endsInDays: 15,
    aliceVotes: true,
    closed: false,
  },
  {
    title: "Quelle couleur dominante pour la fresque de la rue Burq ?",
    description: "Trois palettes proposées par le collectif d'artistes.",
    voteType: "single_choice",
    options: [
      { id: "bleu", label: "Camaïeu de bleus" },
      { id: "vert", label: "Verts et ocres" },
      { id: "vif", label: "Couleurs vives" },
    ],
    endsInDays: 20,
    aliceVotes: true,
    closed: false,
  },
  {
    title: "Quelles animations pour la fête des voisins ?",
    description: "Sélectionnez toutes les animations que vous souhaitez voir.",
    voteType: "multiple_choice",
    options: [
      { id: "concert", label: "Concert" },
      { id: "repas", label: "Repas partagé" },
      { id: "jeux", label: "Jeux pour enfants" },
      { id: "brocante", label: "Mini-brocante" },
    ],
    endsInDays: 26,
    aliceVotes: true,
    closed: false,
  },
  {
    title: "Priorités de rénovation des escaliers de la Butte",
    description:
      "Répartissez votre budget d'attention entre les trois chantiers.",
    voteType: "weighted",
    options: [
      { id: "eclairage", label: "Éclairage" },
      { id: "rambardes", label: "Rambardes" },
      { id: "revetement", label: "Revêtement des marches" },
    ],
    endsInDays: 33,
    aliceVotes: true,
    closed: false,
  },
  {
    title: "Quel horaire pour le café des voisins ?",
    description: "Le créneau retenu deviendra le rendez-vous mensuel fixe.",
    voteType: "single_choice",
    options: [
      { id: "matin", label: "Samedi matin" },
      { id: "apresmidi", label: "Samedi après-midi" },
      { id: "soiree", label: "Jeudi en soirée" },
    ],
    endsInDays: 40,
    aliceVotes: true,
    closed: false,
  },
  {
    title: "Fallait-il maintenir le vide-grenier en septembre ?",
    description:
      "Consultation menée après l'édition perturbée par les intempéries.",
    voteType: "binary",
    options: YES_NO,
    endsInDays: 9,
    aliceVotes: true,
    closed: true,
  },
  {
    title: "Installer un totem de tri rue Marcadet ?",
    description:
      "Point d'apport volontaire pour le verre, le papier et le PET.",
    voteType: "binary",
    options: YES_NO,
    endsInDays: 10,
    aliceVotes: true,
    closed: true,
  },
  {
    title: "Quel prestataire pour l'entretien du jardin partagé ?",
    description: "Trois candidatures reçues après l'appel à propositions.",
    voteType: "single_choice",
    options: [
      { id: "association", label: "Association locale" },
      { id: "entreprise", label: "Entreprise d'insertion" },
      { id: "benevoles", label: "Roulement de bénévoles" },
    ],
    endsInDays: 11,
    aliceVotes: true,
    closed: true,
  },
  {
    title: "Quel nom donner au nouveau square ?",
    description:
      "Proposition transmise ensuite à la mairie d'arrondissement pour délibération.",
    voteType: "single_choice",
    options: [
      { id: "valadon", label: "Square Suzanne-Valadon" },
      { id: "ayme", label: "Square Marcel-Aymé" },
      { id: "poulbot", label: "Square Poulbot" },
    ],
    endsInDays: 13,
    aliceVotes: true,
    closed: true,
  },
  {
    title: "Quels créneaux réserver au terrain de sport ?",
    description: "Créneaux réservés aux associations du quartier.",
    voteType: "multiple_choice",
    options: [
      { id: "matin", label: "Matin en semaine" },
      { id: "soir", label: "Soir en semaine" },
      { id: "samedi", label: "Samedi" },
      { id: "dimanche", label: "Dimanche" },
    ],
    endsInDays: 14,
    aliceVotes: false,
    closed: true,
  },
  {
    title: "Quels travaux prioriser dans l'immeuble collectif ?",
    description:
      "Consultation préalable à l'assemblée générale des copropriétaires.",
    voteType: "multiple_choice",
    options: [
      { id: "toiture", label: "Toiture" },
      { id: "facade", label: "Façade" },
      { id: "hall", label: "Hall d'entrée" },
      { id: "velos", label: "Local à vélos" },
    ],
    endsInDays: 16,
    aliceVotes: false,
    closed: true,
  },
  {
    title: "Répartition de la subvention culturelle 2026",
    description: "Répartissez la dotation entre les trois familles d'actions.",
    voteType: "weighted",
    options: [
      { id: "expositions", label: "Expositions" },
      { id: "concerts", label: "Concerts" },
      { id: "ateliers", label: "Ateliers" },
    ],
    endsInDays: 17,
    aliceVotes: false,
    closed: true,
  },
];
