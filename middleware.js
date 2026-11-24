// Private project archive.
// - The full archive (/archive, archive.html) needs the password.
// - Single projects or groups of projects can be shared with signed links, made at /archive/links.
// The password is NOT stored here: set ARCHIVE_PASSWORD in Vercel (Settings → Environments → Production).
// Changing the password signs everyone out AND turns off every shared link made with the old one.
//
// Social Machines pitch (/social-machines) is private too, with its own sign-in.
// Its password is SOCIAL_MACHINES_PASSWORD in Vercel; until that is set it uses ARCHIVE_PASSWORD.
// Password for /social-machines is OFF for now. To turn it back on, add '/social-machines', '/social-machines/(.*)' to the matcher.
export const config = { matcher: ['/archive(.*)', '/review/admin', '/review/admin/(.*)', '/api/review-admin'] };

const FULL = 'pg_archive';      // cookie: signed in with the password
const GRANT = 'pg_share';       // cookie: projects opened from shared links
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const SITE = '/';   // where the public site lives (change to '/' when the redesign goes live)

const PROJECTS = [
 {
  "slug": "panini",
  "title": "Panini",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1723850457394-9OQNTXQARAWITKOGUF8B/Kobe+1.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756499538?h=15d94c0347&app_id=122963&muted=0&autopause=0",
    "title": "Panini - Kobe"
   },
   {
    "src": "https://player.vimeo.com/video/756499635?h=b54f6d1dc0&app_id=122963&muted=0&autopause=0",
    "title": "Panini - KD"
   }
  ]
 },
 {
  "slug": "google",
  "title": "Google",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731449518521-LQFML01I9H4O8CRVXVL6/Google_Burtzorg.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756471529?h=01c626f63d&app_id=122963&muted=0&autopause=0",
    "title": "Google - Buurtzorg"
   }
  ]
 },
 {
  "slug": "hancock",
  "title": "Hancock Health",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731518186643-F0WMPBUPV18EFW711YX6/Hancock+Health+-+Mayo+Clinic+1.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/998835219?h=86baa33c2c&app_id=122963&muted=0&autopause=0",
    "title": "Hancock Health - Mayo Clinic"
   },
   {
    "src": "https://player.vimeo.com/video/998756130?h=214f1c7288&app_id=122963&muted=0&autopause=0",
    "title": "Hancock Health - Network"
   }
  ]
 },
 {
  "slug": "paypal",
  "title": "Paypal",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1728594648724-BZ8AVDRHTHJ9GDBQGJY3/PayPal+Daymond+John.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756503866?app_id=122963&muted=0&autopause=0",
    "title": "PayPal - Daymond Johnson"
   }
  ]
 },
 {
  "slug": "royal-caribbean",
  "title": "Royal Caribbean",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1728593843345-OS13MYXWD6RK1JOPCPKH/Royal+4+B+.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/998808760?h=93fde589af&app_id=122963&muted=0&autopause=0",
    "title": "Royal Caribbean - Safety Film Trailer"
   }
  ]
 },
 {
  "slug": "power-bar",
  "title": "Power Bar",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731518741449-HR4AOSJVTLVZLM0YD2R3/Powerbar.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/41106764?app_id=122963&muted=0&autopause=0",
    "title": "PowerBar Manifesto"
   }
  ]
 },
 {
  "slug": "brightcove",
  "title": "Brightcove",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731519259125-J31M6RAWP8V9WUQ4NTAI/Brightcove.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756450173?app_id=122963&muted=0&autopause=0",
    "title": "Brightcove - Play"
   }
  ]
 },
 {
  "slug": "aarp",
  "title": "AARP",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731519368713-R8T621XTJPQVQGQSA338/AARP+Ace+Your+Retirement+1.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756437973?app_id=122963&muted=0&autopause=0",
    "title": "AARP - Ace Your Retirement - Travel"
   },
   {
    "src": "https://player.vimeo.com/video/756437888?app_id=122963&muted=0&autopause=0",
    "title": "AARP - Ace Your Retirement - House"
   }
  ]
 },
 {
  "slug": "banfield",
  "title": "Banfield",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731519940357-VZZE1AHZBUUOP313J1FO/Banfield_6.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803256201?h=9c8f55e851&app_id=122963&muted=0&autopause=0",
    "title": "Banfield \"Love at First Sight\""
   },
   {
    "src": "https://player.vimeo.com/video/803261256?h=8130968feb&app_id=122963&muted=0&autopause=0",
    "title": "Banfield \"Therapy\""
   },
   {
    "src": "https://player.vimeo.com/video/756435121?h=e42876e832&app_id=122963&muted=0&autopause=0",
    "title": "Banfield - \"Late Adopters\""
   }
  ]
 },
 {
  "slug": "goal-zero",
  "title": "Goal Zero",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731520862814-7XY60K7EPGY94HZVUEXZ/Goal+Zero.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/72383349?app_id=122963&muted=0&autopause=0",
    "title": "Goal Zero \"Freedom\" with Alex Honnold"
   }
  ]
 },
 {
  "slug": "trifexis",
  "title": "Trifexis",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731521441955-7HBS1DBVFEJPDHW4OEO8/Trifexis+7.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756515469?app_id=122963&muted=0&autopause=0",
    "title": "Trifexis - Going Out"
   },
   {
    "src": "https://player.vimeo.com/video/756515017?h=ee1c36e671&app_id=122963&muted=0&autopause=0",
    "title": "Trifexis - Around the House"
   }
  ]
 },
 {
  "slug": "stanton",
  "title": "Stanton Optical",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731522252913-LGNTTQJL4M4Q9499TLU1/Stanton+Optical+Book+Club.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756514677?h=e502579a04&app_id=122963&muted=0&autopause=0",
    "title": "Stanton Optical - Book Club"
   },
   {
    "src": "https://player.vimeo.com/video/149922867?app_id=122963&muted=0&autopause=0",
    "title": "Stanton Optical - Date Night"
   }
  ]
 },
 {
  "slug": "uber",
  "title": "Uber - Grammys",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731523217769-MEOB92HPD2SV7SUSM1BD/UBER_Grammys_1.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756516594?h=c37543148d&app_id=122963&muted=0&autopause=0",
    "title": "Uber - Khalid's Road to the Grammys"
   },
   {
    "src": "https://player.vimeo.com/video/756516488?h=3dd7be8f80&app_id=122963&muted=0&autopause=0",
    "title": "Uber - Julia Michaels' Road to the Grammys"
   },
   {
    "src": "https://player.vimeo.com/video/920304570?h=7358c52636&app_id=122963&muted=0&autopause=0",
    "title": "Uber - Lil Uzi Vert's Road to the Grammys"
   }
  ]
 },
 {
  "slug": "airtable",
  "title": "Airtable",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731524719619-PPILSDNSAF9JYI1NKKYZ/Airtable+This+Is+How+2b.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/802890453?h=a4996e09a6&app_id=122963&muted=0&autopause=0",
    "title": "AirTable \"Content Powerhouse\""
   },
   {
    "src": "https://player.vimeo.com/video/802890501?h=c695f6e3bd&app_id=122963&muted=0&autopause=0",
    "title": "AirTable \"One Good Chair\""
   },
   {
    "src": "https://player.vimeo.com/video/802890593?app_id=122963&muted=0&autopause=0",
    "title": "AirTable \"The Launch\""
   }
  ]
 },
 {
  "slug": "assassins",
  "title": "Assassin's Creed",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731526389413-2T7E5DKDFKMINQ68Q46F/Assassins+Creed.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/77801760?app_id=122963&muted=0&autopause=0",
    "title": "Assassins Creed III: Fan Video"
   }
  ]
 },
 {
  "slug": "uberville",
  "title": "Uber - Uberville",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731525669329-328NGQ489AB1MA8K5YKI/Uberville+Winter.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756516463?app_id=122963&muted=0&autopause=0",
    "title": "Uber - Uberville-Winter"
   },
   {
    "src": "https://player.vimeo.com/video/756516382?app_id=122963&muted=0&autopause=0",
    "title": "Uber- Uberville"
   }
  ]
 },
 {
  "slug": "toyota",
  "title": "Toyota",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731526703124-U0XXS9L3N2V0TLNVBCYP/Toyota+Kayak.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756515532?app_id=122963&muted=0&autopause=0",
    "title": "Toyota - Kayak"
   },
   {
    "src": "https://player.vimeo.com/video/756515491?app_id=122963&muted=0&autopause=0",
    "title": "Toyota - Keep It Wild"
   }
  ]
 },
 {
  "slug": "redbull",
  "title": "Redbull",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731517275161-9529AJFXXGT2STQFOOCZ/Redbull+-+Leader+in+the+Lane.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803253074?h=49d7ab0f6d&app_id=122963&muted=0&autopause=0",
    "title": "RedBull \"Leader in the Lane\" Teaser"
   }
  ]
 },
 {
  "slug": "ride",
  "title": "Ride",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731526866012-8WFF11RIHOCOQXR1P1GI/Ride+-+Not+a+Phone+Booth.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756513931?app_id=122963&muted=0&autopause=0",
    "title": "Ride - Not A Phone Booth"
   },
   {
    "src": "https://player.vimeo.com/video/756514007?app_id=122963&muted=0&autopause=0",
    "title": "Ride - How to Properly Shut a Door"
   }
  ]
 },
 {
  "slug": "progresso",
  "title": "Progresso",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731527144738-OJ367GD6K7O8Q56QBTEW/Progresso_hometown.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756506134?h=59eff867f3&app_id=122963&muted=0&autopause=0",
    "title": "Progresso - Hometown ep. 05"
   },
   {
    "src": "https://player.vimeo.com/video/756506004?h=954fd44b2d&app_id=122963&muted=0&autopause=0",
    "title": "Progresso - The Clam Catchers - Episode 04"
   },
   {
    "src": "https://player.vimeo.com/video/756505806?h=1bce941076&app_id=122963&muted=0&autopause=0",
    "title": "Progresso - The Farm ep. 03"
   }
  ]
 },
 {
  "slug": "nike",
  "title": "Nike",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731532414570-LMW149L165G955A40SN5/Nike+-+Lebron+James+-+Who%27s+Got+Next.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803251278?h=162cc9f173&app_id=122963&muted=0&autopause=0",
    "title": "Nike You Got Next - LEBRON"
   },
   {
    "src": "https://player.vimeo.com/video/755576988?app_id=122963&muted=0&autopause=0",
    "title": "NIKE - Sarah Reinertsen - My Crazy Dream"
   },
   {
    "src": "https://player.vimeo.com/video/756476179?h=18fc8ea137&app_id=122963&muted=0&autopause=0",
    "title": "Nike - Coach Smith"
   },
   {
    "src": "https://player.vimeo.com/video/756476332?h=cfa0f3a75f&app_id=122963&muted=0&autopause=0",
    "title": "Nike - Mamba League"
   },
   {
    "src": "https://player.vimeo.com/video/756476489?h=de23ef562e&app_id=122963&muted=0&autopause=0",
    "title": "Nike - Pro Designs"
   }
  ]
 },
 {
  "slug": "fsc",
  "title": "FSC",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731534278404-AJ9THYAMNS4XLQMRCQ9U/FSC+3.jpeg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756460066?app_id=122963&muted=0&autopause=0",
    "title": "Forest Stewardship Council - Anthem"
   }
  ]
 },
 {
  "slug": "purina-b",
  "title": "Purina",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731537793047-T3G3F6AQYT017Y3NN0H3/Purina+-+Healthy+Years.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756508623?h=7b056ddbb1&app_id=122963&muted=0&autopause=0",
    "title": "Purina - Healthy Years"
   },
   {
    "src": "https://player.vimeo.com/video/756507833?h=a807228897&app_id=122963&muted=0&autopause=0",
    "title": "Purina - Aging"
   },
   {
    "src": "https://player.vimeo.com/video/756964338?app_id=122963&muted=0&autopause=0",
    "title": "Purina---Petfinder.mov"
   }
  ]
 },
 {
  "slug": "purina",
  "title": "Purina - Better with Pets",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731535031743-RU703HPZ6EHZ6EJ7DGUO/Purina.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/77843261?app_id=122963&muted=0&autopause=0",
    "title": "Purina - Julian & Max (:60)"
   },
   {
    "src": "https://player.vimeo.com/video/81649466?app_id=122963&muted=0&autopause=0",
    "title": "Purina - Stephen, Puppi & Burma"
   },
   {
    "src": "https://player.vimeo.com/video/840215065?h=ce1b71c46a&app_id=122963&muted=0&autopause=0",
    "title": "Purina - Case Study"
   }
  ]
 },
 {
  "slug": "purina2",
  "title": "Purina - Pets at Work",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731536233031-I6KWZR8BQWUCLYIY3QEV/Purina+-+Evan+%26+Arthur.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/75517408?app_id=122963&muted=0&autopause=0",
    "title": "Purina - Evan & Arthur"
   }
  ]
 },
 {
  "slug": "purina3",
  "title": "Purina - Dog Chow",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731537036135-GDRSC6OXUYIU7PO5J753/Purina+Dow+Chow.png",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/803252869?h=d358b1cc07&app_id=122963&muted=0&autopause=0",
    "title": "Purina DogChow \"Bubbles\""
   }
  ]
 },
 {
  "slug": "the-chosen",
  "title": "The Chosen - More to the Story",
  "img": "/img/the-chosen-still-2.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/1240465146?h=8fc9c5fd98&app_id=122963&muted=0&autopause=0",
    "title": "The Chosen - Living Like a King"
   },
   {
    "src": "https://player.vimeo.com/video/1240465147?h=86b7e5e4a0&app_id=122963&muted=0&autopause=0",
    "title": "The Chosen - The Zealots of Jesus’ Day"
   },
   {
    "src": "https://player.vimeo.com/video/1240465148?app_id=122963&muted=0&autopause=0",
    "title": "The Chosen - Roman Might Makes Right?"
   }
  ]
 },
 {
  "slug": "3m",
  "title": "3M",
  "img": "https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1731537260249-UZIRF0KDYM1C3A42YEU9/3M+Thinsulate+3.jpg",
  "videos": [
   {
    "src": "https://player.vimeo.com/video/756437594?h=5c21683088&app_id=122963&muted=0&autopause=0",
    "title": "3M - Thinsulate"
   }
  ]
 }
];
const BY_SLUG = Object.fromEntries(PROJECTS.map((p) => [p.slug, p]));
const THUMBS = {"41106764": {"t": "/img/vt/41106764.jpg", "d": 61}, "72383349": {"t": "/img/vt/72383349.jpg", "d": 30}, "75517408": {"t": "/img/vt/75517408.jpg", "d": 56}, "77801760": {"t": "/img/vt/77801760.jpg", "d": 120}, "77843261": {"t": "/img/vt/77843261.jpg", "d": 60}, "81649466": {"t": "/img/vt/81649466.jpg", "d": 159}, "149922867": {"t": "/img/vt/149922867.jpg", "d": 30}, "755576988": {"t": "/img/vt/755576988.jpg", "d": 123}, "756435121": {"t": "/img/vt/756435121.jpg", "d": 31}, "756437594": {"t": "/img/vt/756437594.jpg", "d": 36}, "756437888": {"t": "/img/vt/756437888.jpg", "d": 30}, "756437973": {"t": "/img/vt/756437973.jpg", "d": 30}, "756450173": {"t": "/img/vt/756450173.jpg", "d": 92}, "756460066": {"t": "/img/vt/756460066.jpg", "d": 74}, "756471529": {"t": "/img/vt/756471529.jpg", "d": 128}, "756476179": {"t": "/img/vt/756476179.jpg", "d": 70}, "756476332": {"t": "/img/vt/756476332.jpg", "d": 117}, "756476489": {"t": "/img/vt/756476489.jpg", "d": 85}, "756499538": {"t": "/img/vt/756499538.jpg", "d": 53}, "756499635": {"t": "/img/vt/756499635.jpg", "d": 106}, "756503866": {"t": "/img/vt/756503866.jpg", "d": 60}, "756506004": {"t": "/img/vt/756506004.jpg", "d": 118}, "756506134": {"t": "/img/vt/756506134.jpg", "d": 106}, "756507833": {"t": "/img/vt/756507833.jpg", "d": 14}, "756508623": {"t": "/img/vt/756508623.jpg", "d": 14}, "756513931": {"t": "/img/vt/756513931.jpg", "d": 39}, "756514007": {"t": "/img/vt/756514007.jpg", "d": 50}, "756514677": {"t": "/img/vt/756514677.jpg", "d": 30}, "756515017": {"t": "/img/vt/756515017.jpg", "d": 65}, "756515469": {"t": "/img/vt/756515469.jpg", "d": 75}, "756515491": {"t": "/img/vt/756515491.jpg", "d": 6}, "756515532": {"t": "/img/vt/756515532.jpg", "d": 6}, "756516382": {"t": "/img/vt/756516382.jpg", "d": 22}, "756516463": {"t": "/img/vt/756516463.jpg", "d": 29}, "756516488": {"t": "/img/vt/756516488.jpg", "d": 30}, "756516594": {"t": "/img/vt/756516594.jpg", "d": 60}, "756964338": {"t": "/img/vt/756964338.jpg", "d": 14}, "802890453": {"t": "/img/vt/802890453.jpg", "d": 15}, "802890501": {"t": "/img/vt/802890501.jpg", "d": 15}, "802890593": {"t": "/img/vt/802890593.jpg", "d": 15}, "803251278": {"t": "/img/vt/803251278.jpg", "d": 301}, "803252869": {"t": "/img/vt/803252869.jpg", "d": 15}, "803253074": {"t": "/img/vt/803253074.jpg", "d": 31}, "803256201": {"t": "/img/vt/803256201.jpg", "d": 30}, "803261256": {"t": "/img/vt/803261256.jpg", "d": 30}, "998756130": {"t": "/img/vt/998756130.jpg", "d": 30}, "998808760": {"t": "/img/vt/998808760.jpg", "d": 67}, "998835219": {"t": "/img/vt/998835219.jpg", "d": 29}, "840215065": {"t": "/img/vt/840215065.jpg", "d": 113}, "920304570": {"t": "/img/vt/920304570.jpg", "d": 62}, "1240465146": {"t": "/img/vt/1240465146.jpg", "d": 251}, "1240465147": {"t": "/img/vt/1240465147.jpg", "d": 202}, "1240465148": {"t": "/img/vt/1240465148.jpg", "d": 268}};
// Every archive video, in archive order: { id, slug, project, title, src, thumb, dur }
const VIDEOS = PROJECTS.flatMap((p) => (p.videos || []).map((v) => {
  const id = (v.src.match(/\/video\/(\d+)/) || [])[1];
  const t = THUMBS[id];
  return { id, slug: p.slug, project: p.title, title: v.title, src: v.src, thumb: t ? t.t : p.img + '?format=750w', dur: t ? t.d : 0 };
})).filter((v) => v.id);
const BY_VIDEO = Object.fromEntries(VIDEOS.map((v) => [v.id, v]));
const ORDER = Object.fromEntries(VIDEOS.map((v, i) => [v.id, i]));
// Keeps the order given (the order is part of the signed link)
const cleanVideos = (s) => [...new Set(String(s || '').split(',').map((x) => x.trim()).filter((x) => BY_VIDEO[x]))];

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha(text) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(text))); }
async function sign(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
function readCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const cleanList = (s) => [...new Set(String(s || '').split(',').map((x) => x.trim()).filter((x) => BY_SLUG[x]))].sort();

// Which project (if any) does this path show?
function projectFor(pathname) {
  const m = pathname.match(/^\/archive(?:\/|-)([a-z0-9-]+?)(?:\.html)?\/?$/);
  return m && BY_SLUG[m[1]] ? m[1] : null;
}

// Portal only: streams one website video through this site so the frame picker can read its pixels
// (the file host doesn't allow that directly). Looks the file up by id; never fetches an address it was handed.
async function adminVideo(request, url) {
  const id = url.searchParams.get('id') || '';
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !key) return new Response('Not found', { status: 404 });
  const base = (process.env.SUPABASE_URL || 'https://dujhgnnphqmcskfpbmll.supabase.co').replace(/\/$/, '');
  const r = await fetch(base + '/rest/v1/site_videos?id=eq.' + id + '&select=video_url&limit=1', { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  const rows = r.ok ? await r.json() : [];
  const src = rows && rows[0] && rows[0].video_url;
  if (!src) return new Response('Not found', { status: 404 });
  const h = new Headers(); const range = request.headers.get('range'); if (range) h.set('range', range);
  const up = await fetch(src, { headers: h, redirect: 'follow' });
  const out = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store' });
  ['content-length', 'content-range'].forEach((k) => { const v = up.headers.get(k); if (v) out.set(k, v); });
  return new Response(up.body, { status: up.status === 206 ? 206 : up.ok ? 200 : up.status, headers: out });
}

export default async function middleware(request) {
  const where = new URL(request.url).pathname;
  if (where === '/social-machines' || where.startsWith('/social-machines/')) return pitchGate(request);

  // The sign-in page needs its stylesheet before anyone is signed in
  if (where === '/archive.css') return;

  const password = process.env.ARCHIVE_PASSWORD;
  if (!password) return new Response('The archive is locked until a password is set.', { status: 503 });

  const url = new URL(request.url);
  const path = url.pathname;
  const fullToken = await sha('paragraph-archive:' + password);
  const isFull = readCookie(request, FULL) === fullToken;

  // Review Portal owner side: needs the same password as the archive. (Reviewers use /review/r/<token>, which is not gated here.)
  if (path === '/review/admin' || path.startsWith('/review/admin/') || path === '/api/review-admin') {
    if (isFull && path === '/review/admin/video') return adminVideo(request, url);
    if (isFull) return;
    if (path === '/api/review-admin') return new Response(JSON.stringify({ error: 'Please sign in again.' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    return signInOr(request, url, password, fullToken);
  }

  // Sign out
  if (path === '/archive-logout') {
    return redirect('/archive', [cookie(FULL, '', 0), cookie(GRANT, '', 0)]);
  }

  // Shared link: /archive/share?p=nike,panini&k=SIGNATURE
  // Download one video of a shared reel: /archive/dl?v=<ids>&k=<sig>&id=<video id>  (needs VIMEO_TOKEN in Vercel)
  if (path === '/archive/dl') {
    const ids = cleanVideos(url.searchParams.get('v'));
    const id = url.searchParams.get('id') || '';
    const expected = (await sign(password, 'reel:' + ids.join(','))).slice(0, 20);
    if (!ids.length || !ids.includes(id) || (url.searchParams.get('k') || '') !== expected) return page(messageBody('This link isn’t valid', 'It may have been mistyped or switched off. Please ask Paragraph for a new link.'), 404);
    const token = process.env.VIMEO_TOKEN;
    if (!token) return page(messageBody('Downloads aren’t set up yet', 'Please ask Paragraph to send the files directly.'), 503);
    try {
      const r = await fetch('https://api.vimeo.com/videos/' + id + '?fields=download', { headers: { Authorization: 'bearer ' + token, Accept: 'application/vnd.vimeo.*+json;version=3.4' } });
      const files = r.ok ? ((await r.json()).download || []) : [];
      const best = files.filter((f) => f.link).sort((a, b) => (b.quality === 'source') - (a.quality === 'source') || (b.size || 0) - (a.size || 0))[0];
      if (best) return redirect(best.link, []);
    } catch (e) {}
    return page(messageBody('This video can’t be downloaded', 'Please ask Paragraph to send this file directly.'), 404);
  }
  if (path === '/archive/share' && url.searchParams.has('v')) {
    const ids = cleanVideos(url.searchParams.get('v'));
    const k = url.searchParams.get('k') || '';
    const expected = (await sign(password, 'reel:' + ids.join(','))).slice(0, 20);
    if (!ids.length || k !== expected) return page(messageBody('This link isn’t valid', 'It may have been mistyped or switched off. Please ask Paragraph for a new link.'), 404);
    return page(reelBody(ids, k, !!process.env.VIMEO_TOKEN), 200);
  }
  if (path === '/archive/share') {
    const slugs = cleanList(url.searchParams.get('p'));
    const k = url.searchParams.get('k') || '';
    const expected = (await sign(password, 'share:' + slugs.join(','))).slice(0, 20);
    if (!slugs.length || k !== expected) return page(messageBody('This link isn’t valid', 'It may have been mistyped or switched off. Please ask Paragraph for a new link.'), 404);
    // Remember these projects for this visitor (added to any they already have)
    const granted = await readGrant(request, password);
    const all = [...new Set([...granted, ...slugs])].sort();
    const grantCookie = cookie(GRANT, all.join('.') + '~' + (await sign(password, 'grant:' + all.join('.'))), THIRTY_DAYS);
    if (slugs.length === 1) return redirect('/archive/' + slugs[0], [grantCookie]);
    return page(collectionBody(slugs), 200, [grantCookie]);
  }

  // Link builder (owner only)
  if (path === '/archive/links') {
    if (!isFull) return signInOr(request, url, password, fullToken);
    const ids = cleanVideos(url.searchParams.get('v'));
    let link = '';
    if (ids.length) {
      const k = (await sign(password, 'reel:' + ids.join(','))).slice(0, 20);
      link = `${url.origin}/archive/share?v=${ids.join(',')}&k=${k}`;
    }
    return page(builderBody(ids, link), 200);
  }

  // Signed in with the password: everything is open
  if (isFull) return;

  // A single project page the visitor was given a link to
  const slug = projectFor(path);
  if (slug && (await readGrant(request, password)).includes(slug)) return;

  return signInOr(request, url, password, fullToken);
}

async function readGrant(request, password) {
  const raw = readCookie(request, GRANT);
  if (!raw || !raw.includes('~')) return [];
  const [list, sig] = raw.split('~');
  if (sig !== (await sign(password, 'grant:' + list))) return [];
  return list.split('.').filter((s) => BY_SLUG[s]);
}

async function signInOr(request, url, password, fullToken) {
  if (request.method === 'POST') {
    let given = '';
    try { given = String((await request.formData()).get('password') || ''); } catch (e) {}
    if (given === password) return redirect(url.pathname + url.search, [cookie(FULL, fullToken, THIRTY_DAYS)]);
    return page(signInBody(true), 401);
  }
  return page(signInBody(false), 401);
}

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return new Response(null, { status: 303, headers });
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(body, status, cookies = []) {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Archive — Paragraph</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/archive.css">
<link rel="stylesheet" href="/screening.css">
</head>
<body>
<header>
  <a class="mark" href="${SITE}index.html" aria-label="Paragraph home"><img src="https://images.squarespace-cdn.com/content/v1/659dbf35c403a37668fc103f/1d1ecc1e-95c4-476b-9223-124c816f6cbd/%C2%B6_v1.png?format=300w" alt=""></a>
  <nav><a href="${SITE}film-tv.html">Film &amp; TV</a><a href="${SITE}branded.html">Branded</a><a href="${SITE}about.html">About</a></nav>
</header>
<main>${body}</main>
<script src="/screening.js"></script>
</body></html>`;
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  cookies.forEach((c) => headers.append('Set-Cookie', c));
  return new Response(html, { status, headers });
}

function signInBody(wrong) {
  return `<form class="card" method="post">
    <div class="rule" aria-hidden="true"></div>
    <div class="label">Archive</div>
    <h1>This collection is <em>private.</em><br>Enter the password to continue.</h1>
    <label class="sr" for="password">Password</label>
    <div class="field">
      <input id="password" name="password" type="password" placeholder="Password" autocomplete="current-password" autofocus required>
      <button type="button" class="eye" aria-label="Show password" aria-pressed="false" aria-controls="password">
        <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
        <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
      </button>
    </div>
    <div class="error" role="alert">${wrong ? 'That password isn’t right. Please try again.' : ''}</div>
    <button type="submit" class="enter">Enter</button>
    <div><a class="back" href="${SITE}index.html">← Back to Paragraph</a></div>
  </form>
  <script>(function(){var b=document.querySelector('.eye'),i=document.getElementById('password');
   b.addEventListener('click',function(){var s=i.type==='password';i.type=s?'text':'password';
    b.setAttribute('aria-pressed',s?'true':'false');b.setAttribute('aria-label',s?'Hide password':'Show password');i.focus();});})();</script>`;
}

function messageBody(title, text) {
  return `<div class="card"><div class="rule" aria-hidden="true"></div><div class="label">Archive</div>
    <h1>${esc(title)}</h1><p class="note">${esc(text)}</p><a class="back" href="${SITE}index.html">← Back to Paragraph</a></div>`;
}

function tile(p, href) {
  return `<a class="tile" href="${href}"><img src="${esc(p.img)}?format=750w" alt="" loading="lazy"><span>${esc(p.title)}</span></a>`;
}

function collectionBody(slugs) {
  const list = slugs.map((s) => BY_SLUG[s]).filter((p) => p.videos && p.videos.length);
  const data = JSON.stringify(list.map((p) => ({ slug: p.slug, title: p.title, videos: p.videos }))).replace(/</g, '\\u003c');
  const first = list[0];
  const tiles = slugs.map((s, i) => {
    const p = BY_SLUG[s];
    return `<button type="button" class="tile" data-i="${list.indexOf(p)}" aria-pressed="${i === 0}" aria-label="Play ${esc(p.title)}"><img src="${esc(p.img)}?format=750w" alt="" loading="lazy"><span>${esc(p.title)}</span></button>`;
  }).join('');
  return `<div class="card wide"><div class="rule" aria-hidden="true"></div><div class="label">Selected work</div>
    <h1>A few projects, <em>picked for you.</em></h1>
    ${first ? `<div class="player" id="player"><iframe id="frame" src="${esc(first.videos[0].src)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="${esc(first.videos[0].title || first.title)}"></iframe></div>
    <div class="nowbar"><div class="now" id="now"></div><div class="vids" id="vids" role="group" aria-label="Videos in this project"></div></div>` : ''}
    <div class="grid">${tiles}</div>
    <a class="back" href="${SITE}index.html">← Back to Paragraph</a></div>
  <script>(function(){
    var P=${data},frame=document.getElementById('frame'),now=document.getElementById('now'),vids=document.getElementById('vids'),cur=0,curV=0;
    if(!frame)return;
    function src(u,auto){return u+(u.indexOf('?')<0?'?':'&')+'autoplay='+(auto?1:0);}
    function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
    function show(i,v,auto){cur=i;curV=v;var p=P[i],vid=p.videos[v];
      frame.src=src(vid.src,auto);frame.title=vid.title||p.title;
      now.innerHTML=esc(p.title)+(vid.title&&vid.title!==p.title?'<small>'+esc(vid.title)+'</small>':'');
      vids.innerHTML=p.videos.length>1?p.videos.map(function(x,k){return '<button type="button" aria-pressed="'+(k===v)+'" aria-label="Play video '+(k+1)+': '+esc(x.title||'')+'">'+(k+1)+'</button>';}).join(''):'';
      [].forEach.call(vids.querySelectorAll('button'),function(b,k){b.addEventListener('click',function(){show(cur,k,true);});});
      [].forEach.call(document.querySelectorAll('button.tile'),function(t){t.setAttribute('aria-pressed',String(+t.dataset.i===i));});}
    [].forEach.call(document.querySelectorAll('button.tile'),function(t){t.addEventListener('click',function(){var i=+t.dataset.i;if(i<0)return;show(i,0,true);
      document.getElementById('player').scrollIntoView({behavior:'smooth',block:'start'});});});
    show(0,0,false);
  })();</script>`;
}

const mmss = (d) => (d ? Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0') : '');

function builderBody(selected, link) {
  const box = link
    ? `<div class="linkbox"><label class="sr" for="share">Share link</label><input id="share" type="text" readonly value="${esc(link)}">
       <button type="button" class="enter" id="copy">Copy link</button><a class="enter" href="${esc(link)}" target="_blank" rel="noopener">Preview</a><span class="muted" id="copied" role="status"></span></div>`
    : '';
  const groups = `<div class="grid dense">${VIDEOS.map((v) =>
      `<label class="pick"><input type="checkbox" name="pick" value="${v.id}"${selected.includes(v.id) ? ' checked' : ''}><span class="tile"><img src="${esc(v.thumb)}" alt="" loading="lazy"><span>${esc(v.project)}${v.dur ? ` <i>${mmss(v.dur)}</i>` : ''}<small>${esc(v.title && v.title !== v.project ? v.title : '')}</small></span></span></label>`).join('')}</div>`;
  const info = Object.fromEntries(VIDEOS.map((v) => [v.id, [v.thumb, v.title || v.project]]));
  return `<form class="card wide" method="get">
    <div class="rule" aria-hidden="true"></div><div class="label">Custom reel</div>
    <h1>Pick the videos. <em>Set the order.</em></h1>
    <p class="note">Choose any videos from the archive, then drag them (or use the arrows) into the order you want. Your client gets a private reel page with just those videos, in that order.</p>
    ${box}
    <div class="order" id="order" hidden><div class="label">Your reel, in order</div><ol id="olist"></ol></div>
    ${groups}
    <input type="hidden" name="v" id="v">
    <div class="bar"><button type="submit" class="enter">Make link</button><button type="button" class="enter ghost" id="clear">Clear</button><span class="muted" id="count"></span>
      <a class="back" style="margin:0 0 0 auto" href="/archive">Full archive</a><a class="back" style="margin:0" href="/archive-logout">Sign out</a></div>
  </form>
  <script>(function(){
    var INFO=${JSON.stringify(info).replace(/</g, '\\u003c')};
    var f=document.querySelector('form'),v=document.getElementById('v'),c=document.getElementById('count'),box=document.getElementById('order'),ol=document.getElementById('olist');
    var seq=${JSON.stringify(selected)};
    var boxes={};[].forEach.call(f.querySelectorAll('input[name=pick]'),function(x){boxes[x.value]=x;});
    function sync(){
      seq=seq.filter(function(id){return boxes[id]&&boxes[id].checked;});
      Object.keys(boxes).forEach(function(id){if(boxes[id].checked&&seq.indexOf(id)<0)seq.push(id);});
      Object.keys(boxes).forEach(function(id){var t=boxes[id].parentNode.querySelector('.num');if(!t){t=document.createElement('b');t.className='num';boxes[id].nextSibling.appendChild(t);}
        var i=seq.indexOf(id);t.textContent=i<0?'':i+1;});
      box.hidden=!seq.length;ol.innerHTML='';
      seq.forEach(function(id,i){
        var li=document.createElement('li');li.draggable=true;li.dataset.id=id;
        li.innerHTML='<span class="n">'+(i+1)+'</span><img alt="" src="'+INFO[id][0]+'"><span class="t"></span><span class="mv"><button type="button" data-d="-1" aria-label="Move earlier">←</button><button type="button" data-d="1" aria-label="Move later">→</button><button type="button" data-d="x" aria-label="Remove">×</button></span>';
        li.querySelector('.t').textContent=INFO[id][1];ol.appendChild(li);});
      var k=seq.length;c.textContent=k?k+' video'+(k>1?'s':'')+' selected':'';
    }
    function move(id,to){var i=seq.indexOf(id);if(i<0)return;seq.splice(i,1);seq.splice(Math.max(0,Math.min(seq.length,to)),0,id);sync();}
    ol.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var id=b.closest('li').dataset.id,d=b.dataset.d;
      if(d==='x'){boxes[id].checked=false;sync();}else move(id,seq.indexOf(id)+ +d);});
    var drag=null;
    ol.addEventListener('dragstart',function(e){drag=e.target.closest('li');if(drag){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',drag.dataset.id);drag.classList.add('drag');}});
    ol.addEventListener('dragend',function(){if(drag)drag.classList.remove('drag');drag=null;});
    ol.addEventListener('dragover',function(e){e.preventDefault();var li=e.target.closest('li');if(!li||!drag||li===drag)return;
      var r=li.getBoundingClientRect(),after=(e.clientX-r.left)>r.width/2;ol.insertBefore(drag,after?li.nextSibling:li);});
    ol.addEventListener('drop',function(e){e.preventDefault();seq=[].map.call(ol.children,function(li){return li.dataset.id;});sync();});
    f.addEventListener('change',sync);sync();
    document.getElementById('clear').addEventListener('click',function(){seq=[];Object.keys(boxes).forEach(function(id){boxes[id].checked=false;});sync();});
    f.addEventListener('submit',function(e){
      if(!seq.length){e.preventDefault();c.textContent='Pick at least one video';return;}
      v.value=seq.join(',');f.querySelectorAll('input[name=pick]').forEach(function(x){x.disabled=true;});});
    var b=document.getElementById('copy');if(b)b.addEventListener('click',function(){var i=document.getElementById('share');i.select();
      (navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.resolve(document.execCommand('copy'))).then(function(){document.getElementById('copied').textContent='Copied';});});
  })();</script>`;
}

function reelBody(ids, k, canDownload) {
  const list = ids.map((id) => BY_VIDEO[id]);
  const first = list[0];
  const attrs = (v) => `data-lb data-src="${esc(v.src)}" data-title="${esc(v.title || v.project)}"`;
  const tiles = list.length > 1 ? `<div class="grid">${list.map((v) =>
    `<button type="button" class="tile" ${attrs(v)} aria-label="Play ${esc(v.title || v.project)}"><img src="${esc(v.thumb)}" alt="" loading="lazy"><span>${esc(v.project)}<small>${esc(v.title && v.title !== v.project ? v.title : '')}</small></span></button>`).join('')}</div>` : '';
  return `<div class="card wide"><div class="rule" aria-hidden="true"></div><div class="label">Selected work</div>
    <h1>${list.length > 1 ? 'A few projects, <em>picked for you.</em>' : 'A project, <em>picked for you.</em>'}</h1>
    <div class="player" id="player"><button type="button" class="play-cover" id="cover" ${attrs(first)} aria-label="Play ${esc(first.title || first.project)}"><img src="${esc(first.thumb)}" alt=""><span class="play-icon" aria-hidden="true"><svg viewBox="0 0 66 98"><polygon points="1.5,1.5 64.5,49 1.5,96.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></button></div>
    ${list.length === 1 ? `<div class="nowbar"><div class="now" id="now">${esc(first.project)}${first.title && first.title !== first.project ? `<small>${esc(first.title)}</small>` : ''}</div></div>` : '<div style="margin-bottom:56px"></div>'}
    ${tiles}
    ${canDownload ? `<div class="dlbar"><button type="button" class="enter" id="dlall">Download all (${list.length})</button><span class="muted" id="dlnote">Files download one after another. Allow multiple downloads if your browser asks.</span>
      <div class="dllist">${list.map((v) => `<a href="/archive/dl?v=${ids.join(',')}&k=${k}&id=${v.id}">↓ ${esc(v.title || v.project)}</a>`).join('')}</div></div>` : ''}
    ${canDownload ? `<script>(function(){var base=${JSON.stringify('/archive/dl?v=' + ids.join(',') + '&k=' + k + '&id=')},ids=${JSON.stringify(ids)};
      document.getElementById('dlall').addEventListener('click',function(){var i=0;(function next(){if(i>=ids.length)return;var f=document.createElement('iframe');f.style.display='none';f.src=base+ids[i++];document.body.appendChild(f);setTimeout(next,2500);})();});
    })();</script>` : ''}
    <a class="back" href="${SITE}index.html">← Back to Paragraph</a></div>`;
}

// ---------- Social Machines: private pitch microsite ----------
const PITCH = 'pg_sm';
const PITCH_PATH = '/social-machines';
const pitchCookie = (value, maxAge) =>
  `${PITCH}=${encodeURIComponent(value)}; Path=${PITCH_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

async function pitchGate(request) {
  const password = process.env.SOCIAL_MACHINES_PASSWORD || process.env.ARCHIVE_PASSWORD;
  if (!password) return new Response('This presentation is locked until a password is set.', { status: 503 });
  const url = new URL(request.url);
  const token = await sha('paragraph-social-machines:' + password);

  if (url.pathname === PITCH_PATH + '/logout') return redirect(PITCH_PATH, [pitchCookie('', 0)]);
  if (readCookie(request, PITCH) === token) return;   // signed in: serve the page

  if (request.method === 'POST') {
    let given = '';
    try { given = String((await request.formData()).get('password') || ''); } catch (e) {}
    if (given === password) return redirect(url.pathname + url.search, [pitchCookie(token, THIRTY_DAYS)]);
    return pitchPage(true);
  }
  return pitchPage(false);
}

function pitchPage(wrong) {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Social Machines — Paragraph</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..700;1,400..700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:Figtree,system-ui,sans-serif;background:#E9E7E2;color:#151514;display:grid;place-items:center;min-height:100vh;overflow:hidden;-webkit-font-smoothing:antialiased}
canvas{position:fixed;inset:0;width:100%;height:100%;opacity:.55}
form{position:relative;width:min(440px,calc(100vw - 40px));text-align:center;animation:up 1.2s cubic-bezier(.16,1,.3,1) both}
@keyframes up{from{opacity:0;transform:translateY(24px)}}
.mark{font-size:clamp(40px,8vw,64px);font-weight:600;font-style:italic;letter-spacing:-.02em;margin:0}
.sub{margin:.4em 0 2.2em;font-style:italic;font-size:18px;color:#398592}
.lbl{display:block;margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#7EA4A9}
input{width:100%;padding:16px 20px;border-radius:16px;border:1.5px solid #C9C8C3;background:rgba(255,255,255,.6);font:inherit;font-size:17px;color:#151514;outline:none;transition:border-color .2s}
input:focus{border-color:#398592}
button{margin-top:14px;width:100%;padding:15px;border:0;border-radius:99px;background:#267C86;color:#fff;font:inherit;font-size:16px;font-weight:600;cursor:pointer}
button:hover{background:#1d6a73}
.err{min-height:1.4em;margin:10px 0 0;font-size:14px;color:#a0505f}
.back{display:inline-block;margin-top:26px;font-size:13px;color:#94928F;text-decoration:none}
.back:hover{color:#151514}
</style></head>
<body>
<canvas aria-hidden="true"></canvas>
<form method="post">
  <h1 class="mark">social_machines</h1>
  <p class="sub">a documentary about artificial intimacy</p>
  <label class="lbl" for="password">Private presentation</label>
  <input id="password" name="password" type="password" placeholder="Password" autocomplete="current-password" autofocus required>
  <button type="submit">Enter</button>
  <p class="err" role="alert">${wrong ? 'That password isn’t right. Please try again.' : ''}</p>
  <a class="back" href="/">← Paragraph</a>
</form>
<script>(function(){var c=document.querySelector('canvas'),x=c.getContext('2d'),n=900,P=[],g=Math.PI*(3-Math.sqrt(5));
for(var i=0;i<n;i++){var y=1-i/(n-1)*2,r=Math.sqrt(1-y*y);P.push([Math.cos(g*i)*r,y,Math.sin(g*i)*r]);}
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
function f(t){t/=1000;var d=Math.min(2,devicePixelRatio||1),W=c.width=innerWidth*d,H=c.height=innerHeight*d,R=Math.min(W,H)*.3,a=t*.18,cy=Math.cos(a),sy=Math.sin(a);
x.fillStyle='#2c2b2e';for(var i=0;i<n;i++){var p=P[i],k=1+.15*Math.sin(2.7*p[0]+t)*Math.cos(2.1*p[1]-t*.8),X=p[0]*k,Y=p[1]*k*.8,Z=p[2]*k,x1=X*cy-Z*sy,z1=X*sy+Z*cy,e=(z1+1.3)/2.6;
x.globalAlpha=.05+.4*e*e;var s=(.6+1.2*e)*d;x.fillRect(W/2+x1*R-s/2,H/2+Y*R-s/2,s,s);}requestAnimationFrame(f);}requestAnimationFrame(f);})();</script>
</body></html>`;
  return new Response(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
