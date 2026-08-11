/**
 * Everything the shop says, and everything it asks.
 *
 * Each exhibit carries its own question, asked right after you read it. That is
 * the whole scoring loop — there is no separate examination, so a question never
 * covers something the shop has not just told you.
 *
 * Two rules govern this file, carried over from the rest of the Freedom Archive:
 *
 *  1. No invented quotations. Sanyal is never made to "say" anything. The radio
 *     narrates; it does not quote.
 *  2. Nothing here asserts a fact that is not well documented. Where the record
 *     is thin or contested — the language Bandi Jivan was first written in, for
 *     instance — no question is asked rather than a guess being made.
 *
 * `answer` indexes into `options`. An exhibit with no `question` is still worth
 * research points; it just does not ask anything.
 */

/** The print rack, in the main shop: six issues, one per turning point. */
export const PAPERS = [
  {
    year: '1893',
    headline: 'Born in Varanasi',
    body:
      'Sachindra Nath Sanyal is born in Varanasi, a city with a dense political ' +
      'and intellectual life that shaped the circles he would later organise.',
    question: {
      q: 'In which city was Sanyal born?',
      options: ['Patna', 'Varanasi', 'Kolkata', 'Delhi'],
      answer: 1,
    },
  },
  {
    year: '1915',
    headline: 'The Banaras Conspiracy',
    body:
      'Revolutionary organising during the First World War brings Sanyal into ' +
      'the Banaras Conspiracy Case. He is sentenced to transportation for life.',
    question: {
      q: 'Which 1915 case first sent Sanyal to the Andamans?',
      options: [
        'The Kakori Conspiracy Case',
        'The Meerut Conspiracy Case',
        'The Banaras Conspiracy Case',
        'The Lahore Conspiracy Case',
      ],
      answer: 2,
    },
  },
  {
    year: '1917',
    headline: 'The Cellular Jail',
    body:
      'Transportation takes him to the Cellular Jail at Port Blair in the ' +
      'Andaman Islands — the punishment colonial authorities reserved for those ' +
      'they considered irreconcilable.',
    question: {
      q: 'The Cellular Jail stands in which island group?',
      options: ['The Andaman Islands', 'Lakshadweep', 'The Sundarbans', 'The Maldives'],
      answer: 0,
    },
  },
  {
    year: '1922',
    headline: 'Bandi Jivan',
    body:
      'His prison memoir sets down the experience of political captivity. It ' +
      'circulated widely among a younger generation of revolutionaries.',
    question: {
      q: 'What kind of book is Bandi Jivan?',
      options: ['A prison memoir', 'A novel', 'A book of poems', 'A legal treatise'],
      answer: 0,
    },
  },
  {
    year: '1924',
    headline: 'The Hindustan Republican Association',
    body:
      'With Ram Prasad Bismil and other comrades, Sanyal helps establish the ' +
      'HRA, which argued for an independent Indian republic.',
    question: {
      q: 'Which revolutionary helped Sanyal establish the H.R.A.?',
      options: [
        'Ram Prasad Bismil',
        'Bal Gangadhar Tilak',
        'Gopal Krishna Gokhale',
        'Lala Lajpat Rai',
      ],
      answer: 0,
    },
  },
  {
    year: '1925',
    headline: 'Kakori',
    body:
      'After the Kakori train action, the colonial government prosecutes the HRA ' +
      'network. Sanyal is returned to the Cellular Jail — a second term there, ' +
      'which few endured.',
    question: {
      q: 'In which year did the Kakori train action take place?',
      options: ['1915', '1919', '1925', '1930'],
      answer: 2,
    },
  },
];

