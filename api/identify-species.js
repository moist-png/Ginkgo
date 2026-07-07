// Server-side proxy for PlantNet species identification.
//
// Why this exists: calling my-api.plantnet.org directly from the browser
// (as the app used to) is unreliable — some phones/browsers block or drop
// that cross-site request, and it also exposes the API key in the app's
// public code. Routing through this same-origin endpoint fixes both.
//
// Setup (one-time, in the Vercel dashboard):
//   Project -> Settings -> Environment Variables
//   Add:  PLANTNET_API_KEY = <your key from my.plantnet.org>
//   Then redeploy.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'The tree identifier is not configured yet. Add PLANTNET_API_KEY in the Vercel project\'s Environment Variables, then redeploy.',
    });
    return;
  }

  try {
    const { imageBase64, mimeType, organ } = req.body || {};
    if (!imageBase64) {
      res.status(400).json({ error: 'No photo was received. Please try again.' });
      return;
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    const blob = new Blob([buffer], { type: mimeType || 'image/jpeg' });

    const form = new FormData();
    form.append('images', blob, 'photo.jpg');
    form.append('organs', organ || 'auto');

    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`;
    const plantnetRes = await fetch(url, { method: 'POST', body: form });

    if (!plantnetRes.ok) {
      let message = `Identification failed (error ${plantnetRes.status}). Please try again.`;
      if (plantnetRes.status === 401 || plantnetRes.status === 403) {
        message = 'The PlantNet API key was rejected. Check it is copied correctly into the PLANTNET_API_KEY setting in Vercel.';
      } else if (plantnetRes.status === 404) {
        message = 'No plant could be recognised in that photo. Try a clearer photo of a leaf, flower, fruit or bark.';
      } else if (plantnetRes.status === 429) {
        message = 'Daily free identification limit reached. Try again tomorrow.';
      }
      res.status(plantnetRes.status).json({ error: message });
      return;
    }

    const data = await plantnetRes.json();
    const results = (data.results || []).slice(0, 5).map((r) => ({
      scientificName: r?.species?.scientificNameWithoutAuthor || 'Unknown',
      commonName: (r?.species?.commonNames && r.species.commonNames[0]) || '',
      score: typeof r?.score === 'number' ? r.score : 0,
    }));

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong contacting the identification service. Please try again.' });
  }
}
