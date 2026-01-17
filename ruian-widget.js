/**
 * RUIAN Address Widget Library v1.1
 * A universal JavaScript library for validating and constructing Czech addresses
 * using the RUIAN API (https://ruian.fnx.io/).
 * 
 * Features:
 * - Smart address validation
 * - Autocomplete for Municipalities, Streets, and House Numbers
 * - Auto-context detection (e.g., detecting Municipality from text)
 * - Municipality caching with ZIP disambiguation
 * - Detailed callbacks for integration
 * 
 * Author: Gemini (Refactored from original source)
 * License: MIT
 */

class RuianAddressWidget {
    /**
     * @param {Object} config - Configuration object
     * @param {HTMLElement} config.inputElement - The input field for the address
     * @param {HTMLElement} config.suggestionElement - The container for suggestions (ul or div)
     * @param {string} config.apiKey - Your RUIAN FNX API Key
     * @param {Function} [config.onValidationChange] - Callback (isValid, ruianPlaceObject)
     * @param {Function} [config.onLog] - Callback (message, type: 'INFO'|'WARN'|'ERROR'|'SUCCESS')
     * @param {number} [config.cachePreservation=24] - Cache duration in hours
     * @param {boolean} [config.cacheReset=false] - Force cache reload on init
     */
    constructor(config) {
        this.inputElement = config.inputElement;
        this.suggestionBox = config.suggestionElement;
        this.apiKey = config.apiKey;
        this.onValidationChange = config.onValidationChange || function () { };
        this.onLog = config.onLog || console.log;

        // Cache configuration
        this.cachePreservation = config.cachePreservation !== undefined ? config.cachePreservation : 24;
        this.cacheReset = config.cacheReset || false;

        // Internal State
        this.state = {
            municipalityId: null,
            municipalityName: null,
            zip: null,
            streetName: null
        };

        // Municipality cache
        this.allMunicipalities = null;
        this.municipalitiesLoading = false;
        this.zipCache = {};

        this.debounceTimer = null;
        this.suggestionsData = [];
        this.activeIndex = -1;

        // Handle cache reset
        if (this.cacheReset) {
            localStorage.removeItem('ruian_municipalities_cache');
            this.log("Cache reset on init", "INFO");
        }

        this.init();
    }

    /**
     * Updates the API Key dynamically
     * @param {string} key 
     */
    setApiKey(key) {
        this.apiKey = key;
    }