/** The wireless set: archival narration, deliberately not phrased as quotation. */
export const BROADCASTS = [
  {
    text:
      'The Banaras Conspiracy Case of 1915 ended in a sentence of transportation ' +
      'for life, sending Sanyal across the Bay of Bengal to Port Blair.',
    question: {
      q: 'To which prison was Sanyal transported for life?',
      options: ['Yerwada Jail', 'Alipore Jail', 'Tihar Jail', 'The Cellular Jail'],
      answer: 3,
    },
  },
  {
    text:
      'Bandi Jivan carried an account of the Andaman penal settlement to readers ' +
      'on the mainland who would otherwise never have heard of it.',
    question: {
      q: 'Who was Bandi Jivan written for?',
      options: [
        'Readers on the mainland',
        'The prison administration',
        'The London press',
        'A court of appeal',
      ],
      answer: 0,
    },
  },
  {
    text:
      'The Hindustan Republican Association, founded in 1924, set out the case ' +
      'for an independent republic rather than dominion status.',
    question: {
      q: 'What form of government did the H.R.A. argue for?',
      options: [
        'Continued princely rule',
        'An independent republic',
        'Dominion status within the Empire',
        'A colonial legislative council',
      ],
      answer: 1,
    },
  },
  {
    text:
      'The Kakori prosecution of 1925 broke much of the HRA network and returned ' +
      'Sanyal to the Cellular Jail for a second term.',
    question: {
      q: 'How many separate terms did Sanyal serve in the Cellular Jail?',
      options: ['One', 'Two', 'Three', 'Four'],
      answer: 1,
    },
  },
];

/** The television: four title cards. */
export const FRAMES = [
  {
    title: 'SACHINDRA NATH SANYAL',
    caption: '1893 — 1942',
    question: {
      q: 'In which year did Sanyal die?',
      options: ['1931', '1938', '1942', '1947'],
      answer: 2,
    },
  },
  {
    title: 'BANDI JIVAN',
    caption: 'AN ACCOUNT OF CAPTIVITY',
    question: {
      q: 'Whose captivity does Bandi Jivan describe?',
      options: ['Sanyal’s own', 'Bhagat Singh’s', 'Tilak’s', 'Bismil’s'],
      answer: 0,
    },
  },
  {
    title: 'THE H.R.A. · 1924',
    caption: 'A REPUBLICAN ARGUMENT',
    question: {
      q: 'Which organisation did Sanyal help found in 1924?',
      options: [
        'The Indian National Army',
        'The Swaraj Party',
        'The Hindustan Republican Association',
        'The Servants of India Society',
      ],
      answer: 2,
    },
  },
  {
    title: 'KAKORI · 1925',
    caption: 'THE NETWORK PROSECUTED',
    question: {
      q: 'What did the Kakori prosecution target?',
      options: [
        'A newspaper syndicate',
        'The H.R.A. network',
        'A trade union',
        'A princely court',
      ],
      answer: 1,
    },
  },
];

/** The composing room, through the back door: how the words got out. */
export const PLATES = [
  {
    year: '1922',
    headline: 'Bandi Jivan in Print',
    body:
      'Sanyal’s account of the penal settlement reached the mainland and ' +
      'circulated among a younger generation of revolutionaries.',
    question: {
      q: 'Among whom did Bandi Jivan circulate most?',
      options: [
        'Colonial administrators',
        'A younger generation of revolutionaries',
        'Foreign correspondents',
        'Princely households',
      ],
      answer: 1,
    },
  },
  {
    year: '1925',
    headline: 'The Revolutionary',
    body:
      'The Hindustan Republican Association circulated a manifesto under this ' +
      'title. Sanyal is generally credited with drafting it.',
    question: {
      q: 'What was the title of the H.R.A.’s 1925 manifesto?',
      options: ['The Revolutionary', 'Young India', 'Bandi Jivan', 'The Republic'],
      answer: 0,
    },
  },
  {
    year: '1925',
    headline: 'The House Confiscated',
    body:
      'The colonial government confiscated Sanyal’s family property as part of ' +
      'the action against the revolutionary network.',
    question: {
      q: 'In which city was Sanyal’s family property confiscated?',
      options: ['Lahore', 'Varanasi', 'Kanpur', 'Allahabad'],
      answer: 1,
    },
  },
];

