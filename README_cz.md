# RUIAN Address Widget

**Univerzální JavaScript knihovna pro validaci, našeptávání a konstrukci českých adres pomocí RUIAN API.**

Tato knihovna poskytuje "smart" input pole, které uživatele provede zadáním adresy (Obec -> Ulice -> Číslo), nebo automaticky validuje celou adresu, pokud je vložena najednou (např. přes copy-paste). Výstupem je standardizovaný objekt `RUIANplace`.

## 🚀 Funkce

* **Inteligentní našeptávač:** Postupné dohledávání Obce, Ulice a Čísla popisného/orientačního.
* **Smart Paste:** Validuje celé adresy vložené najednou (např. "Dlouhá 12, Praha").
* **Automatická detekce kontextu:** Rozpozná název obce v textu a přepne našeptávač na ulice v dané obci.
* **Standardizovaný výstup:** Vrací RUIAN ID, kódy obcí, PSČ a rozparsované části adresy.
* **Preferuje poštovní formát:** Učí uživatele formát `Ulice Číslo, PSČ Obec`, ale akceptuje i jiné varianty.
* **Nezávislost:** Čistý JavaScript (ES6 class), žádné závislosti (jQuery není potřeba).

## 📦 Instalace

Stáhněte si soubor `ruian-widget.js` (nebo minifikovanou verzi) a vložte jej do svého projektu.

```html
<script src="path/to/ruian-widget.min.js"></script>
```

## 🛠 Použití

### 1. HTML Struktura
Vytvořte input pole pro adresu a kontejner (např. `div`) pro zobrazování návrhů.

```html
<div class="address-container">
    <label for="address-input">Adresa:</label>
    <input type="text" id="address-input" class="form-control" placeholder="Začněte psát adresu..." autocomplete="off">
    
    <!-- Kontejner pro našeptávač (musí být pod inputem) -->
    <div id="suggestion-box" class="list-group"></div>
</div>
```

### 2. Inicializace (JavaScript)
Inicializujte widget s vaším API klíčem a odkazem na DOM elementy.

```javascript
document.addEventListener('DOMContentLoaded', () => {
    
    const widget = new RuianAddressWidget({
        // [Povinné] Input element pro psaní
        inputElement: document.getElementById('address-input'),
        
        // [Povinné] Element, do kterého se budou generovat tlačítka našeptávače
        suggestionElement: document.getElementById('suggestion-box'),
        
        // [Povinné] Váš API klíč (získejte na [https://ruian.fnx.io/](https://ruian.fnx.io/))
        apiKey: "VÁŠ_API_KLÍČ",
        
        // [Volitelné] Callback při změně stavu validace
        onValidationChange: (isValid, data) => {
            if (isValid) {
                // Adresa je validní, data obsahují objekt RUIANplace
                console.log("Validní adresa:", data.RUIANplace);
            } else if (isValid === false) {
                // Adresa je nevalidní
                console.log("Nevalidní nebo neúplná adresa.");
            } else {
                // Input je prázdný nebo resetovaný
                console.log("Žádný vstup.");
            }
        },

        // [Volitelné] Callback pro logování (default: console.log)
        onLog: (msg, type) => console.log(`[${type}] ${msg}`)
    });

});
```

## ⚙️ Konfigurace

| Parametr | Typ | Popis |
| :--- | :--- | :--- |
| `inputElement` | `HTMLElement` | Vstupní textové pole (`<input>`). |
| `suggestionElement` | `HTMLElement` | Kontejner pro našeptávač (`<div>` nebo `<ul>`). |
| `apiKey` | `String` | API klíč pro službu ruian.fnx.io. |
| `onValidationChange` | `Function` | Funkce volaná při změně validity adresy. Vrací `(isValid, data)`. |
| `onLog` | `Function` | Funkce pro debugování. Vrací `(message, type)`. |

---

## 📤 Výstupní objekt (RUIANplace)

Pokud je adresa validní, callback `onValidationChange` vrátí data ve struktuře `{ RUIANplace: { ... } }`.

**Příklad objektu:**
```json
{
    "RUIANplace": {
        "valid": true,
        "municipalityId": 554782,         // Kód obce (RUIAN)
        "municipalityName": "Praha",      // Název obce
        "municipalityPartId": 400495,     // Kód části obce (pokud existuje)
        "municipalityPartName": "Nové Město", // Název části obce
        "streetName": "Václavské náměstí", // Název ulice
        "ce": null,                       // Číslo evidenční (pokud je)
        "cp": 812,                        // Číslo popisné (String nebo Number)
        "co": 59,                         // Číslo orientační (pokud je)
        "zip": 11000,                     // PSČ (bez mezer, Number)
        "id": 21706028,                   // Unikátní ID adresního místa (ADM)
        "ruianId": 21706028,              // ID v RUIAN (zpravidla shodné s id)
        "regionId": "CZ010",              // Kód kraje (VÚSC)
        "regionName": "Hlavní město Praha", // Název kraje
        "originalString": "Václavské náměstí 812/59, 110 00 Praha" // Text v inputu
    }
}
```

## 🎨 Stylování

Knihovna generuje HTML prvky, které je vhodné nastylovat. Widget je navržen tak, aby fungoval s **Bootstrap 5**, ale lze použít i vlastní CSS.

### Varianta A: Bootstrap 5
Pokud používáte Bootstrap, prvky se nastylují automaticky, protože knihovna používá třídy jako `list-group-item`, `badge`, `bg-primary` atd.

Pouze přidejte styl pro pozicování našeptávače:

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
    display: none; /* Knihovna si toto řídí sama, ale pro jistotu */
}
```

### Varianta B: Vlastní CSS
Pokud nepoužíváte framework, přidejte tyto základní styly pro správné zobrazení:

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
/* Barvy pro typy položek */
.badge-type:contains("municipality") { background-color: #0d6efd; } /* Obec - Modrá */
.badge-type:contains("street") { background-color: #ffc107; color: black; } /* Ulice - Žlutá */
.badge-type:contains("place") { background-color: #0dcaf0; color: black; } /* Číslo - Azurová */
.badge-type:contains("complete") { background-color: #198754; } /* Komplet - Zelená */
```

## 🔐 Získání API Klíče

Tato knihovna komunikuje s API poskytovaným službou **FNX.io**.
Pro získání klíče navštivte: **[https://ruian.fnx.io/](https://ruian.fnx.io/)**

## 📄 Metody instance

Po vytvoření instance `const widget = new RuianAddressWidget(...)` můžete volat:

* `widget.setApiKey(newKey)` - Změní API klíč za běhu.
* `widget.resetState()` - Vymaže interní paměť (zapamatovanou obec/ulici).

## Licence

MIT License. Volně šiřitelné pro komerční i nekomerční použití.