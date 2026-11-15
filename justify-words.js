// Which capitalised words may be divided at a line end, and where.
//
// justify.js never divides a protected word. The older printed prayer books
// hyphenate any word, sacred names included; the 1982 book this site follows
// divides no capitalised word at all. The site keeps the names whole and
// lets the rest divide, which is what tightens the lines that are dense with
// titles and place names (the Commemorations).
//
// A protected word is whole in every use, lower case included ("our
// fathers"): the hyphenator is handed words in lower case.
//
// Every word a page capitalises away from a sentence start, six letters or
// longer, must be in one of the two lists. scripts/check_justify.mjs fails
// the build on one that is in neither, and on a protected word found divided.

// Names of God, Christ, the Holy Spirit and the Theotokos, and the words
// that hold the name of Christ.
const NAMES = [
    "christ", "christian", "christians", "creator", "divinity", "father", "fathers", "godhead",
    "himself", "jesus", "maker", "master", "mother", "savior", "saviour", "spirit", "theotokos",
    "thine", "thyself", "trinity", "virgin", "yourself",
];

// Epithets that stand for the name.
const EPITHETS = [
    "almighty", "author", "bearer", "benefactor", "bestower", "bride", "comforter", "compassionate",
    "defender", "deliverer", "divine", "emitter", "eternal", "forerunner", "fountain", "giver",
    "gracious", "heavenly", "helper", "highest", "immortal", "incarnate", "instructor",
    "intercessor", "judge", "lover", "maiden", "merciful", "mighty", "mistress", "nourisher",
    "physician", "pilot", "planter", "protector", "protectress", "provider", "queen", "redeemer",
    "refuge", "ruler", "shepherd", "sinless", "succorer", "supreme", "treasury",
];

const ANGELS = [
    "angel", "angelic", "angels", "archangels", "cherubim", "guardian", "hosts", "powers",
    "seraphim",
];

// Saints and prophets, as a company and by name.
const SAINTS = [
    "aaron", "abraham", "apostle", "apostles", "baptist", "benjamin", "chrysostom", "david",
    "ephraim", "gregory", "isaac", "israel", "jacob", "jesse", "joseph", "judah", "manasses",
    "martyrs", "melchisedech", "moses", "nicholas", "peter", "phineas", "prophet", "prophets",
    "saint", "saints", "samuel", "simon",
];

export const PROTECTED = new Set([...NAMES, ...EPITHETS, ...ANGELS, ...SAINTS]);

// Holy things and feasts, offices, places, peoples, adversaries and the
// rest: these may divide, with at least three letters on each side.
export const MAY_DIVIDE = new Set([
    "abiron", "adored", "amalek", "america", "ammon", "amorites", "apostolic", "arabia",
    "archbishop", "ascension", "assur", "babylon", "basan", "beatitudes", "behold", "birth",
    "bishop", "blessed", "blessings", "blood", "bread", "breath", "canaan", "canaanite", "canada",
    "canons", "cathedral", "catholic", "cause", "chaldeans", "church", "comfort", "coming",
    "communion", "compline", "creation", "cross", "dallas", "dathan", "declare", "devil",
    "divinely", "dread", "earth", "edomites", "egypt", "endor", "enemy", "ephrata", "epistle",
    "etham", "ethiopia", "ethiopians", "eucharist", "faith", "flesh", "fragrance", "fullness",
    "galaad", "garamond", "gebal", "gehenna", "gentiles", "gifts", "glory", "gospel", "governor",
    "grace", "hades", "hagarenes", "heaven", "hebrew", "hermon", "holiness", "horeb", "immortality",
    "isabel", "ishmaelites", "jabin", "jerusalem", "jordan", "judas", "judgment", "kadesh", "kedar",
    "kingdom", "kishon", "ladder", "lebanon", "lesson", "light", "living", "mercy", "metropolitan",
    "metropolitans", "midian", "monastery", "mount", "mountain", "mysteries", "mystery", "mystical",
    "nephthalim", "night", "origin", "orthodox", "paradise", "passion", "peace", "people",
    "personal", "pharaoh", "philistine", "philistines", "pontius", "power", "prayer", "prayers",
    "precious", "president", "prodigal", "project", "prokeimenon", "protection", "psalm", "psalter",
    "rahab", "reader", "reign", "resurrection", "reverend", "revised", "right", "righteous",
    "righteousness", "russia", "sacred", "sacrifice", "salvation", "sanctification", "satan",
    "scriptures", "selmon", "seminary", "service", "shechem", "shiloh", "short", "sinai", "sisera",
    "slavonic", "strength", "supper", "support", "tabernacle", "table", "tanis", "tarshish",
    "tempter", "thanksgiving", "there", "three", "transgress", "triple", "truth", "typika",
    "universe", "venerable", "version", "washington", "where", "whose", "wisdom", "zalmunna",
    "zebee", "zebulon",
]);

// Break points set by hand where the standard American English patterns
// give a wrong division or none. Pieces shorter than three letters at either
// end are joined to their neighbour by justify.js.
export const BREAKS = {
    eucharist: ["eu", "cha", "rist"],
    ishmaelites: ["ish", "ma", "el", "ites"],
    jerusalem: ["je", "ru", "sa", "lem"],
    melchisedech: ["mel", "chis", "e", "dech"],
    metropolitan: ["met", "ro", "pol", "i", "tan"],
    metropolitans: ["met", "ro", "pol", "i", "tans"],
    paradise: ["para", "dise"],
    philistine: ["phil", "is", "tine"],
    philistines: ["phil", "is", "tines"],
    prokeimenon: ["pro", "kei", "me", "non"],
};