/** The case cabinet: the prosecutions that bracketed his life. */
export const FILES = [
  {
    ref: 'CASE I · 1915',
    headline: 'Banaras Conspiracy',
    body:
      'Wartime revolutionary organising brings the first prosecution. The ' +
      'sentence is transportation for life to the Cellular Jail.',
    question: {
      q: 'What sentence did the first case bring?',
      options: [
        'A fine and release',
        'Six months’ rigorous imprisonment',
        'Transportation for life',
        'House arrest in Varanasi',
      ],
      answer: 2,
    },
  },
  {
    ref: 'CASE II · 1925',
    headline: 'Kakori',
    body:
      'After the train action at Kakori the government prosecutes the H.R.A. ' +
      'network. Sanyal is sent back to the Andamans for a second term.',
    question: {
      q: 'Where was Sanyal sent after the Kakori prosecution?',
      options: [
        'Back to the Andamans',
        'To a Lahore jail',
        'Into exile abroad',
        'Released on parole',
      ],
      answer: 0,
    },
  },
  {
    ref: 'CLOSED · 1942',
    headline: 'Released, in Ill Health',
    body:
      'Tuberculosis contracted in prison ends his life in 1942, five years ' +
      'before the independence he had argued and been imprisoned for.',
    question: {
      q: 'Which illness, contracted in prison, caused Sanyal’s death?',
      options: ['Cholera', 'Tuberculosis', 'Malaria', 'Typhoid'],
      answer: 1,
    },
  },
];

/**
 * The jail wing: six cells, each carrying part of what the Cellular Jail was.
 *
 * Sanyal was sent there twice, which almost nobody was. Everything here is about
 * the place and the sentence rather than about his interior life, which no
 * source can supply.
 */
export const CELLS = [
  {
    ref: 'CELL 01',
    headline: 'Kala Pani',
    body:
      'Transportation across the sea — kala pani, the black water — carried a ' +
      'penalty beyond the sentence itself: for many, crossing meant losing caste ' +
      'and any ordinary return to the life left behind.',
    question: {
      q: 'What did the term "kala pani" refer to?',
      options: [
        'A prison ration',
        'Transportation across the sea',
        'A labour quota',
        'A colonial tax',
      ],
      answer: 1,
    },
  },
  {
    ref: 'CELL 02',
    headline: 'Six Hundred and Ninety-Six',
    body:
      'The jail at Port Blair was built with 696 cells, each meant to hold one ' +
      'prisoner alone. Solitude was the architecture, not an accident of it.',
    question: {
      q: 'How many cells was the Cellular Jail built with?',
      options: ['198', '404', '696', '1,024'],
      answer: 2,
    },
  },
  {
    ref: 'CELL 03',
    headline: 'Seven Wings, One Tower',
    body:
      'Seven wings radiated from a central watchtower, so a handful of guards ' +
      'could observe every corridor. The front of each wing faced the back of ' +
      'the next, so no prisoner could see or signal another.',
    question: {
      q: 'How were the jail’s wings arranged?',
      options: [
        'In a square around a yard',
        'Radiating from a central tower',
        'In two parallel rows',
        'In a single long corridor',
      ],
      answer: 1,
    },
  },
  {
    ref: 'CELL 04',
    headline: 'The Oil Mill',
    body:
      'Prisoners were set to labour that ordinarily used animals — turning the ' +
      'kolhu, the oil mill, and pounding coir. Quotas were set high and failure ' +
      'to meet them was punished.',
    question: {
      q: 'What labour were prisoners set to at the mill?',
      options: [
        'Turning the oil press',
        'Weaving silk',
        'Cutting stone',
        'Printing forms',
      ],
      answer: 0,
    },
  },
  {
    ref: 'CELL 05',
    headline: 'Sent Twice',
    body:
      'Sanyal is among the very few sent to the Cellular Jail on two separate ' +
      'sentences — after 1915, and again after the Kakori prosecution.',
    question: {
      q: 'What makes Sanyal’s imprisonment unusual?',
      options: [
        'He was never formally charged',
        'He was sent to the Cellular Jail twice',
        'He was held only on the mainland',
        'He served his sentence in Britain',
      ],
      answer: 1,
    },
  },
  {
    ref: 'CELL 06',
    headline: 'Hunger Strike',
    body:
      'Prisoners in the Cellular Jail used hunger strikes to press for ' +
      'recognition as political prisoners rather than as common convicts.',
    question: {
      q: 'What did hunger strikes in the jail press for?',
      options: [
        'Shorter sentences',
        'Recognition as political prisoners',
        'Transfer to the mainland',
        'Payment for labour',
      ],
      answer: 1,
    },
  },
];

