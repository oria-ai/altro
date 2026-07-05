// GET /api/stones — static catalog (stones.json), served from the repo.
//
// Supabase was retired (project deleted during a plan downgrade). The 36-stone
// catalog and its Cloudflare-R2 image URLs (cdn.shaym.beauty) now live in the
// committed stones.json. require() guarantees Vercel bundles the file with this
// function. Card thumbnails use Vercel Image Optimization (see vercel.json
// `images`) so the gallery loads small WebPs instead of the ~2 MB source looks.
//
// Offers/dreams (which needed a write store) are dormant until a small datastore
// is wired back; top_offer_usd is null for now.

const data = require("../stones.json");

module.exports = async (req, res) => {
  // Static data — cache hard at the edge, refresh in the background.
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.json(data);
};
