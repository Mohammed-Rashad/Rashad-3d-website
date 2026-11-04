// Search Sketchfab for downloadable, CC-licensed candidates (search needs no token; downloading does).
const qs = process.argv.slice(2);
for (const q of qs) {
  const url = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&q=${encodeURIComponent(q)}&count=6&sort_by=-likeCount`;
  const r = await fetch(url, { headers: { 'User-Agent': 'rashad-site-builder' } }); const j = await r.json();
  console.log(`\n## ${q}`);
  for (const m of j.results || []) console.log(`- ${m.name} | ${m.license?.label || '?'} | ${m.user?.displayName} | faces ${m.faceCount} | https://sketchfab.com/3d-models/${m.uid}`);
}