/**
 * The labour yard, beyond the jail wing: what the sentence actually consisted
 * of, and what became of the place afterwards.
 */
export const YARD = [
  {
    ref: 'YARD 01',
    headline: 'The Kolhu',
    body:
      'The oil mill stood in the yard. Prisoners were harnessed to a beam and ' +
      'made to turn it to press oil — work ordinarily done by cattle — against ' +
      'a daily quota measured in pounds.',
    question: {
      q: 'Whose work were prisoners at the kolhu made to do?',
      options: ['Clerks’', 'Cattle’s', 'Sailors’', 'Masons’'],
      answer: 1,
    },
  },
  {
    ref: 'YARD 02',
    headline: 'Coir',
    body:
      'Coconut husk was beaten into coir fibre by hand. Quotas here were set the ' +
      'same way, and shortfalls were met with punishment rather than rest.',
    question: {
      q: 'What was beaten into fibre in the yard?',
      options: ['Coconut husk', 'Flax', 'Jute leaf', 'Bamboo cane'],
      answer: 0,
    },
  },
  {
    ref: 'YARD 03',
    headline: 'The Strike of 1933',
    body:
      'A hunger strike in 1933 pressed again for political-prisoner status. It ' +
      'was met with forced feeding, and prisoners died in the course of it.',
    question: {
      q: 'How were the 1933 hunger strikers met?',
      options: [
        'With immediate release',
        'With forced feeding',
        'With transfer to Britain',
        'With a public inquiry',
      ],
      answer: 1,
    },
  },
  {
    ref: 'YARD 04',
    headline: 'Repatriation',
    body:
      'Sustained campaigning on the mainland led to political prisoners being ' +
      'moved back to Indian jails in the later 1930s, and the settlement ceased ' +
      'to be used for them.',
    question: {
      q: 'What ended the settlement’s use for political prisoners?',
      options: [
        'A prison fire',
        'Campaigning that brought repatriation',
        'The Second World War',
        'A change of governor',
      ],
      answer: 1,
    },
  },
  {
    ref: 'YARD 05',
    headline: 'Three Wings Remain',
    body:
      'Of the seven wings that radiated from the tower, three still stand. The ' +
      'rest were demolished, and what is left is the shape the memorial keeps.',
    question: {
      q: 'How many of the seven wings still stand?',
      options: ['One', 'Three', 'Five', 'All seven'],
      answer: 1,
    },
  },
  {
    ref: 'YARD 06',
    headline: 'A National Memorial',
    body:
      'The jail was declared a National Memorial in 1979. The building that was ' +
      'built to keep its prisoners from being seen is now visited to see them.',
    question: {
      q: 'In which year was the jail declared a National Memorial?',
      options: ['1947', '1963', '1979', '1997'],
      answer: 2,
    },
  },
];

/**
 * The safe house: the underground as it actually worked.
 *
 * Drawn from the Freedom Archive museum's REVOLUTIONARY ACTIVITIES hall. Every
 * object here is a reconstruction — no artefact of this kind survives in a form
 * this project could show — and the text says so rather than implying otherwise.
 */
