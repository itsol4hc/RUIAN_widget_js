
# RUIAN Address Widget

A lightweight, universal JavaScript library for validating and constructing Czech addresses using the [RUIAN API](https://ruian.fnx.io/).

## Features
*   **Smart Address Validation**: Validates addresses directly against the RUIAN registry.
*   **Intelligent Autocomplete**: Suggests Municipalities, Streets, and House Numbers.
*   **Context Awareness**: Automatically detects if you are typing a municipality or street.
*   **ZIP Disambiguation**: Handles municipalities with the same name by showing ZIP codes/Regions.
*   **Caching**: Caches municipality data for faster performance and lower API usage.
*   **Robust Fallback**: Advanced 3-stage fallback mechanism for finding ZIP codes.
*   **Zero Dependencies**: Pure JavaScript, no jQuery or other frameworks needed.

## Installation

### 1. Include the Library
You can use the provided `.js` file or the minified `.min.js` version.

```html
<script src="ruian-widget.min.js"></script>
```

### 2. HTML Structure
Create an input field for the address and a container for suggestions.

```html
<input type="text" id="address-input" placeholder="Start typing address...">
<div id="suggestion-box"></div>
```

### 3. Initialize the Widget
Initialize the widget with your API key and references to the DOM elements.

```javascript
const widget = new RuianAddressWidget({
    inputElement: document.getElementById('address-input'),
    suggestionElement: document.getElementById('suggestion-box'),
    apiKey: 'YOUR_RUIAN_FNX_API_KEY',
    cachePreservation: 24, // Optional: Cache duration in hours (default: 24)
    cacheReset: false,     // Optional: Force reload cache on init (default: false)
    onValidationChange: (isValid, data) => {
        if (isValid) {
            console.log("Valid Address:", data);
        } else {
            console.log("Invalid Address");
        }
    }
});
```

## Configuration Options

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `inputElement` | HTMLElement | **Required** | The input field for address typing. |
| `suggestionElement` | HTMLElement | **Required** | The container (div/ul) where suggestions will appear. |
| `apiKey` | String | **Required** | Your API Key from [ruian.fnx.io](https://ruian.fnx.io/). |
| `onValidationChange` | Function | `null` | Callback function triggered when address validity changes. |
| `cachePreservation` | Number | `24` | How many hours to keep the municipality list in generic `localStorage`. |
| `cacheReset` | Boolean | `false` | If `true`, clears the cache and reloads data on initialization. |

## Callback Data Object
When a valid address is selected, `data.RUIANplace` contains:

```json
{
    "valid": true,
    "municipalityId": 554782,
    "municipalityName": "Praha",
    "streetName": "Vodičkova",
    "cp": "704", // Consolidation number (číslo popisné)
    "co": "36",  // Orientation number (číslo orientační)
    "zip": "11000",
    "id": 21704975,
    "ruianId": 21704975,
    "regionId": "CZ010",
    "regionName": "Hlavní město Praha"
}
```

## License
MIT License.