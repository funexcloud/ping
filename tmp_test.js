const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const {
    FUNERAL_API_ENDPOINT,
    getFuneralApiServiceKey,
} = require('./funeral-odms-config');

async function fetchFuneralHalls(searchQuery = '', pageNo = 1, numOfRows = 1000) {
    const apiUrl = `${FUNERAL_API_ENDPOINT}?serviceKey=${encodeURIComponent(getFuneralApiServiceKey())}&pageNo=${pageNo}&numOfRows=${numOfRows}&apiType=XML`;
    const response = await axios.get(apiUrl, {
        headers: { Accept: 'application/xml' },
        timeout: 10000
    });

    const xmlData = typeof response.data === 'string' ? response.data : String(response.data);
    const parsed = await parseStringPromise(xmlData);
    
    // Debug
    const body = parsed?.response?.body?.[0] || parsed?.body?.[0] || {};
    console.log("Total Count from API:", body?.totalCount?.[0]);
    
    const itemsData = body?.items?.[0]?.item || [];
    const items = Array.isArray(itemsData) ? itemsData : [itemsData];
    console.log("Items received:", items.length);
    
    let funeralHalls = items
        .filter(Boolean)
        .map(item => ({
            name:
                item?.fcltNm?.[0] ||
                item?.facltNm?.[0] ||
                item?.facilityName?.[0] ||
                item?.funeralHallName?.[0] ||
                item?.funeralHallNm?.[0] ||
                item?.name?.[0] ||
                '',
            address:
                item?.rdnmadr?.[0] ||
                item?.lnmadr?.[0] ||
                item?.address?.[0] ||
                item?.addr?.[0] ||
                '',
            phone:
                item?.telno?.[0] ||
                item?.phone?.[0] ||
                item?.tel?.[0] ||
                ''
        }))
        .map(item => ({
            name: item.name.trim(),
            address: item.address.trim(),
            phone: item.phone.trim()
        }))
        .filter(item => item.name);

    if (!searchQuery || searchQuery.length < 2) {
        return funeralHalls;
    }

    const lowered = searchQuery.toLowerCase();
    return funeralHalls.filter(item =>
        item.name.toLowerCase().includes(lowered) ||
        item.address.toLowerCase().includes(lowered)
    );
}

fetchFuneralHalls('서울').then(res => {
    console.log("Matched results:", res.length);
    console.log(res.slice(0, 5));
}).catch(console.error);
