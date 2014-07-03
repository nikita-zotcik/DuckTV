angular.module('DuckieTV.providers.scenenames', [])

/**
 * Scene name provider
 * Resolves TheTvDB ID's into something that you can use on search engines.
 */
.provider('SceneNameResolver', function() {

    // credits to Sickbeard's exception list https://raw.github.com/midgetspy/sb_tvdb_scene_exceptions/gh-pages/exceptions.txt
    // filters applied: 
    // - Remove :
    // - Remove \(([12][09][0-9]{2})\) (all years between 19* and 20* within () ) 
    // - replace \' with '
    // - replace surrounding " with '
    // remove (US)
    // line sort

    var exceptions = {
        100061: "Undercover Boss",
        105521: "The Colony",
        110381: "Archer",
        113901: "The Super Hero Squad Show",
        118001: "Beauty and the Geek Australia",
        120431: "Food Factory",
        120541: "Russell Howards Good News",
        122281: "Garrow's Law - Tales from the Old Bailey",
        122401: "Discovery Channel Cool Stuff and How it works",
        122521: "The Fresh Beat Band",
        128521: "Million Dollar Listing",
        129261: "Spartacus",
        131791: "Sci-Fi Science",
        132591: "7 Days",
        139481: "18 Kids And Counting",
        139681: "The Smoking Gun Presents The World's Dumbest",
        139941: "Childrens Hospital",
        140141: "Undercover Boss",
        145541: "The Marriage Ref",
        149101: "A League of Their Own",
        152831: "Adventure Time with Finn and Jake",
        155201: "Louie",
        156771: "National Geographic Shark Me",
        164451: "Carlos",
        164951: "Shit My Dad Says",
        165521: "Girls Gone Wild The Search for the Hottest Girl in America",
        166251: "Four Corner",
        166851: "Noise Control (NZ)",
        168161: "Law & Order Los Angeles",
        168621: "Melissa & Joey",
        172381: "Silent Library",
        174681: "Scooby-Doo! Mystery Incorporated",
        175101: "Travel Channel Culture Shock",
        178141: "My Ghost Story",
        187351: "This is England",
        189931: "RBT (AU)",
        192061: "Young Justice",
        193501: "XIII",
        193821: "Iron Man 2010",
        194261: "PhoneShop",
        194751: "Conan",
        195831: "Zane Lamprey's Drinking Made Easy",
        196351: "T.U.F.F. Puppy",
        197001: "Supernatural The Animation",
        198841: "Undercover Boss (Au)",
        198861: "Film 2014 with Claudia Winkleman",
        199031: "Click and Clack As the Wrench Turns",
        204371: "AuctionHunters",
        205901: "Transformers Prime",
        208111: "Gold Rush",
        210171: "The Killing",
        210771: "Cake Boss Next Great Baker",
        212171: "My Little Pony Friendship is Magic",
        212571: "Come Fly With Me",
        213211: "Love Hate",
        220141: "Wolverine",
        220441: "R L Stines The Haunting Hour The Series",
        221001: "10 O Clock Live",
        222551: "Only in America With Larry the Cable Guy",
        223161: "CBC Marketplace",
        227161: "Oprah Presents Master Class",
        230371: "David Attenborough Madagascar",
        238521: "Adam Eva",
        246281: "King",
        247381: "Superscrimpers",
        247824: "The Voice",
        248261: "National Terrorism Strike Force San Diego Sport Utility Vehicle",
        248503: "The Hour",
        248618: "The Amazing Race Australia",
        248699: "24 Hours In A And E",
        248789: "Smash",
        248812: "Dont Trust the Bitch in Apartment 23",
        248834: "Last Man Standing",
        248835: "Once Upon a Time",
        248836: "The River",
        248841: "Scandal US",
        248935: "Touch",
        248962: "Transporter The Series",
        249229: "A.N.T Farm",
        249361: "Boss",
        249708: "The Car Show",
        249892: "Extreme Chef",
        249980: "Restoration Home",
        250015: "The Indestructibles",
        250095: "The Marriage Ref(UK)",
        250153: "Top Design Australia",
        250267: "The Food Truck NZ",
        250331: "Richard Hammond's Journey To...",
        250445: "The Renovators",
        250525: "Hamish And Andys Gap Year",
        250544: "Match of the Day Two",
        251334: "Lawless UK",
        251418: "Frozen Planet",
        251807: "Green Lantern The Animated Series",
        252019: "The Bridge 2011",
        252312: "Jessie",
        252319: "Dragons' Den How To Win In The Den",
        253323: "Ninjago Masters Of Spinjitzu",
        253485: "The Syndicate 2012",
        253543: "All American Muslim",
        253682: "Project Runway Allstars",
        253931: "Rob",
        253982: "Common Law",
        254067: "DUI",
        254112: "Titanic 2012",
        254798: "Stella",
        255045: "The L.A. Complex",
        255693: "Undercover Boss Canada",
        256204: "666 Park Avenue",
        256300: "Richard Hammonds Crash Course",
        256394: "Lab Rats",
        257550: "Bellator FC",
        257645: "Ultimate Spider-man",
        257804: "Too Cute!",
        258773: "Zero Hour US",
        258959: "The Beauty And The Beast",
        259047: "VGHS",
        259106: "Emily Owens M D",
        259418: "David Attenborough Kingdom Of Plants",
        259669: "Da Vincis Demons",
        260165: "Chasing UFOs",
        260206: "Gordon Behind Bars",
        261202: "DreamWorks Dragons Riders of Berk",
        261222: "The Burn With Jeff Ross",
        261240: "H+",
        261690: "The Americans",
        262353: "Leaving",
        262368: "Vikings",
        262787: "Homefront UK",
        262927: "Ian Hislop's Stiff Upper Lip",
        262980: "House of Cards 2013",
        263002: "Switch",
        263365: "Marvels Agents of S H I E L D",
        263387: "Cedar Cove",
        263506: "Jamies 16 Minute Meals",
        264030: "Avengers Assemble",
        264085: "The Bridge US",
        264141: "Falcon",
        264450: "Legit",
        264535: "Storage Wars NY",
        264679: "National Geographic UFO Europe Untold Stories",
        264776: "Adam Hills In Gordon St Tonight",
        265145: "David Attenboroughs Africa",
        265252: "MasterChef Australia The Professionals",
        265373: "David Attenboroughs Galapagos",
        265393: "The Legends of Chima",
        265406: "Out There 2013",
        265467: "Polar Bear Family and Me",
        266388: "David Attenboroughs Natural Curiosities",
        267206: "Low Winter Sun US",
        267260: "Intelligence US",
        267543: "Hulk and the Agents of S M A S H",
        267709: "Kesha My Crazy Beautiful Life",
        268591: "The Tomorrow People US",
        268855: "Turbo FAST",
        269538: "Satisfaction CA",
        269584: "Rake US",
        269586: "Brooklyn Nine Nine",
        269589: "Dads",
        269637: "The Michael J Fox Show",
        269641: "Chicago P D",
        269653: "The Goldbergs",
        270261: "Jimmy Fallon",
        270262: "Seth Meyers",
        270307: "Family SOS with Jo Frost",
        270528: "Blood And Oil 2013",
        271632: "Lucas Bros Moving Company",
        271728: "Pete Holmes Show",
        271902: "Legend of Shelby The Swamp Man",
        271936: "Played CA",
        271936: "Played CA",
        271958: "Arsenio Hall",
        271984: "Wonderland AU",
        272391: "Karl Pilkington The Moaning Of Life",
        273002: "I Couldnt Become a Hero So I Reluctantly Decided to Get a Job",
        273383: "The House That 100k Built",
        273424: "David Attenboroughs Rise Of Animals",
        273986: "Breathless UK",
        274099: "At Midnight",
        274129: "Klondike 2014",
        275493: "Backchat With Jack Whitehall And His Dad",
        275723: "Panic Button US",
        275777: "Wild Burma",
        276360: "19-2 CA",
        276515: "Curse of Oak Island",
        276526: "Legend of Mick Dodge",
        277171: "Tough Young Teachers UK",
        277528: "Love Child AU",
        277568: "Babylon",
        70327: "Buffy the Vampire Slayer",
        70336: "The Tonight Show with Jay Leno",
        70572: "Little Rascals",
        70578: "Highway Patrol",
        70726: "Babylon 5",
        70760: "Celebrity Big Brother",
        70870: "The Real World Road Rules Challenge",
        70994: "MASH",
        71256: "The Daily Show",
        71462: "Sharpes",
        71470: "Star Trek The Next Generation",
        71489: "Law and Order CI",
        71699: "The Outer Limits",
        71788: "Superman The Animated Series",
        71985: "Taboo",
        71998: "Jimmy Kimmel Live",
        72073: "Star Trek DS9",
        72164: "The O.C.",
        72194: "The Ellen Degeneres Show",
        72224: "The Outer Limits",
        72231: "Real Time with Bill Maher",
        72301: "Penn and Teller Bullshit",
        72306: "The Venture Brothers",
        72449: "Stargate SG1",
        72546: "CSI",
        72549: "Big Brother UK",
        72553: "Mighty Morphin Power Rangers",
        72663: "Accused",
        72716: "QI XL",
        72829: "The Apprentice",
        73178: "Two Guys a Girl and a Pizza Place",
        73244: "The Office",
        73246: "30 Minute Meals",
        73255: "House",
        73290: "60 Minutes",
        73387: "The Late Late Show with Craig Ferguson",
        73545: "Battlestar Galactica",
        73562: "Beast Wars Transformers",
        73587: "The Twilight Zone 1959",
        73599: "Dark Shadows",
        73641: "King of Queens",
        73696: "CSI New York",
        73893: "Enterprise",
        74372: "Blue Planet",
        74512: "Wife Swap",
        74626: "The X Factor",
        74768: "The Block",
        74897: "Hells Kitchen US",
        74946: "C O P S",
        75032: "Cathouse The Series",
        75088: "David Letterman",
        75166: "The Biggest Loser US",
        75382: "The Ultimate Fighter Live",
        75393: "The X Factor (AU)",
        75567: "The Xtra Factor",
        75692: "Law & Order SVU",
        76104: "The Mole AU",
        76107: "Doctor Who Classic",
        76119: "NOVA",
        76133: "Poirot",
        76168: "Batman The Animated Series",
        76235: "America's Funniest Home Videos",
        76237: "Big Brother (Australia)",
        76703: "Pokemon",
        76706: "Big Brother",
        76736: "The Black Adder",
        76779: "WWE Monday Night RAW",
        76808: "Whose Line is it Anyway US",
        76817: "The Ponderosa",
        76925: "Dark Shadows The Revival Series 1991",
        77120: "Aqua Teen Hunger Force",
        77398: "X-Files",
        77444: "This Old House Program",
        77526: "Star Trek TOS",
        77733: "Degrassi The Next Generation",
        77780: "G.I. Joe",
        78051: "Never Mind the Buzzcocks",
        78075: "Beast Machines Transformers",
        78125: "22 Minutes",
        78804: "Doctor Who",
        78846: "Shameless UK",
        78949: "Thomas The Tank Engine & Friends",
        79040: "Britains Next Top Model",
        79177: "Life On Mars UK",
        79212: "The Dog Whisperer",
        79330: "Jericho",
        79565: "The Real Hustle",
        79590: "Dancing With The Stars",
        79668: "Anthony Bourdain No Reservations",
        79771: "Air Crash Investigation",
        79824: "Naruto Shippuden",
        79836: "Dragon's Den (UK)",
        79905: "Tim and Eric Awesome Show",
        80018: "Nick Cannon Presents Wild N Out",
        80101: "Harry And Paul",
        80159: "Sanctuary",
        80226: "Inspector George Gently",
        80290: "Jamie Oliver Jamies Kitchen",
        80379: "The Big Bang Theory",
        80522: "Who Do You Think You Are?",
        80552: "Kitchen Nightmares",
        80625: "MegaStructures",
        80646: "Frontline",
        80665: "The Next Iron Chef Redemption",
        80915: "La Linea 1972",
        80964: "Yo Gabba Gabba",
        80994: "National Geographic Channel Naked Science",
        81230: "Celebrity Rehab with Dr Drew",
        81346: "Underbelly",
        81386: "Being Human",
        81391: "Wie is de mol?",
        81491: "Big Brother After Dark'. 'Big Brother US After Dark",
        81559: "The Biggest Loser Australia",
        81563: "Border Security AU Front Line",
        81580: "Come Dine With Me UK",
        81670: "The Murdoch Mysteries",
        82135: "The Gruen Transfer",
        82374: "Ultimate Factories",
        82448: "Project Runway Australia",
        82467: "Eastbound Down",
        82918: "Diners, Drive-ins and Dives",
        83115: "The Worlds Strictest Parents UK",
        83123: "Merlin",
        83268: "Star Wars The Clone Wars 2008",
        83430: "National Geographic Banged Up Abroad",
        83462: "Castle",
        83714: "Genius",
        83774: "Antiques Roadshow (UK)",
        83897: "Life After People The Series",
        84133: "Manhunters Fugitive Task Force",
        84146: "Secret Millionaire",
        84312: "Click",
        85168: "How the Earth Was Made",
        85228: "Law & Order UK",
        88631: "Krod Mandoon",
        88771: "The Apprentice You're Fired!",
        89991: "Out of the Wild The Alaskan Experiment",
        90621: "Discovery Channel Sunrise Earth",
        90651: "Selling Houses Australia",
        90751: "Travel Channel Planet Food",
        92091: "MasterChef Australia",
        92361: "Known Universe",
        94551: "Parenthood",
        95441: "NCIS Los Angeles",
        95521: "National Geographic Ancient Megastructures",
        97731: "Tosh.0",
    };

    this.$get = function() {
        return {
            getSceneName: function(tvdbID) {
                return (tvdbID in exceptions) ? exceptions[tvdbID] : false;
            }
        }
    }
});