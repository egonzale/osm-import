const BigXml = require('big-xml-streamer');
const FileSystem = require('fs');
const Js2XmlParser = require('js2xmlparser');
const PQueue = require('p-queue');
const BuildUrl = require('build-url');
const queryUrl = "http://api.digitransit.fi/geocoding/v1/search";
const got = require('got');
const commandLineArgs = require('command-line-args');
const nodeCleanup = require('node-cleanup');

const optionDefinitions = [{ name: 'city', type: String, multiple: false, defaultOption: false }];

const cmdOptions = commandLineArgs(optionDefinitions); 
console.dir(cmdOptions);

let recordCount = 0;
let geocodingResultCount = 0;
let geocodingErrorCount = 0;

let file = FileSystem.createWriteStream('./output/output.osm');
let errorLog = FileSystem.createWriteStream('./output/failed.json');
file.write("<?xml version='1.0' encoding='UTF-8'?>\n");
file.write("<osm version='0.6' generator='JOSM'>\n");
errorLog.write("{\n");
let prepend = "";

// Cleanup routine
nodeCleanup((exitCode, signal) => {
    file.write('</osm>\n');
    errorLog.write("\n}");

    console.log("RECORD COUNT: " + recordCount);
    console.log("RESULT COUNT: " + geocodingResultCount);
    console.log("ERROR COUNT: " + geocodingErrorCount);
}, {
    ctrl_C: "{^C}",
    uncaughtException: "Uh oh. Look what happened:"
});

let reader = BigXml.createReader('./input/sote.xml', 'termitementry', { gzip: false });

const MAX_CONCURRENT = 10;
const MAX_QUEUED = 50;
const CONFIDENCE_LIMIT = 0.6;

let requestQueue = new PQueue({ concurrency: MAX_CONCURRENT });

let checkIfCitySetAndMatch = (city) => {
    let returnValue = true;

    if (cmdOptions && cmdOptions.city) {
        if (cmdOptions.city.toUpperCase() !== city.toUpperCase()) {
            returnValue = false;
        }
    }

    return returnValue;
}

let getStreetFromAddress = (address) => {
    let match = address.match(/\d+\.?\d*/);
    let returnString = address;
    if (match) {
        let index = address.indexOf(match);
        returnString = address.slice(0, index).trim();
    }
    return returnString;
}

let getNumberFromAddress = (address) => {
    let street = getStreetFromAddress(address);
    let returnString = address.substring(street.length).trim();
    return returnString;
}

let logError = (error, item) => {
    console.log("ERROR: " + error);
    geocodingErrorCount++;
    errorLog.write(prepend + JSON.stringify(item, null, 2));
    if (!prepend) {
        prepend = ",";
    }
}

let validAddress = (addressString) => {
    // Check if this is a post office box address
    let returnValue = false;
    if (addressString && addressString.length > 0) {
        let testString = addressString.trim();
        const index = testString.indexOf("PL");
        if (index == -1 || (index > 0 && testString.charAt(index-1) !== ',')) {
            returnValue = true;
        }
    } else {
        console.dir(addressString);
    }
    return returnValue;
}

