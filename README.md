# Roblox Place Action

GitHub Action for managing Roblox places using private API.

## Features

- **Create** - Create a new place in an experience
- **Delete** - Remove a place from an experience
- **List** - List all places in an experience

## Usage

### Create a Place

```yaml
- uses: white-dragon-studio/roblox-place-action@v1
  with:
    action: create
    roblosecurity: ${{ secrets.ROBLOSECURITY }}
    experience_id: '123456789'
```

### Delete a Place

```yaml
- uses: white-dragon-studio/roblox-place-action@v1
  with:
    action: delete
    roblosecurity: ${{ secrets.ROBLOSECURITY }}
    experience_id: '123456789'
    place_id: '987654321'
```

### List Places

```yaml
- uses: white-dragon-studio/roblox-place-action@v1
  with:
    action: list
    roblosecurity: ${{ secrets.ROBLOSECURITY }}
    experience_id: '123456789'
```

### Publish a Place

```yaml
- uses: white-dragon-studio/roblox-place-action@v1
  with:
    action: publish
    roblosecurity: ${{ secrets.ROBLOSECURITY }}
    api_key: ${{ secrets.ROBLOX_API_KEY }}
    experience_id: '123456789'
    place_id: '987654321'
    file_path: 'path/to/game.rbxl'
    version_type: 'Published'  # Optional, defaults to Published
```

## Inputs

| Name | Description | Required |
|------|-------------|----------|
| `action` | Action to perform: `create`, `delete`, `list`, or `publish` | Yes |
| `roblosecurity` | Roblox `.ROBLOSECURITY` cookie | Yes |
| `experience_id` | Roblox Experience (Universe) ID | Yes |
| `place_id` | Roblox Place ID (required for `delete` and `publish`) | No |
| `api_key` | Roblox Open Cloud API Key (required for `publish`) | No |
| `file_path` | Path to `.rbxl` or `.rbxlx` file (required for `publish`) | No |
| `version_type` | Version type: `Published` or `Saved` (default: `Published`) | No |

## Outputs

| Name | Description |
|------|-------------|
| `place_id` | Created place ID (for `create` action) |
| `places` | JSON array of places (for `list` action) |
| `success` | Whether the publish was successful (for `publish` action) |
| `version_number` | Published version number (for `publish` action) |

## Authentication

This action uses the `.ROBLOSECURITY` cookie for authentication. Store it as a GitHub secret.

**Warning**: Keep your `.ROBLOSECURITY` cookie secure. Never expose it in logs or public repositories.
