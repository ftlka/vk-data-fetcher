'use strict';
const got = require('got');
const fs = require('fs');
const vk = require('vk-call');

// accessToken is valid for 24 hours, after that we need
// to get it again with clientId aka appId
const keys = JSON.parse(fs.readFileSync('keys.json'));  
const token = keys.accessToken;

const api = new vk.VK({
	token,
	access_token: token,
	timeout: 10000
});

// api.call("users.get", { user_ids: 1 })
//   .then(users => console.info(users));


// finding our region id. It is pretty slow, so I just
// precomputed it
// 1154131 - Свердловская область
async function findRegionId(countryId, title) {
	let ourRegion;
	await api.call('database.getRegions', {country_id: countryId})
		.then(res => res.items)
		.then(regions => {
			ourRegion = regions.find(region =>
				region.title === title
				);
		});
	return ourRegion.id;
}

const russiaId = 1;
/*
const ourRegionTitle = 'Свердловская область';
let regionId;
findRegionId(russiaId, ourRegionTitle)
	.then(id => {
		regionId = id;
		console.info(id);
	});
*/
const regionId = 1154131;

// all cities of sverglovsk region

// api.call('database.getCities', {
// 	country_id: russiaId,
// 	region_id: regionId,
// 	need_all: 1,
// 	count: 1000
// })
// 	.then(res => {
// 		fs.writeFileSync('cities.json', JSON.stringify(res.items), 'utf8')
// });

const fields = [
	'id',
	'verified', 'sex', 'bdate', 'city', 'country', 'home_town',
	'has_photo', 'online', 'domain', 'has_mobile',
	'contacts', 'site', 'education', 'universities', 'schools',
	'status', 'last_seen', 'followers_count', 'occupation',
	'nickname', 'relatives', 'relation', 'personal', 'connections',
	'exports', 'activities', 'interests', 'music', 'movies',
	'tv', 'books', 'games', 'about', 'quotes', 'screen_name',
	'counters', 'timezone', 'maiden_name', 'career', 'military'
];

const cities = JSON.parse(fs.readFileSync('cities.json'));
let people = 0;

async function fetchData(offset, cityIdx) {
	console.info('fetching');
	if (cityIdx == cities.length) {
		fs.appendFile('data.json', ']');
		return;
	}
	try {
		const res = await api.call('users.search', {
			city: cities[cityIdx].id,
			fields,
			offset,
			count: 100,
			sort: 0
		});

		if (!res || !res.items || !res.items.length) {
			throw "Er";
		}		

		const ids = res.items.map(record => record.id);
		people += res.items.length;
		console.info(people);

		// adding groups and friends to fields
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];

			try {
				const friends = await api.call('friends.get', { user_id: id });
				if (friends && friends.items) {
					console.info('friends');
					res.items[i].friends = friends.items;
				}
				const groups = await api.call('groups.get',
					{ user_id: id, count: 1000 });
				if (groups && groups.items) {
					console.info('groups');
					res.items[i].groups = groups.items;
				}
			} catch (e) {
				console.info('is probably a private account');
			}
		}

		try {
			for (let i = 0; i < res.items.length; i++) {
				if (res.items[i]) {
					await fs.appendFile('data.json', JSON.stringify(res.items[i]));
					await fs.appendFile('data.json', ',\n');
				}
			}
		} catch (e) {
			console.info('cant append');
		}

		if (offset + 30 <= 1000) {
			offset += 30;
		} else {
			cityIdx++;
			offset = 0;
		}

		fetchData(offset, cityIdx);
	} catch (e) {
		console.info('NO DATA');
		fetchData(0, cityIdx + 1);
		return;
	}
} 

fs.writeFileSync('data.json', '[');
fetchData(0, 0);