export const SAFEHOUSE = [
  {
    ref: 'ROOM 01 · 1907',
    headline: 'The Anushilan Samiti',
    body:
      'A gymnasium, a study circle and a political organisation at once. Sanyal ' +
      'joined in 1907 and became associated with its work in Varanasi, later ' +
      'helping extend it far beyond Bengal.',
    question: {
      q: 'In which year did Sanyal join the Anushilan Samiti?',
      options: ['1893', '1907', '1915', '1924'],
      answer: 1,
    },
  },
  {
    ref: 'ROOM 02 · REACH',
    headline: 'Maps of the Network',
    body:
      'The network reached across Bengal, the United Provinces, Bihar and the ' +
      'Punjab. Recruitment ran on personal introduction rather than enrolment — ' +
      'which is exactly why the surviving record of it is so thin.',
    question: {
      q: 'How did the network recruit?',
      options: [
        'By personal introduction',
        'By printed application',
        'By public meeting',
        'By newspaper advertisement',
      ],
      answer: 0,
    },
  },
  {
    ref: 'ROOM 03 · 1915',
    headline: 'The Plan of 1915',
    body:
      'A rising coordinated across provinces, drawing on Ghadar Party organising ' +
      'among Indian soldiers and timed to the pressures of the war. It collapsed ' +
      'when its details reached the authorities before the date set.',
    question: {
      q: 'Why did the plan of 1915 collapse?',
      options: [
        'Its funds ran out',
        'Its details reached the authorities in advance',
        'Its leaders withdrew',
        'The war ended first',
      ],
      answer: 1,
    },
  },
  {
    ref: 'ROOM 04 · CIPHER',
    headline: 'Secret Codes',
    body:
      'Correspondence used substitution ciphers, agreed code words and book codes ' +
      'keyed to an agreed edition. The simplest was a fixed shift of the alphabet ' +
      '— widely used, and widely broken, because letter frequency gives it away.',
    question: {
      q: 'What gives a simple shift cipher away?',
      options: ['Letter frequency', 'Paper quality', 'Ink colour', 'Envelope size'],
      answer: 0,
    },
  },
  {
    ref: 'ROOM 05 · CORRESPONDENCE',
    headline: 'Secret Letters',
    body:
      'Letters between organisers were written on the assumption that strangers ' +
      'would read them. Innocuous cover subjects, assumed names and pre-agreed ' +
      'phrasings were routine — and left the record deliberately ambiguous.',
    question: {
      q: 'What did organisers assume about their letters?',
      options: [
        'That they would be lost',
        'That they would be intercepted and read',
        'That they would be published',
        'That they would never arrive',
      ],
      answer: 1,
    },
  },
  {
    ref: 'ROOM 06 · RECONSTRUCTION',
    headline: 'Invisible Ink',
    body:
      'Household chemistry, used because it was household chemistry: citrus juice, ' +
      'milk, dilute starch. Written between the lines of an ordinary letter and ' +
      'developed with gentle heat, none of it raised suspicion in a search.',
    question: {
      q: 'How was concealed writing brought out?',
      options: ['With gentle heat', 'With water', 'With sunlight', 'With salt'],
      answer: 0,
    },
  },
  {
    ref: 'ROOM 07 · CIRCULATION',
    headline: 'The Press and the Leaflet',
    body:
      'A press was worth more to a network than any single member. Leaflets were ' +
      'cheap enough to abandon, short enough to read once and anonymous enough to ' +
      'carry — printed in Hindi, Urdu, Bengali and English, and passed hand to hand.',
    question: {
      q: 'What made leaflets suited to underground work?',
      options: [
        'They were expensive and rare',
        'They were signed by their authors',
        'They were cheap, short and anonymous',
        'They were sold in bookshops',
      ],
      answer: 2,
    },
  },
];

/**
 * The record office: the colonial file.
 *
 * From the museum's BRITISH INTELLIGENCE hall. The hall's own argument is the
 * uncomfortable one — that the people trying to destroy these networks wrote the
 * documents that preserve them.
 */