    /**
     * Initialize event listeners
     */
    init() {
        this.log("Initializing RUIAN Widget v1.1...", "INFO");

        // Input event with debounce
        this.inputElement.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            // Reset visual validity state on typing
            this.inputElement.classList.remove('is-valid', 'is-invalid');

            this.debounceTimer = setTimeout(() => {
                this.handleInput(e.target.value);
            }, 400);
        });

        // Keyboard navigation
        this.inputElement.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Close suggestions on outside click
        document.addEventListener('click', (e) => {
            if (e.target !== this.inputElement && !this.suggestionBox.contains(e.target)) {
                this.closeSuggestions();
            }
        });
    }

    /**
     * Format ZIP code to postal format (xxx xx)
     */
    formatZip(zip) {
        if (!zip) return "";
        const s = String(zip).replace(/\s/g, '');
        if (s.length === 5) {
            return `${s.substring(0, 3)} ${s.substring(3)}`;
        }
        return s;
    }

    /**
     * Load municipalities from localStorage cache
     */
    loadMunicipalitiesFromCache() {
        try {
            const cached = localStorage.getItem('ruian_municipalities_cache');
            if (!cached) return null;

            const data = JSON.parse(cached);
            const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);

            if (ageHours > this.cachePreservation) {
                this.log(`Cache expired (${ageHours.toFixed(1)}h > ${this.cachePreservation}h)`, "INFO");
                return null;
            }

            this.log(`Loaded ${data.municipalities.length} municipalities from cache (${ageHours.toFixed(1)}h old)`, "SUCCESS");
            return data.municipalities;
        } catch (e) {
            return null;
        }
    }

    /**
     * Save municipalities to localStorage cache
     */
    saveMunicipalitiesToCache(municipalities) {
        try {
            const data = {
                timestamp: Date.now(),
                municipalities: municipalities
            };
            localStorage.setItem('ruian_municipalities_cache', JSON.stringify(data));
            this.log(`Saved ${municipalities.length} municipalities to cache`, "SUCCESS");
        } catch (e) {
            this.log(`Failed to cache municipalities: ${e.message}`, "WARN");
        }
    }

    /**
     * Load all municipalities from API (with caching)
     */
    async loadAllMunicipalities() {
        if (this.allMunicipalities) {
            return this.allMunicipalities;
        }

        // Check cache first
        const cached = this.loadMunicipalitiesFromCache();
        if (cached) {
            this.allMunicipalities = cached;
            return cached;
        }

        // Prevent parallel loading
        if (this.municipalitiesLoading) {
            while (this.municipalitiesLoading) {
                await new Promise(r => setTimeout(r, 100));
            }
            return this.allMunicipalities || [];
        }

        this.municipalitiesLoading = true;
        this.log("Loading all municipalities from API...", "INFO");

        try {
            const regions = ['CZ010', 'CZ020', 'CZ031', 'CZ032', 'CZ041', 'CZ042', 'CZ051', 'CZ052', 'CZ053', 'CZ063', 'CZ064', 'CZ071', 'CZ072', 'CZ080'];
            const allMunicipalities = [];

            for (const regionId of regions) {
                const url = `https://ruian.fnx.io/api/v1/ruian/build/municipalities?apiKey=${this.apiKey}&regionId=${regionId}`;
                const data = await this.fetchJson(url);
                if (data && data.data) {
                    data.data.forEach(m => {
                        allMunicipalities.push({
                            municipalityId: m.municipalityId,
                            municipalityName: m.municipalityName,
                            regionId: regionId,
                            regionName: this.getRegionName(regionId)
                        });
                    });
                }
            }

            this.allMunicipalities = allMunicipalities;
            this.log(`Loaded ${allMunicipalities.length} municipalities`, "SUCCESS");

            // Save to localStorage cache
            this.saveMunicipalitiesToCache(allMunicipalities);
        } catch (e) {
            this.log(`Error loading municipalities: ${e.message}`, "ERROR");
        }

        this.municipalitiesLoading = false;
        return this.allMunicipalities || [];
    }

    /**
     * Get region name from region ID
     */
    getRegionName(regionId) {
        const regions = {
            'CZ010': 'Hlavní město Praha',
            'CZ020': 'Středočeský kraj',
            'CZ031': 'Jihočeský kraj',
            'CZ032': 'Plzeňský kraj',
            'CZ041': 'Karlovarský kraj',
            'CZ042': 'Ústecký kraj',
            'CZ051': 'Liberecký kraj',
            'CZ052': 'Královéhradecký kraj',
            'CZ053': 'Pardubický kraj',
            'CZ063': 'Kraj Vysočina',
            'CZ064': 'Jihomoravský kraj',
            'CZ071': 'Olomoucký kraj',
            'CZ072': 'Zlínský kraj',
            'CZ080': 'Moravskoslezský kraj'
        };
        return regions[regionId] || regionId;
    }

    /**
     * Fetch ZIP code for a municipality (cached) with robust fallback
     * 1. /validate?cp=1 - works if house #1 exists
     * 2. /places?streetName=- - works for villages without streets
     * 3. /streets → /places - works for municipalities with streets
     */
    async fetchMunicipalityZip(municipalityId) {
        if (this.zipCache[municipalityId]) {
            return this.zipCache[municipalityId];
        }

        let zip = null;

        // Try #1: /validate with cp=1 (fastest)
        try {
            const url = `https://ruian.fnx.io/api/v1/ruian/validate?apiKey=${this.apiKey}&municipalityId=${municipalityId}&cp=1`;
            const data = await this.fetchJson(url);
            if (data && data.place) {
                zip = data.place.zip || data.place.placeZip;
            }
        } catch (e) {
            // Ignore, try fallback
        }

        // Try #2: /places with streetName=- (for villages without streets)
        if (!zip) {
            try {
                const url = `https://ruian.fnx.io/api/v1/ruian/build/places?apiKey=${this.apiKey}&municipalityId=${municipalityId}&streetName=-&limit=1`;
                const data = await this.fetchJson(url);
                if (data && data.data && data.data.length > 0) {
                    zip = data.data[0].placeZip || data.data[0].zip;
                } else if (data && data.length > 0) {
                    zip = data[0].placeZip || data[0].zip;
                }
            } catch (e) {
                // Ignore, try fallback
            }
        }

        // Try #3: Get first street, then get place from that street (for municipalities with streets)
        if (!zip) {
            try {
                const streetsUrl = `https://ruian.fnx.io/api/v1/ruian/build/streets?apiKey=${this.apiKey}&municipalityId=${municipalityId}&limit=1`;
                const streetsData = await this.fetchJson(streetsUrl);
                const streets = streetsData && streetsData.data ? streetsData.data : streetsData;
                if (streets && streets.length > 0) {
                    const streetName = streets[0].streetName;
                    const placesUrl = `https://ruian.fnx.io/api/v1/ruian/build/places?apiKey=${this.apiKey}&municipalityId=${municipalityId}&streetName=${encodeURIComponent(streetName)}&limit=1`;
                    const placesData = await this.fetchJson(placesUrl);
                    const places = placesData && placesData.data ? placesData.data : placesData;
                    if (places && places.length > 0) {
                        zip = places[0].placeZip || places[0].zip;
                    }
                }
            } catch (e) {
                this.log(`Error fetching ZIP for ${municipalityId}: ${e.message}`, "ERROR");
            }
        }

        if (zip) {
            this.zipCache[municipalityId] = zip;
            return zip;
        }
        return null;
    }

    /**
     * Main logic handler for input changes
     */
    async handleInput(value) {
        // If input is empty, clear everything
        if (!value || value.trim().length < 1) {
            this.closeSuggestions();
            this.triggerCallback(null);
            return;
        }

        const parts = value.split(',').map(s => s.trim());
        const currentPartIndex = parts.length - 1;
        const currentText = parts[currentPartIndex];

        // Reset state if user changes the municipality name at the beginning
        if (currentPartIndex === 0 && this.state.municipalityName) {
            const cleanVal = value.toLowerCase();
            const cleanState = this.state.municipalityName.toLowerCase();
            if (!cleanVal.startsWith(cleanState.substring(0, Math.min(cleanVal.length, cleanState.length)))) {
                this.log("Resetting context (Municipality name changed)", "WARN");
                this.resetState();
            }
        }

        // Auto-detect context logic (from RP_RUIAN_demo)
        await this.tryAutoSelectContext(parts);

        let suggestions = [];

        // 1. Full Address Validation Check
        // If length > 5 and contains numbers, likely a full address
        if (value.length > 5 && /\d/.test(value)) {
            const validationResult = await this.apiValidate(value);

            if (validationResult && validationResult.status === 'MATCH') {
                this.log("Address is VALID (MATCH)", "SUCCESS");

                const p = validationResult.place;
                const formattedPlace = this.mapToRuianPlace(p);
                this.triggerCallback(formattedPlace); // Success callback

                // Generate formatted strings for comparison
                const streetPart = p.streetName || p.municipalityPartName || p.municipalityName;
                let numberPart = p.cp || "";
                if (p.co) numberPart += "/" + p.co;
                if (p.ce) numberPart = "ev." + p.ce;

                // Preferred Format: "Street Number, ZIP City"
                const postalLabel = `${streetPart} ${numberPart}, ${this.formatZip(p.zip)} ${p.municipalityName}`;

                // Normalize for comparison
                const normalize = (s) => s.replace(/\s+/g, ' ').trim();
                const vNorm = normalize(value);

                // If input doesn't match preferred format, suggest the fix
                if (vNorm !== normalize(postalLabel)) {
                    suggestions.unshift({
                        type: 'complete',
                        label: postalLabel,
                        value: postalLabel,
                        data: p
                    });
                }

                this.renderSuggestions(suggestions);
                return;
            } else {
                // Invalid or incomplete
                this.triggerCallback(false);
            }
        }

        // 2. Suggestion Builder (if not a perfect match)
        try {
            // A. Municipality Search
            if (!this.state.municipalityId || currentPartIndex === 0) {
                const munSuggestions = await this.searchMunicipality(currentText);
                suggestions = suggestions.concat(munSuggestions);

                // Fallback: If no suggestions found but we have parts, try searching first part
                if (munSuggestions.length === 0 && parts.length > 1 && !this.state.municipalityId) {
                    const fallbackSuggestions = await this.searchMunicipality(parts[0]);
                    if (fallbackSuggestions.length > 0) {
                        suggestions = suggestions.concat(fallbackSuggestions);
                    }
                }
            }
            // B. Street Search
            else if (this.state.municipalityId && !this.isNumber(currentText) && currentPartIndex === 1) {
                this.log(`Searching street in ID ${this.state.municipalityId}: "${currentText}"`, "INFO");
                const streetSuggestions = await this.searchStreet(this.state.municipalityId, currentText);
                suggestions = suggestions.concat(streetSuggestions);

                // If municipality has no streets or empty query, search places (house numbers) directly
                if (streetSuggestions.length === 0 && currentText.trim() === "") {
                    const placeSuggestions = await this.searchPlace(
                        this.state.municipalityId,
                        null,
                        currentText
                    );
                    suggestions = suggestions.concat(placeSuggestions);
                }
            }
            // C. House Number Search
            else if (this.state.municipalityId) {
                const placeSuggestions = await this.searchPlace(
                    this.state.municipalityId,
                    this.state.streetName,
                    currentText
                );
                suggestions = suggestions.concat(placeSuggestions);
            }
        } catch (err) {
            this.log(`Process Error: ${err.message}`, "ERROR");
        }

        this.renderSuggestions(suggestions);
    }

    /**
     * Attempt to set context automatically if user typed commas but didn't click suggestions
     */
    async tryAutoSelectContext(parts) {
        // 1. Auto-select MUNICIPALITY
        if (!this.state.municipalityId && parts.length > 1) {
            const query = parts[0];
            if (query.length > 1) {
                const candidates = await this.searchMunicipality(query);
                const match = candidates.find(c => c.value.toLowerCase() === query.toLowerCase());
                if (match) {
                    this.log(`Auto-selected Municipality: ${match.label}`, "INFO");
                    this.state.municipalityId = match.data.municipalityId;
                    this.state.municipalityName = match.data.municipalityName;
                    this.state.zip = match.data.zip;
                }
            }
        }

        // 2. Auto-select STREET
        if (this.state.municipalityId && !this.state.streetName && parts.length > 2) {
            const query = parts[1];
            if (query.length > 0 && !this.isNumber(query)) {
                const streets = await this.searchStreet(this.state.municipalityId, query);
                const match = streets.find(s => s.value.toLowerCase() === query.toLowerCase());
                if (match) {
                    this.log(`Auto-selected Street: ${match.value}`, "INFO");
                    this.state.streetName = match.value;
                }
            }
        }
    }

    /**
     * Helper: Maps raw API response to the requested RUIANplace structure
     */
    mapToRuianPlace(p) {
        return {
            valid: true,
            municipalityId: p.municipalityId,
            municipalityName: p.municipalityName,
            municipalityPartId: p.municipalityPartId || null,
            municipalityPartName: p.municipalityPartName || null,
            streetName: p.streetName || null,
            ce: p.ce || null,
            cp: p.cp || null,
            co: p.co || null,
            zip: p.zip,
            id: p.id,
            ruianId: p.id, // Usually same as ID in this context
            regionId: p.regionId || null, // Provided if API returns it
            regionName: p.regionName || null,
            originalString: this.inputElement.value
        };
    }

    /**
     * API: Validate Address
     */
    async apiValidate(fullQuery) {
        if (!this.apiKey) {
            this.log("Missing API Key!", "ERROR");
            return null;
        }

        let url = `https://ruian.fnx.io/api/v1/ruian/validate?apiKey=${this.apiKey}`;

        // Regex for "Street Number, ZIP City"
        const reversedFormatMatch = fullQuery.match(/^(.+?)\s+(\d+(?:\/\d+)?[a-zA-Z]?)[,\s]+(\d{3}\s?\d{2})\s+(.+)$/);

        if (reversedFormatMatch) {
            this.log("Format detected: 'Street Number, ZIP City'", "INFO");
            const streetRaw = reversedFormatMatch[1].trim();
            const numberRaw = reversedFormatMatch[2].trim();
            const zipRaw = reversedFormatMatch[3].replace(/\s/g, '');
            const cityRaw = reversedFormatMatch[4].trim();

            let cp = null, co = null;
            this.parseNumber(numberRaw, (p, o) => { cp = p; co = o; });

            url += `&municipalityName=${encodeURIComponent(cityRaw)}`;
            url += `&street=${encodeURIComponent(streetRaw)}`;
            url += `&zip=${zipRaw}`;
            if (cp) url += `&cp=${cp}`;
            if (co) url += `&co=${co}`;

            return this.fetchJson(url);
        }

        // Standard parsing fallback
        let munName = this.state.municipalityName;
        let streetName = this.state.streetName;
        let cp = null, co = null, zip = null;

        let cleanQuery = fullQuery;
        const zipMatch = fullQuery.match(/\b\d{3}\s?\d{2}\b/);
        if (zipMatch) {
            zip = zipMatch[0].replace(/\s/g, '');
            cleanQuery = cleanQuery.replace(zipMatch[0], '');
        } else if (this.state.zip) {
            zip = this.state.zip;
        }

        const rawParts = cleanQuery.split(/[,]+/).map(s => s.trim()).filter(s => s.length > 0);
        let numberFound = false;

        for (let i = 0; i < rawParts.length; i++) {
            const part = rawParts[i];
            const numberMatch = part.match(/(\d+(?:\/\d+)?[a-zA-Z]?)$/);

            if (numberMatch) {
                const extractedNumber = numberMatch[1];
                const textBeforeNumber = part.substring(0, part.length - extractedNumber.length).trim();

                if (textBeforeNumber.length === 0 || textBeforeNumber.length > 2) {
                    if (textBeforeNumber.length > 2 && !streetName) streetName = textBeforeNumber;
                    this.parseNumber(extractedNumber, (p, o) => { cp = p; co = o; });
                    numberFound = true;
                    rawParts[i] = null;
                }
                if (numberFound) break;
            }
        }

        const remainingParts = rawParts.filter(p => p !== null);

        if (!munName && remainingParts.length > 0) {
            if (remainingParts.length >= 2) {
                if (!streetName) streetName = remainingParts[0];
                munName = remainingParts[remainingParts.length - 1];
            } else if (remainingParts.length === 1) {
                if (streetName) {
                    munName = remainingParts[0];
                } else {
                    if (this.state.municipalityId) streetName = remainingParts[0];
                    else munName = remainingParts[0];
                }
            }
        }

        if (!streetName && this.state.streetName) streetName = this.state.streetName;
        if (!munName && this.state.municipalityName) munName = this.state.municipalityName;

        if (munName) url += `&municipalityName=${encodeURIComponent(munName)}`;
        if (streetName) url += `&street=${encodeURIComponent(streetName)}`;
        if (cp) url += `&cp=${cp}`;
        if (co) url += `&co=${co}`;
        if (zip) url += `&zip=${zip}`;

        return this.fetchJson(url);
    }

    /**
     * Helper to parse house numbers (CP/CO)
     */
    parseNumber(numStr, callback) {
        const nums = numStr.split('/');
        const cpRaw = nums[0].replace(/\D/g, '');
        if (cpRaw) callback(cpRaw, null);
        if (nums[1]) {
            const coRaw = nums[1].replace(/\D/g, '');
            if (coRaw) callback(cpRaw, coRaw);
        }
    }

    /**
     * API: Search Municipality - uses cached municipalities with ZIP disambiguation
     */
    async searchMunicipality(query) {
        if (/^\d/.test(query) || query.length < 2 || !this.apiKey) return [];

        const municipalities = await this.loadAllMunicipalities();
        const normalized = query.toLowerCase().trim();

        // Filter matches
        const matches = municipalities.filter(m => {
            const name = m.municipalityName.toLowerCase();
            return name.includes(normalized);
        });

        // Sort: exact matches first, then by name length (shorter first), then alphabetically
        matches.sort((a, b) => {
            const aExact = a.municipalityName.toLowerCase() === normalized;
            const bExact = b.municipalityName.toLowerCase() === normalized;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            const aStarts = a.municipalityName.toLowerCase().startsWith(normalized);
            const bStarts = b.municipalityName.toLowerCase().startsWith(normalized);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            if (a.municipalityName.length !== b.municipalityName.length) {
                return a.municipalityName.length - b.municipalityName.length;
            }
            return a.municipalityName.localeCompare(b.municipalityName);
        });

        // Identify duplicates: same name + same region = need ZIP to distinguish
        const nameRegionGroups = {};
        matches.forEach(m => {
            const key = m.municipalityName.toLowerCase() + '|' + m.regionId;
            nameRegionGroups[key] = (nameRegionGroups[key] || 0) + 1;
        });

        // Check if there are multiple municipalities with the same name (across all regions)
        const nameGroups = {};
        matches.forEach(m => {
            const name = m.municipalityName.toLowerCase();
            nameGroups[name] = (nameGroups[name] || 0) + 1;
        });

        // Get top 15 matches
        const topMatches = matches.slice(0, 15);

        // Fetch ZIP codes for duplicates in same region (concurrently)
        const zipPromises = topMatches.map(async m => {
            const key = m.municipalityName.toLowerCase() + '|' + m.regionId;
            const needsZip = nameRegionGroups[key] > 1;
            if (needsZip) {
                return await this.fetchMunicipalityZip(m.municipalityId);
            }
            return null;
        });
        const zips = await Promise.all(zipPromises);

        return topMatches.map((m, i) => {
            const hasDuplicates = nameGroups[m.municipalityName.toLowerCase()] > 1;
            const key = m.municipalityName.toLowerCase() + '|' + m.regionId;
            const sameRegionDuplicates = nameRegionGroups[key] > 1;
            const zip = zips[i];

            // Build label based on duplication level
            let label;
            const formattedZip = this.formatZip(zip);
            if (sameRegionDuplicates && formattedZip) {
                // Same name + same region = show ZIP + region
                label = `${m.municipalityName}, ${formattedZip} (${m.regionName})`;
            } else if (hasDuplicates) {
                // Same name in different regions = show region only
                label = `${m.municipalityName} (${m.regionName})`;
            } else {
                // Unique name = show name only
                label = m.municipalityName;
            }

            return {
                type: 'municipality',
                label: label,
                value: m.municipalityName,
                data: {
                    municipalityId: m.municipalityId,
                    municipalityName: m.municipalityName,
                    regionId: m.regionId,
                    regionName: m.regionName,
                    zip: zip
                }
            };
        });
    }

    /**
     * API: Search Street
     */
    async searchStreet(municipalityId, query) {
        if (!this.apiKey) return [];
        const url = `https://ruian.fnx.io/api/v1/ruian/build/streets?apiKey=${this.apiKey}&municipalityId=${municipalityId}`;
        const json = await this.fetchJson(url);

        if (!json || !json.data) return [];

        const normalized = query.toLowerCase();
        const filtered = json.data.filter(s => {
            const name = s.streetName || s.streetLessPartName;
            return name && name.toLowerCase().includes(normalized);
        });

        return filtered.slice(0, 10).map(s => ({
            type: 'street',
            label: s.streetName || s.streetLessPartName,
            value: s.streetName || s.streetLessPartName,
            data: s
        }));
    }

    /**
     * API: Search Place (House Numbers)
     */
    async searchPlace(municipalityId, streetName, query) {
        if (!this.apiKey) return [];
        let url = `https://ruian.fnx.io/api/v1/ruian/build/places?apiKey=${this.apiKey}&municipalityId=${municipalityId}`;
        if (streetName) {
            url += `&streetName=${encodeURIComponent(streetName)}`;
        }

        const json = await this.fetchJson(url);
        if (!json || !json.data) return [];

        const normalized = query.toLowerCase().trim();

        const candidates = json.data.map(p => {
            let label = "";
            if (p.placeCp) label += p.placeCp;
            if (p.placeCo) label += "/" + p.placeCo;
            if (p.placeCe) label = "ev." + p.placeCe;

            return {
                type: 'place', // Represents a specific number
                label: label,
                value: label,
                data: p
            };
        });

        const filtered = candidates.filter(c => {
            if (!normalized) return true;
            if (c.label.toLowerCase().startsWith(normalized)) return true;
            const co = c.data.placeCo ? String(c.data.placeCo).toLowerCase() : "";
            if (co.startsWith(normalized)) return true;
            const cp = c.data.placeCp ? String(c.data.placeCp).toLowerCase() : "";
            if (cp.startsWith(normalized)) return true;
            return false;
        });

        return filtered.slice(0, 10);
    }

    async fetchJson(url) {
        const safeUrl = url.replace(this.apiKey, '***');
        this.log(`GET ${safeUrl}`, "INFO");

        try {
            const res = await fetch(url);
            if (!res.ok) {
                this.log(`HTTP Error: ${res.status} ${res.statusText}`, "ERROR");
                return null;
            }
            const data = await res.json();

            // Log truncated response
            let logMsg = JSON.stringify(data);
            if (logMsg.length > 200) logMsg = logMsg.substring(0, 200) + "...";
            this.log(`Response: ${logMsg}`, "INFO");

            return data;
        } catch (e) {
            this.log(`Network Error: ${e.message}`, "ERROR");
            return null;
        }
    }

    // --- UI Methods ---

    renderSuggestions(list) {
        this.suggestionBox.innerHTML = '';
        this.suggestionsData = list;

        // Auto-focus first element if it is a "complete" suggestion (fix proposal)
        this.activeIndex = (list.length > 0 && list[0].type === 'complete') ? 0 : -1;

        if (!list || list.length === 0) {
            this.closeSuggestions();
            return;
        }

        list.forEach((item, index) => {
            const btn = document.createElement('button');
            // Assuming Bootstrap classes, but works with generic CSS too
            btn.className = 'list-group-item list-group-item-action suggestion-item d-flex align-items-center justify-content-between';

            if (index === this.activeIndex) {
                btn.classList.add('active');
            }

            let badgeClass = 'bg-secondary';
            if (item.type === 'municipality') badgeClass = 'bg-primary';
            if (item.type === 'street') badgeClass = 'bg-warning text-dark';
            if (item.type === 'place') badgeClass = 'bg-info text-dark';
            if (item.type === 'complete') {
                badgeClass = 'bg-success';
                btn.classList.add('suggestion-complete');
            }

            btn.innerHTML = `
                <span>${item.label}</span>
                <span class="badge ${badgeClass} badge-type">${item.type}</span>
            `;

            // Prevent form submission on click
            btn.onclick = (e) => {
                e.preventDefault();
                this.selectSuggestion(index);
            };

            this.suggestionBox.appendChild(btn);
        });

        this.suggestionBox.style.display = 'block';
    }

    selectSuggestion(index) {
        const item = this.suggestionsData[index];
        if (!item) return;

        this.log(`Selected: ${item.type} - ${item.label}`, "SUCCESS");

        if (item.type === 'complete') {
            this.inputElement.value = item.value;
            // Complete fill
            const p = this.mapToRuianPlace(item.data);
            this.triggerCallback(p);

            this.state.municipalityId = item.data.municipalityId;
            this.state.municipalityName = item.data.municipalityName;
            this.state.zip = item.data.zip;
            this.state.streetName = item.data.streetName || null;

            this.closeSuggestions();
        }
        else if (item.type === 'municipality') {
            this.state.municipalityId = item.data.municipalityId;
            this.state.municipalityName = item.data.municipalityName;
            this.state.zip = item.data.zip;
            this.state.streetName = null;

            this.inputElement.value = `${item.data.municipalityName}, `;
            this.handleInput(this.inputElement.value); // Trigger next level search
            this.inputElement.focus();
        }
        else if (item.type === 'street') {
            this.state.streetName = item.value;
            this.inputElement.value = `${this.state.municipalityName}, ${item.value}, `;
            this.handleInput(this.inputElement.value);
            this.inputElement.focus();
        }
        else if (item.type === 'place') {
            let prefix = `${this.state.municipalityName}, `;
            if (this.state.streetName) prefix += `${this.state.streetName}, `;
            const zip = item.data.placeZip || this.state.zip;

            this.inputElement.value = `${prefix}${item.value}, ${this.formatZip(zip)}`;
            this.handleInput(this.inputElement.value); // Validate final
            this.inputElement.focus();
        }
    }

    closeSuggestions() {
        if (this.suggestionBox) this.suggestionBox.style.display = 'none';
        this.activeIndex = -1;
    }

    handleKeydown(e) {
        if (!this.suggestionBox || this.suggestionBox.style.display === 'none') return;
        const items = this.suggestionBox.querySelectorAll('.suggestion-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.activeIndex = (this.activeIndex + 1) % items.length;
            this.highlightItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.activeIndex = (this.activeIndex - 1 + items.length) % items.length;
            this.highlightItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.activeIndex > -1) this.selectSuggestion(this.activeIndex);
        } else if (e.key === 'Escape') {
            this.closeSuggestions();
        }
    }

    highlightItem(items) {
        items.forEach(i => i.classList.remove('active'));
        if (items[this.activeIndex]) {
            items[this.activeIndex].classList.add('active');
            items[this.activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    isNumber(str) {
        return /^\d/.test(str.trim());
    }

    resetState() {
        this.state = {
            municipalityId: null,
            municipalityName: null,
            zip: null,
            streetName: null
        };
    }

    triggerCallback(data) {
        if (data === false) {
            this.inputElement.classList.add('is-invalid');
            this.inputElement.classList.remove('is-valid');
            this.onValidationChange(false, null);
        } else if (data === null) {
            this.inputElement.classList.remove('is-valid', 'is-invalid');
            this.onValidationChange(null, null);
        } else {
            this.inputElement.classList.remove('is-invalid');
            this.inputElement.classList.add('is-valid');
            this.onValidationChange(true, { RUIANplace: data });
        }
    }

    log(msg, type) {
        this.onLog(msg, type);
    }
}