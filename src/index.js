import * as core from '@actions/core';

class RobloxApi {
  constructor(roblosecurity) {
    this.cookie = `.ROBLOSECURITY=${roblosecurity}`;
    this.csrfToken = null;
  }

  async request(url, options = {}) {
    const headers = {
      Cookie: this.cookie,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.csrfToken) {
      headers['X-CSRF-TOKEN'] = this.csrfToken;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 403) {
      const newToken = response.headers.get('x-csrf-token');
      if (newToken && !this.csrfToken) {
        this.csrfToken = newToken;
        return this.request(url, options);
      }
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Roblox API error (${response.status}): ${text}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return {};
  }

  async createPlace(experienceId) {
    const response = await this.request(
      `https://apis.roblox.com/universes/v1/user/universes/${experienceId}/places`,
      { method: 'POST', body: JSON.stringify({ templatePlaceId: 95206881 }) }
    );
    return response.placeId;
  }

  async deletePlace(experienceId, placeId) {
    await this.request(
      `https://apis.roblox.com/universes/v1/universes/${experienceId}/places/${placeId}/remove-place`,
      { method: 'POST' }
    );
  }

  async getPlace(placeId) {
    return this.request(`https://develop.roblox.com/v2/places/${placeId}`);
  }

  async listPlaces(experienceId) {
    const allPlaces = [];
    let cursor = null;

    do {
      const url = new URL(`https://develop.roblox.com/v1/universes/${experienceId}/places`);
      if (cursor) url.searchParams.set('cursor', cursor);

      const response = await this.request(url.toString());

      for (const item of response.data) {
        const place = await this.getPlace(item.id);
        allPlaces.push({
          id: place.id,
          name: place.name,
          description: place.description,
          maxPlayerCount: place.maxPlayerCount,
          allowCopying: place.allowCopying,
          isRootPlace: place.isRootPlace,
          currentSavedVersion: place.currentSavedVersion,
        });
      }

      cursor = response.nextPageCursor;
    } while (cursor);

    return allPlaces;
  }
}

async function run() {
  try {
    const action = core.getInput('action', { required: true });
    const roblosecurity = core.getInput('roblosecurity', { required: true });
    const experienceId = parseInt(core.getInput('experience_id', { required: true }), 10);

    const api = new RobloxApi(roblosecurity);

    switch (action) {
      case 'create': {
        const placeId = await api.createPlace(experienceId);
        core.setOutput('place_id', placeId.toString());
        core.info(`Created place: ${placeId}`);
        break;
      }
      case 'delete': {
        const placeId = parseInt(core.getInput('place_id', { required: true }), 10);
        await api.deletePlace(experienceId, placeId);
        core.info(`Deleted place: ${placeId}`);
        break;
      }
      case 'list': {
        const places = await api.listPlaces(experienceId);
        core.setOutput('places', JSON.stringify(places));
        core.info(`Found ${places.length} place(s)`);
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}. Use 'create', 'delete', or 'list'.`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : 'An unknown error occurred');
  }
}

run();