export const RECORDS = [
  {
    ref: 'FILE 01 · METHOD',
    headline: 'The Watching State',
    body:
      'Colonial policing produced its own enormous archive: informant reports, ' +
      'intercepted correspondence, surveillance registers, lists of suspects to be ' +
      'watched at railway stations and ports. A hostile archive is the main archive.',
    question: {
      q: 'Why does colonial intelligence matter to this history?',
      options: [
        'It was destroyed in 1947',
        'A hostile archive is the main surviving archive',
        'It was written by the revolutionaries',
        'It recorded nothing of use',
      ],
      answer: 1,
    },
  },
  {
    ref: 'FILE 02 · PROCESS',
    headline: 'Arrest Warrants',
    body:
      'The paperwork that turned a suspect into an accused: name, physical ' +
      'description, the offence alleged, the authority issuing it. Description ' +
      'mattered because identification was by eye and by paper.',
    question: {
      q: 'Why did a warrant carry a physical description?',
      options: [
        'Identification was by eye and by paper',
        'It was required for the newspapers',
        'It set the size of the reward',
        'It determined the sentence',
      ],
      answer: 0,
    },
  },
  {
    ref: 'FILE 03 · INFORMANTS',
    headline: 'Police Reports',
    body:
      'Reporting depended on informants — some paid, some coerced, some members ' +
      'who had been turned. The results mixed accurate detail with rumour and with ' +
      'the informant’s own interest in appearing useful.',
    question: {
      q: 'What distortion runs through informant reports?',
      options: [
        'Understatement of numbers',
        'Inflation of the threat',
        'Omission of dates',
        'Translation error',
      ],
      answer: 1,
    },
  },
  {
    ref: 'FILE 04 · PUBLICITY',
    headline: 'Notices and Rewards',
    body:
      'The state advertising its own difficulty. Printed notices carried a ' +
      'description and a sum payable for information, and were posted at police ' +
      'stations, at railway stations, and in the press.',
    question: {
      q: 'Where were wanted notices posted?',
      options: [
        'Only inside courtrooms',
        'Only in London',
        'At police and railway stations',
        'Nowhere — they were secret',
      ],
      answer: 2,
    },
  },
  {
    ref: 'FILE 05 · THE TRIALS',
    headline: 'Court Documents',
    body:
      'The conspiracy trials — Banaras in 1915, Kakori from 1925 — generated the ' +
      'fullest documentation of these organisations that exists: charge sheets, ' +
      'depositions, exhibits and judgments, resting on approver testimony, seized ' +
      'documents and confessions.',
    question: {
      q: 'What evidence did the conspiracy trials rest on?',
      options: [
        'Approver testimony and seized documents',
        'Photographs alone',
        'Newspaper reports',
        'Anonymous letters only',
      ],
      answer: 0,
    },
  },
  {
    ref: 'FILE 06 · SURVEILLANCE',
    headline: 'No Clean Escape',
    body:
      'Postal interception, station watching, informants inside the organisation. ' +
      'An organiser under surveillance faced choices where every option carried a ' +
      'cost — which is the condition the record describes, not an exception to it.',
    question: {
      q: 'Which was NOT a documented surveillance method?',
      options: [
        'Postal interception',
        'Watching railway stations',
        'Informants inside the organisation',
        'Telephone tapping of villages',
      ],
      answer: 3,
    },
  },
];

/**
 * The memorial hall: the generation after, and the end of his own life.
 *
 * From the museum's INFLUENCE and LEGACY halls. The timeline exhibit carries the
 * chronology the rest of the map is walked out of order.
 */
