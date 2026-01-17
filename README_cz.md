
# RUIAN Widget pro Validaci Adres

Lehká, univerzální JavaScriptová knihovna pro validaci a zadávání českých adres pomocí [RUIAN API](https://ruian.fnx.io/).

## Funkce
*   **Chytrá validace adres**: Ověřuje adresy přímo proti registru RUIAN.
*   **Inteligentní našeptávač**: Nabízí obce, ulice a čísla popisná/orientační.
*   **Rozpoznání kontextu**: Automaticky detekuje, zda píšete obec, ulici nebo celé zadání.
*   **Rozlišení obcí (Disambiguation)**: U obcí se stejným názvem zobrazuje PSČ a kraj pro rozlišení.
*   **Cachování**: Ukládá seznam obcí do mezipaměti prohlížeče pro rychlejší načítání.
*   **Robustní dohledání PSČ**: Pokročilý 3-stupňový mechanismus pro nalezení správného PSČ obce.
*   **Žádné závislosti**: Čistý JavaScript, nepotřebuje jQuery ani jiné frameworky.

## Instalace

### 1. Vložení knihovny
Můžete použít soubor `.js` nebo minifikovanou verzi `.min.js`.

```html
<script src="ruian-widget.min.js"></script>
```

### 2. HTML Struktura
Vytvořte vstupní pole pro adresu a kontejner pro návrhy.

```html
<input type="text" id="address-input" placeholder="Začněte psát adresu...">
<div id="suggestion-box"></div>
```

### 3. Inicializace Widgetu
Inicializujte widget s vaším API klíčem a odkazy na DOM elementy.

```javascript
const widget = new RuianAddressWidget({
    inputElement: document.getElementById('address-input'),
    suggestionElement: document.getElementById('suggestion-box'),
    apiKey: 'VÁŠ_RUIAN_FNX_API_KLÍČ',
    cachePreservation: 24, // Volitelné: Doba uložení cache v hodinách (výchozí: 24)
    cacheReset: false,     // Volitelné: Vynutit vymazání cache při startu (výchozí: false)
    onValidationChange: (isValid, data) => {
        if (isValid) {
            console.log("Platná adresa:", data);
        } else {
            console.log("Neplatná adresa");
        }
    }
});
```

## Konfigurační Možnosti

| Parametr | Typ | Výchozí | Popis |
| :--- | :--- | :--- | :--- |
| `inputElement` | HTMLElement | **Povinné** | Vstupní pole pro psaní adresy. |
| `suggestionElement` | HTMLElement | **Povinné** | Kontejner (div/ul), kde se budou zobrazovat návrhy. |
| `apiKey` | String | **Povinné** | Váš API klíč z [ruian.fnx.io](https://ruian.fnx.io/). |
| `badgesLabels` | Object | **Povinné** | Popis částí adresy -  badgesLabels: { municipality: 'obec', street: 'ulice', place: 'číslo', complete: 'kompletní' },|
| `onValidationChange` | Function | `null` | Funkce volaná při změně platnosti adresy. |
| `cachePreservation` | Number | `24` | Kolik hodin udržovat seznam obcí v `localStorage`. |
| `cacheReset` | Boolean | `false` | Pokud je `true`, vymaže cache a znovu načte data při inicializaci. |

## Objekt Data (Callback)
Při výběru platné adresy obsahuje objekt `data.RUIANplace`:

```json
{
    "valid": true,
    "municipalityId": 554782,
    "municipalityName": "Praha",
    "streetName": "Vodičkova",
    "cp": "704", // Číslo popisné
    "co": "36",  // Číslo orientační
    "zip": "11000",
    "id": 21704975,
    "ruianId": 21704975,
    "regionId": "CZ010",
    "regionName": "Hlavní město Praha"
}
```

## Licence
MIT License.