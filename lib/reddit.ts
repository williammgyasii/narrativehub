import "server-only";

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  permalink: string;
  url: string;
  score: number;
  numComments: number;
  createdUtc: number;
  relevanceScore: number;
}

// Only local/regional subreddits where real people ask for services
const SUBREDDITS = [
  "Maryland",
  "baltimore",
  "washingtondc",
  "nova",
  "columbiaMD",
  "frederickmd",
  "Annapolis",
  "MontgomeryCountyMD",
  "HowardCounty",
  "weddingplanning",
];

// Queries that signal someone is LOOKING for a photographer, not sharing work
const SEARCH_QUERIES = [
  '"looking for" photographer',
  '"need a" photographer',
  '"recommend" photographer',
  '"hiring" photographer',
  '"suggestions" photographer',
  '"anyone know" photographer',
  '"wedding photographer"',
  '"event photographer"',
  '"real estate photographer"',
  '"headshot" photographer',
];

// Words that strongly indicate a service request
const INTENT_SIGNALS = [
  "looking for",
  "need a",
  "need to find",
  "anyone know",
  "recommend",
  "recommendation",
  "suggestions",
  "hiring",
  "searching for",
  "who do you use",
  "help me find",
  "can anyone suggest",
  "does anyone know",
  "where can i find",
  "budget",
  "quote",
  "pricing",
  "affordable",
  "how much",
  "available",
  "book",
  "booking",
];

// Maryland/DMV location signals
const LOCATION_SIGNALS = [
  "maryland",
  "baltimore",
  "columbia",
  "silver spring",
  "bethesda",
  "rockville",
  "annapolis",
  "frederick",
  "bowie",
  "laurel",
  "ellicott city",
  "howard county",
  "montgomery county",
  "prince george",
  "pg county",
  "dmv",
  "dc area",
  "nova",
  "northern virginia",
  "washington dc",
  "arlington",
  "fairfax",
  "college park",
  "towson",
  "dundalk",
  "owings mills",
  "catonsville",
  "glen burnie",
];

// Posts from photographers showing their own work -- filter these out
const NOISE_PATTERNS = [
  /\b(i am|i'm) a photographer\b/i,
  /\bmy (work|portfolio|photos|shots|website)\b/i,
  /\bcheck out my\b/i,
  /\bhire me\b/i,
  /\bself.promo/i,
  /\b(critique|feedback|review).*(my|these)\b/i,
  /\bjust shot\b/i,
  /\bshot (this|these)\b/i,
  /\b(selling|for sale)\b/i,
  /\bgear (advice|question|help)\b/i,
  /\bwhat (camera|lens|equipment)\b/i,
  /\bediting (tips|software|workflow)\b/i,
];

const USER_AGENT = "Unscripted:v1.0 (by StoriesByKay)";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scorePost(post: { title: string; selftext: string; subreddit: string }): number {
  const text = `${post.title} ${post.selftext}`.toLowerCase();

  // Discard noise from photographers self-promoting
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return -1;
  }

  let score = 0;

  // Intent signals (someone looking for a service)
  for (const signal of INTENT_SIGNALS) {
    if (text.includes(signal)) score += 3;
  }

  // Location signals (Maryland/DMV area)
  const isLocalSub = ["maryland", "baltimore", "washingtondc", "nova",
    "columbiaMD", "frederickmd", "annapolis", "montgomerycountymd",
    "howardcounty"].includes(post.subreddit.toLowerCase());

  if (isLocalSub) {
    score += 4;
  }

  for (const loc of LOCATION_SIGNALS) {
    if (text.includes(loc)) {
      score += 2;
      break;
    }
  }

  // Photography service type mentions
  if (/wedding/i.test(text)) score += 2;
  if (/corporate|headshot|event/i.test(text)) score += 2;
  if (/real estate|architectural|property/i.test(text)) score += 2;

  // Question marks suggest someone asking
  if (post.title.includes("?")) score += 1;

  return score;
}

async function searchSubreddit(
  subreddit: string,
  query: string
): Promise<RedditPost[]> {
  const url = new URL(`https://www.reddit.com/r/${subreddit}/search.json`);
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "new");
  url.searchParams.set("restrict_sr", "1");
  url.searchParams.set("limit", "25");
  url.searchParams.set("t", "month");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const children = data?.data?.children || [];

    return children.map(
      (child: { data: Record<string, unknown> }) => ({
        id: child.data.name as string,
        title: child.data.title as string,
        selftext: ((child.data.selftext as string) || "").slice(0, 1000),
        author: child.data.author as string,
        subreddit: child.data.subreddit as string,
        permalink: child.data.permalink as string,
        url: child.data.url as string,
        score: (child.data.score as number) || 0,
        numComments: (child.data.num_comments as number) || 0,
        createdUtc: (child.data.created_utc as number) || 0,
        relevanceScore: 0,
      })
    );
  } catch {
    return [];
  }
}

export async function scanRedditForLeads(): Promise<RedditPost[]> {
  const allPosts = new Map<string, RedditPost>();

  for (const subreddit of SUBREDDITS) {
    // Use 2 focused query batches per subreddit instead of 3 broad ones
    const queries = [
      SEARCH_QUERIES.slice(0, 5).join(" OR "),
      SEARCH_QUERIES.slice(5).join(" OR "),
    ];

    for (const query of queries) {
      const posts = await searchSubreddit(subreddit, query);
      for (const post of posts) {
        if (post.author === "[deleted]" || post.author === "AutoModerator") continue;

        const relevance = scorePost(post);

        // Only keep posts with a minimum relevance score
        if (relevance < 3) continue;

        post.relevanceScore = relevance;

        const existing = allPosts.get(post.id);
        if (!existing || existing.relevanceScore < relevance) {
          allPosts.set(post.id, post);
        }
      }
      await sleep(1200);
    }
  }

  // Sort by relevance first, then by recency
  return Array.from(allPosts.values()).sort(
    (a, b) => b.relevanceScore - a.relevanceScore || b.createdUtc - a.createdUtc
  );
}
