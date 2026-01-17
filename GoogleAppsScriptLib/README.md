# **RUIAN Address Widget for Google Apps Script**

This library provides a smart autocomplete and validator for Czech addresses using data from RUIAN (Registry of Territorial Identification, Addresses, and Real Estate). It is specifically adapted for the **Google Apps Script (GAS)** environment, ensuring compatibility (Legacy-safe) and efficient data caching to reduce API calls.

## **Key Features**

* **Autocomplete for municipalities, streets, and building/registration numbers.**  
* **Validation:** Verification of address existence and retrieval of accurate ZIP codes (including disambiguation of municipalities with the same name).  
* **Optimization:** Storing the list of municipalities in localStorage (saves API queries).  
* **GAS Safe:** Written using prototypes (instead of ES6 classes), ensuring smooth operation even in older web views.

## **Requirements**

1. **API Key:** An API key is required for operation (the code uses the ruian.fnx.io service).  
2. **Bootstrap (Recommended):** The library generates HTML classes compatible with Bootstrap 4/5 (list-group, badge, is-valid, etc.). If you don't use Bootstrap, you must style the elements yourself (see the CSS section).

## **Implementation in Google Apps Script**

### **1\. Insert Library**

Insert the entire content of the `<script>...</script>` file into your HTML file in the GAS project (e.g., into `index.html` or as a separate file `js-ruian.html` included via include).

### **2\. HTML Structure**

The library requires specific elements in the HTML. **Note:** The element IDs for the autocomplete and status are fixed in the library (ruianSuggestions and ruianStatus).  

```html
<!-- 1. Input field for address -->
<div class="form-group position-relative">
    <label for="addressInput">Address</label>
    <input type="text" class="form-control" id="addressInput" placeholder="Start typing address..." autocomplete="off">
      
    <!-- 2. Container for suggestions (ID must be 'ruianSuggestions') -->
    <div id="ruianSuggestions" class="list-group position-absolute w-100" style="z-index: 1000; display: none;"></div>
</div>

<!-- 3. Status message (ID must be 'ruianStatus') -->
<small id="ruianStatus" class="form-text text-muted"></small>
```

### **3\. Initialization**

Initialize the widget at the end of the `<body>` tag or within the `DOMContentLoaded` event:  

```javascript
<script>
  document.addEventListener('DOMContentLoaded', function() {
        
      var ruianWidget = new RuianAddressWidget({
          // Required: ID of the input field OR the DOM element itself
          fieldString: 'addressInput',   
            
          // Required: Your API Key
          APIKey: 'YOUR_API_KEY',  
            
          // Optional: Cache duration (hours), default: 24
          cachePreservation: 24,

          // Optional: Custom labels for badges
          badgesLabels: {
              municipality: 'Municipality',
              street: 'Street',
              place: 'Number',
              complete: 'Complete'
          }
      });

  });
</script>
```

## **Configuration**

The RuianAddressWidget(config) constructor accepts a configuration object with the following parameters:

| Parameter | Type | Required | Default | Description |
| :---- | :---- | :---- | :---- | :---- |
| fieldString | String / Element | **YES** | - | ID of the input element (e.g., 'myAddress') or a direct reference to the DOM element. |
| APIKey | String | **YES** | - | API key for accessing the RUIAN service. |
| cachePreservation | Number | No | 24 | Number of hours the list of municipalities is kept in the browser's localStorage. |
| cacheReset | Boolean | No | false | If true, cache deletion and reloading is forced upon initialization. |
| badgesLabels | Object | No | {en} | Object for renaming labels in the autocomplete (see example above). |

## **CSS Styling (If not using Bootstrap)**

If your project does not include Bootstrap, insert the following basic CSS into `<style>` to make the autocomplete look presentable:  

```css
/* Suggestions container */
#ruianSuggestions {
    position: absolute;
    width: 100%;
    background: white;
    border: 1px solid #ddd;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
}

/* List item */
.suggestion-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    background: white;
    width: 100%;
    text-align: left;
}

.suggestion-item:hover, .suggestion-item.active {
    background-color: #f8f9fa;
}

/* Badges */
.badge {
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.8em;
    color: white;
}
.bg-primary { background-color: #007bff; } /* Municipality */
.bg-warning { background-color: #ffc107; color: black; } /* Street */
.bg-info { background-color: #17a2b8; } /* Number */
.bg-success { background-color: #28a745; } /* Complete */

/* Validation status */
.is-valid { border-color: #28a745; }
.is-invalid { border-color: #dc3545; }
.text-success { color: #28a745; }
.text-danger { color: #dc3545; }
```

## **Functionality Notes**

* **Autocomplete Logic:** The widget first attempts to identify the municipality. Once a municipality is selected (municipalityId is stored), it starts suggesting streets in that municipality. After selecting a street, it suggests building/orientation numbers.  
* **Cache:** The list of all municipalities in the Czech Republic is downloaded only once and stored in the browser. This significantly speeds up repeated use of the form.  
* **Validation:** If the user enters the entire address at once (copy-paste), the widget attempts to validate it in the background and fill in missing details (e.g., ZIP code).