export const MEMORIAL = [
  {
    ref: 'PANEL 01 · LINEAGE',
    headline: 'What He Passed On',
    body:
      'His influence ran through two channels: the organisation he co-founded, ' +
      'which outlived his involvement in it, and the memoir, which reached readers ' +
      'he never met.',
    question: {
      q: 'Through what two channels did his influence run?',
      options: [
        'A newspaper and a school',
        'An organisation and a memoir',
        'A party and a trade union',
        'A temple and a press',
      ],
      answer: 1,
    },
  },
  {
    ref: 'PANEL 02 · 1893—1942',
    headline: 'The Chronology',
    body:
      'Born Varanasi 1893. Anushilan Samiti 1907. Banaras conspiracy and ' +
      'transportation for life 1915. Bandi Jivan 1922. The H.R.A. founded 1924. ' +
      'Kakori and a second sentence 1925. Released in ill health 1937. Died in ' +
      'internment at Gorakhpur, 7 February 1942.',
    question: {
      q: 'Which came first — the H.R.A., or Bandi Jivan?',
      options: [
        'Bandi Jivan, in 1922',
        'The H.R.A., in 1924',
        'They were the same year',
        'Neither is dated',
      ],
      answer: 0,
    },
  },
  {
    ref: 'PANEL 03 · 1907—1931',
    headline: 'Bhagat Singh',
    body:
      'The most famous member of the organisation Sanyal helped found. He joined ' +
      'the H.R.A. and became central to its reorganised form, and was executed at ' +
      'Lahore on 23 March 1931 following the Lahore Conspiracy Case.',
    question: {
      q: 'Where was Bhagat Singh executed?',
      options: ['Gorakhpur', 'Faizabad', 'Lahore', 'Allahabad'],
      answer: 2,
    },
  },
  {
    ref: 'PANEL 04 · 1897—1927',
    headline: 'Ram Prasad Bismil',
    body:
      'Co-founder of the H.R.A. alongside Sanyal in 1924, a poet and writer, and ' +
      'among the principal accused in the Kakori case. He was executed at Gorakhpur ' +
      'Jail on 19 December 1927 — the city where Sanyal himself would die.',
    question: {
      q: 'What links Bismil’s death to Sanyal’s?',
      options: [
        'The same year',
        'The same city, Gorakhpur',
        'The same illness',
        'The same prison sentence',
      ],
      answer: 1,
    },
  },
  {
    ref: 'PANEL 05 · 1900—1927',
    headline: 'Ashfaqulla Khan',
    body:
      'A member of the association and among those convicted in the Kakori ' +
      'Conspiracy Case. He was executed at Faizabad on 19 December 1927 — the same ' +
      'day as Bismil, in a different city.',
    question: {
      q: 'Ashfaqulla Khan was executed on the same day as whom?',
      options: ['Bhagat Singh', 'Chandrashekhar Azad', 'Ram Prasad Bismil', 'Sanyal'],
      answer: 2,
    },
  },
  {
    ref: 'PANEL 06 · 1906—1931',
    headline: 'Chandrashekhar Azad',
    body:
      'He escaped the Kakori arrests and was central to reconstituting the ' +
      'organisation afterwards. He died at Allahabad in February 1931 after a ' +
      'confrontation with police.',
    question: {
      q: 'What did Azad do after the Kakori arrests?',
      options: [
        'Left political work',
        'Rebuilt the organisation',
        'Gave evidence for the prosecution',
        'Fled abroad permanently',
      ],
      answer: 1,
    },
  },
  {
    ref: 'PANEL 07 · 1928',
    headline: 'From H.R.A. to H.S.R.A.',
    body:
      'In 1928 the surviving membership reconstituted the body at Delhi as the ' +
      'Hindustan Socialist Republican Association. The inserted word marked a real ' +
      'shift — an explicit socialist economic programme, not only a republican ' +
      'constitutional one.',
    question: {
      q: 'What did the inserted word in H.S.R.A. mark?',
      options: [
        'A change of city',
        'A socialist economic programme',
        'A merger with Congress',
        'A new founder',
      ],
      answer: 1,
    },
  },
  {
    ref: 'PANEL 08 · 1937',
    headline: 'Released, in Ill Health',
    body:
      'Released in 1937 after years of imprisonment and seriously declining ' +
      'health. The record then places him under further colonial restriction ' +
      'rather than in open political activity.',
    question: {
      q: 'What followed his release in 1937?',
      options: [
        'Open political leadership',
        'Further colonial restriction',
        'Emigration',
        'A seat in the legislature',
      ],
      answer: 1,
    },
  },
  {
    ref: 'PANEL 09 · 7 FEB 1942',
    headline: 'Gorakhpur',
    body:
      'He died at Gorakhpur on 7 February 1942 while interned, aged 48 or 49. The ' +
      'record describes tuberculosis, contracted in the penal settlement, and ' +
      'prolonged imprisonment as the major factors — five years before independence.',
    question: {
      q: 'How long before independence did Sanyal die?',
      options: ['One year', 'Five years', 'Ten years', 'Twenty years'],
      answer: 1,
    },
  },
  {
    ref: 'PANEL 10 · COMMEMORATION',
    headline: 'Among the Unsung',
    body:
      'He is commemorated among the "unsung heroes" of the independence struggle ' +
      'in the Ministry of Culture’s Amrit Mahotsav programme — a category that ' +
      'itself admits how uneven the memory of this period has been. The Cellular ' +
      'Jail is now a national memorial.',
    question: {
      q: 'Under what category is Sanyal officially commemorated?',
      options: [
        'Founding fathers',
        'Unsung heroes',
        'Martyrs of 1857',
        'Constitutional framers',
      ],
      answer: 1,
    },
  },
];

