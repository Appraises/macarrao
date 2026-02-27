import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testGameApi() {
    console.log('Testing Game API on port 3001...');
    const slug = 'valorant';

    try {
        console.log(`Fetching game: ${slug}...`);
        const res = await axios.get(`${API_URL}/games/${slug}`);
        console.log('[PASS] Game found:', res.data.name);
        console.log('Terms included:', res.data.terms?.length || 0);
        if (res.data.terms && res.data.terms.length > 0) {
            console.log('Sample term:', res.data.terms[0].word);
        } else {
            console.log('[WARN] No terms found for this game.');
        }
    } catch (error: any) {
        console.error('[FAIL] Error fetching game:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testGameApi();
