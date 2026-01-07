# RUIAN Address Widget

**Universal JavaScript library for validation, autocomplete, and construction of Czech addresses using the RUIAN API.**

This library provides a "smart" input field that guides the user through entering an address (Municipality -> Street -> Number) or automatically validates the entire address if pasted at once (e.g. via copy-paste). The output is a standardized `RUIANplace` object.

## 🚀 Features

* **Intelligent Autocomplete:** Progressive search for Municipality, Street, and Descriptive/Orientation Number.
* **Smart Paste:** Validates entire addresses entered at once (e.g. "Dlouhá 12, Praha").
* **Automatic Context Detection:** Recognizes the municipality name in the text and switches the autocomplete to streets in that municipality.
* **Standardized Output:** Returns RUIAN ID, municipality codes, ZIP codes, and parsed address parts.
* **Prefers Postal Format:** Teaches users the format `Street Number, ZIP Municipality`, but accepts other variants.
* **Independence:** Pure JavaScript (ES6 class), no dependencies (jQuery is not needed).

## 📦 Installation

Download the file `ruian-widget.js` (or the minified version) and include it in your project.

```html
<script src="path/to/ruian-widget.min.js"></script>
```

## 🛠 Usage

### 1. HTML Structure
Create an input field for the address and a container (e.g. `div`) for displaying suggestions.

```html
<div class="address-container">
    <label for="address-input">Address:</label>
    <input type="text" id="address-input" class="form-control" placeholder="Start typing address..." autocomplete="off">
    
    <!-- Container for autocomplete suggestions (must be below input) -->
    <div id="suggestion-box" class="list-group"></div>
</div>
```

### 2. Initialization (JavaScript)
Initialize the widget with your API key and reference to DOM elements.

```javascript
document.addEventListener('DOMContentLoaded', () => {
    
    const widget = new RuianAddressWidget({
        // [Required] Input element for typing
        inputElement: document.getElementById('address-input'),
        
        // [Required] Element where suggestion buttons will be generated
        suggestionElement: document.getElementById('suggestion-box'),
        
        // [Required] Your API key (get it at [https://ruian.fnx.io/](https://ruian.fnx.io/))
        apiKey: "YOUR_API_KEY",
        
        // [Optional] Callback on validation state change
        onValidationChange: (isValid, data) => {
            if (isValid) {
                // Address is valid, data contains the RUIANplace object
                console.log("Valid address:", data.RUIANplace);
            } else if (isValid === false) {
                // Address is invalid
                console.log("Invalid or incomplete address.");
            } else {
                // Input is empty or reset
                console.log("No input.");
            }
        },

        // [Optional] Callback for logging (default: console.log)
        onLog: (msg, type) => console.log(`[${type}] ${msg}`)
    });

});
```

## ⚙️ Configuration

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `inputElement` | `HTMLElement` | Input text field (`<input>`). |
| `suggestionElement` | `HTMLElement` | Container for autocomplete suggestions (`<div>` or `<ul>`). |
| `apiKey` | `String` | API key for the ruian.fnx.io service. |
| `onValidationChange` | `Function` | Function called when address validity changes. Returns `(isValid, data)`. |
| `onLog` | `Function` | Function for debugging. Returns `(message, type)`. |

---

## 📤 Output Object (RUIANplace)

If the address is valid, the callback `onValidationChange` returns data in the structure `{ RUIANplace: { ... } }`.

**Example Object:**
```json
{
    "RUIANplace": {
        "valid": true,
        "municipalityId": 554782,         // Municipality Code (RUIAN)
        "municipalityName": "Praha",      // Municipality Name
        "municipalityPartId": 400495,     // Municipality Part Code (if exists)
        "municipalityPartName": "Nové Město", // Municipality Part Name
        "streetName": "Václavské náměstí", // Street Name
        "ce": null,                       // Registration Number (evidenční)
        "cp": 812,                        // House Number (popisné) - String or Number
        "co": 59,                         // Orientation Number (orientační)
        "zip": 11000,                     // ZIP Code (without spaces, Number)
        "id": 21706028,                   // Unique Address Point ID (ADM)
        "ruianId": 21706028,              // ID in RUIAN (usually same as id)
        "regionId": "CZ010",              // Region Code (VÚSC)
        "regionName": "Hlavní město Praha", // Region Name
        "originalString": "Václavské náměstí 812/59, 110 00 Praha" // Text in input
    }
}
```

## 🎨 Styling

The library generates HTML elements that are suitable to style. The widget is designed to work with **Bootstrap 5**, but custom CSS can be used.

### Option A: Bootstrap 5
If you use Bootstrap, elements are styled automatically because the library uses classes like `list-group-item`, `badge`, `bg-primary` etc.

Only add style for positioning the suggestion box:

```css
#suggestion-box {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
    background: white;
    border: 1px solid #ddd;
    display: none; /* Library manages this itself, but just to be safe */
}
```

### Option B: Custom CSS
If you don't use a framework, add these basic styles for proper display:

```css
.suggestion-item {
    padding: 10px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.suggestion-item:hover, .suggestion-item.active {
    background-color: #f0f0f0;
}
.suggestion-complete {
    border-left: 4px solid green;
    background-color: #e8f5e9;
}
.badge-type {
    font-size: 0.8em;
    padding: 2px 6px;
    border-radius: 4px;
    color: white;
    background-color: #666;
    margin-left: 10px;
}
/* Colors for item types */
.badge-type:contains("municipality") { background-color: #0d6efd; } /* Municipality - Blue */
.badge-type:contains("street") { background-color: #ffc107; color: black; } /* Street - Yellow */
.badge-type:contains("place") { background-color: #0dcaf0; color: black; } /* Number - Cyan */
.badge-type:contains("complete") { background-color: #198754; } /* Complete - Green */
```

## 🔐 Getting an API Key

This library communicates with the API provided by the service **FNX.io**.
To get a key visit: **[https://ruian.fnx.io/](https://ruian.fnx.io/)**

## 📄 Instance Methods

After creating an instance `const widget = new RuianAddressWidget(...)` you can call:

* `widget.setApiKey(newKey)` - Changes API key at runtime.
* `widget.resetState()` - Clears internal memory (remembered municipality/street).

## License

MIT License. Free for commercial and non-commercial use.