/**
 * Every exhibit, tagged with the area it stands in.
 *
 * The area matters twice: the totals stay honest, and the Inspector asks a
 * question drawn from wherever it caught you.
 */
export const EXHIBITS = [
  ...PAPERS.map((x, i) => ({ ...x, key: `paper:${i}`, area: 'shop' })),
  ...BROADCASTS.map((x, i) => ({ ...x, key: `radio:${i}`, area: 'shop' })),
  ...FRAMES.map((x, i) => ({ ...x, key: `tv:${i}`, area: 'shop' })),
  ...PLATES.map((x, i) => ({ ...x, key: `plate:${i}`, area: 'composing' })),
  ...FILES.map((x, i) => ({ ...x, key: `file:${i}`, area: 'composing' })),
  ...CELLS.map((x, i) => ({ ...x, key: `cell:${i}`, area: 'jail' })),
  ...YARD.map((x, i) => ({ ...x, key: `yard:${i}`, area: 'yard' })),
  ...SAFEHOUSE.map((x, i) => ({ ...x, key: `safe:${i}`, area: 'safehouse' })),
  ...RECORDS.map((x, i) => ({ ...x, key: `rec:${i}`, area: 'records' })),
  ...MEMORIAL.map((x, i) => ({ ...x, key: `mem:${i}`, area: 'memorial' })),
];

export const EXHIBIT_COUNT = EXHIBITS.length;
export const QUESTION_COUNT = EXHIBITS.filter((x) => x.question).length;

/** Human labels for the areas, used by the caught-by-the-Inspector card. */
export const AREA_NAMES = {
  shop: 'THE SHOP FLOOR',
  composing: 'THE COMPOSING ROOM',
  corridor: 'THE PASSAGE',
  jail: 'THE JAIL WING',
  yard: 'THE LABOUR YARD',
  safehouse: 'THE SAFE HOUSE',
  records: 'THE RECORD OFFICE',
  memorial: 'THE MEMORIAL HALL',
};

/**
 * Questions the Inspector can ask in a given area.
 *
 * Caught in the jail wing and you are asked about the jail. The passage has no
 * exhibits of its own, so it borrows the jail's — it is the way in.
 */
export function questionsFor(area) {
  const from = area === 'corridor' ? 'jail' : area;
  return EXHIBITS.filter((x) => x.area === from && x.question).map((x) => x.question);
}