reader.on('record', function(record) {
    recordCount++;

    let children = record.children;
    let jsItem = {
        oid: "",
        address: "",
        postNumber: "",
        postOffice: "",
        shortName: "",
        name: "",
        streetAddress: "",
        houseNumber: "",
        country: "",
        phone: "",
        timestamp: new Date(),
        isSocialServiceProvider: false,
        isSocialCareFacility: false,
        isHealthServiceProvider: false,
        isHealthCareFacility: false
    }; // item placeholder

    // Get modification date
    if (record.attrs) {
        if (record.attrs.lastmodifieddate) {
            jsItem.timestamp = record.attrs.lastmodifieddate;
        }
        if (record.attrs.id) {
            jsItem.oid = record.attrs.id;
        }
    }

    if (children) {
        for (let i = 0; i < children.length; i++) {
            let item = children[i];

            if (item.hasOwnProperty("attrs") && item.hasOwnProperty("text")) {
                let attrs = item.attrs;
                jsItem.country = "FI"; // Hardcoded to Finland

                if (attrs.type === "abbreviation") {
                    jsItem.shortName = item.text;
                }
                if (attrs.type === "longname") {
                    jsItem.name = item.text;
                }
                if (attrs.type === "officestreetaddress") {
                    jsItem.streetAddress = getStreetFromAddress(item.text);
                    jsItem.houseNumber = getNumberFromAddress(item.text);
                }
                if (attrs.type === "officepostaddress") {
                    jsItem.address = item.text;
                }
                if (attrs.type === "officetelephone") {
                    jsItem.phone = item.text;
                }
                if (attrs.type === "postnumber") {
                    jsItem.postNumber = item.text;
                }
                if (attrs.type === "postoffice") {
                    jsItem.postOffice = item.text.charAt(0).toUpperCase() + item.text.slice(1).toLowerCase();
                }
                if (attrs.type === "Terv.palveluyksikkö" && item.text === "T") {
                    jsItem.isHealthServiceProvider = true;
                }
                if (attrs.type === "Sos.palveluyksikkö" && item.text === "T") {
                    jsItem.isSocialServiceProvider = true;
                }
                if (attrs.type === "Terv.toimintayksikkö" && item.text === "T") {
                    jsItem.isHealthCareFacility = true;
                }
                if (attrs.type === "Sos.toimintayksikkö" && item.text === "T") {
                    jsItem.isSocialServiceProvider = true;
                }
            }
        }

        if (!checkIfCitySetAndMatch(jsItem.postOffice)) return;

        if (!validAddress(jsItem.streetAddress)) {
            logError("Invalid address: " + jsItem.streetAddress, jsItem);
            return;
        }

        let addressString = jsItem.streetAddress + " " + jsItem.houseNumber + "," + jsItem.postNumber + " " + jsItem.postOffice;
        let encodedAddress = encodeURIComponent(addressString);

        let url = BuildUrl(queryUrl, {
            queryParams: {
                size: '1',
                text: encodedAddress
            }
        });

        if (requestQueue.size >= MAX_QUEUED) {
            console.log("PAUSING READER at: " + requestQueue.size);
            reader.paused = true;
            requestQueue.onEmpty().then(() => {
                reader.paused = false;
                console.log("RESUMING READER at: " + requestQueue.size);
                reader.resume();
            })
            reader.pause();
        }
       
            requestQueue.add(() => got(url)).then((result) => {
            if (result.body) {
                try {
                    let response = JSON.parse(result.body);

                    if (response["features"][0].geometry.type === "Point" && response["features"][0].properties.accuracy === "point") {

                        const confidence = parseFloat(response["features"][0].properties.confidence);

                        if (confidence < CONFIDENCE_LIMIT) {
                            throw "Not confident enough: " + confidence;
                        }

                        jsItem.coordinates = response["features"][0].geometry.coordinates;
                        if (jsItem.coordinates && jsItem.coordinates.length === 2) {
                            let options = {
                                declaration: {
                                    include: false,
                                }
                            }

                            let amenityString = "";

                            if (jsItem.isHealthCareFacility || jsItem.isHealthServiceProvider) {
                                if (amenityString.length > 0) {
                                    amenityString += ";";
                                }
                                amenityString += "clinic";
                            }
                            if (jsItem.isSocialCareFacility || jsItem.isSocialServiceProvider) {
                                if (amenityString.length > 0) {
                                    amenityString += ";";
                                }
                                amenityString += "social_facility";
                            }

                            let xmlObject = {
                                '@': {
                                    "id": ((-1) - geocodingResultCount),
                                    "lat": jsItem.coordinates[1],
                                    "lon": jsItem.coordinates[0],
                                    "timestamp": jsItem.timestamp
                                },
                                'tag': [{ '@': { 'k': 'name', 'v': jsItem.name } },
                                { '@': { 'k': 'addr:city', 'v': jsItem.postOffice } },
                                { '@': { 'k': 'addr:street', 'v': jsItem.streetAddress } },
                                { '@': { 'k': 'addr:housenumber', 'v': jsItem.houseNumber } },
                                { '@': { 'k': 'addr:postcode', 'v': jsItem.postNumber } },
                                { '@': { 'k': 'oid', 'v': jsItem.oid } },
                                { '@': { 'k': 'source', 'v': 'THL SOTE orgnisation registry' } },
                                { '@': { 'k': 'addr:country', 'v': jsItem.country } }]
                            };
                            if (amenityString.length > 0) {
                                xmlObject.tag.push({ '@': { 'k': 'amenity', 'v': amenityString } });
                            }
                            if (jsItem.phone.length>0) {
                                xmlObject.tag.push({ '@': { 'k': 'phone', 'v': jsItem.phone } });
                            }
                            file.write(Js2XmlParser.parse("node", xmlObject, options) + "\n");

                            geocodingResultCount++;
                        }
                    }

                } catch (error) {
                    logError(error, jsItem);
                }
            }
        }).catch((error) => {
            console.log("REQUEST ERROR: " + error);
        });
    }
});