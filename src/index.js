import * as core from '@actions/core';
import * as fs from 'fs';
import axios from 'axios';

function setOutput(name, value) {
  core.setOutput(name, value);
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `${name}=${value}\n`);
  }
}

class RobloxApi {
  constructor(roblosecurity, apiKey) {
    this.cookie = `.ROBLOSECURITY=${roblosecurity}`;
    this.csrfToken = null;
    this.apiKey = apiKey;
    
    // Open Cloud API client for publishing
    if (apiKey) {
      this.universesClient = axios.create({
        baseURL: 'https://apis.roblox.com/universes',
        headers: {
          'x-api-key': apiKey
        }
      });
    }
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

  async createPlace(experienceId, name) {
    const response = await this.request(
      `https://apis.roblox.com/universes/v1/user/universes/${experienceId}/places`,
      { method: 'POST', body: JSON.stringify({ templatePlaceId: 95206881 }) }
    );
    const placeId = response.placeId;
    
    if (name) {
      await this.updatePlace(experienceId, placeId, { displayName: name });
    }
    
    return placeId;
  }

  async updatePlace(experienceId, placeId, updates) {
    if (!this.apiKey) {
      throw new Error('API Key is required for updating place. Please provide api_key input.');
    }
    
    const updateMask = Object.keys(updates).join(',');
    await this.universesClient.patch(
      `/cloud/v2/universes/${experienceId}/places/${placeId}?updateMask=${updateMask}`,
      updates
    );
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

  async publishPlace(experienceId, placeId, filePath, versionType = 'Published') {
    if (!this.apiKey) {
      throw new Error('API Key is required for publishing. Please provide api_key input.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath);
    
    // 使用 Open Cloud API v1 发布场景
    const response = await this.universesClient.post(
      `/v1/${experienceId}/places/${placeId}/versions?versionType=${versionType}`,
      fileContent,
      {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }
    );

    return response.data;
  }
}

async function run() {
  try {
    const action = core.getInput('action', { required: true });
    const roblosecurity = core.getInput('roblosecurity', { required: true });
    const apiKey = core.getInput('api_key'); // Optional, required for publish action
    const experienceId = parseInt(core.getInput('experience_id', { required: true }), 10);

    const api = new RobloxApi(roblosecurity, apiKey);

    switch (action) {
      case 'create': {
        const placeName = core.getInput('place_name');
        const placeId = await api.createPlace(experienceId, placeName);
        setOutput('place_id', placeId.toString());
        core.info(`Created place: ${placeId}${placeName ? ` (${placeName})` : ''}`);
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
        setOutput('places', JSON.stringify(places));
        core.info(`Found ${places.length} place(s)`);
        break;
      }
      case 'publish': {
        const placeId = parseInt(core.getInput('place_id', { required: true }), 10);
        const filePath = core.getInput('file_path', { required: true });
        const versionType = core.getInput('version_type') || 'Published';
        
        const result = await api.publishPlace(experienceId, placeId, filePath, versionType);
        setOutput('success', 'true');
        if (result.versionNumber) {
          setOutput('version_number', result.versionNumber.toString());
          core.info(`Published place ${placeId} - Version ${result.versionNumber}`);
        } else {
          core.info(`Published place ${placeId} successfully`);
        }
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}. Use 'create', 'delete', 'list', or 'publish'.`);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : 'An unknown error occurred');
  }
}

run();
