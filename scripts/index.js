const BigXml = require('big-xml-streamer');
const RequestPromise = require('request-promise');
const Util = require('util');
const FileSystem = require('fs');
const Js2XmlParser = require('js2xmlparser');
const PQueue = require('p-queue');
const BuildUrl = require('build-url');
const queryUrl = "http://api.digitransit.fi/geocoding/v1/search";
const got = require('got');

let recordCount = 0;
let geocodingResultCount = 0;
let geocodingErrorCount = 0;

let file = FileSystem.createWriteStream('./output/output.osm');
let errorLog = FileSystem.createWriteStream('./output/failed.json');
file.write("<?xml version='1.0' encoding='UTF-8'?>\n");
file.write("<osm version='0.6' generator='JOSM'>\n");
errorLog.write("{\n");
let prepend = "";

let reader = BigXml.createReader('./input/sote.xml', 'termitementry', { gzip: false });

const maxConcurrent = 10;
const maxQueued = 50;

let requestQueue = new PQueue({ concurrency: maxConcurrent });

reader.on('record', function(record) {
    recordCount++;

    let children = record.children;
    let jsItem = {
        address: "",
        postNumber: "",
        postOffice: "",
        shortName: "",
        name: "",
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
            jsItem.originalId = record.attrs.id;
        }
    }

    if (children) {
        for (let i = 0; i < children.length; i++) {
            let item = children[i];

            if (item.hasOwnProperty("attrs") && item.hasOwnProperty("text")) {
                let attrs = item.attrs;

                if (attrs.type === "abbreviation") {
                    jsItem.shortName = item.text;
                }
                if (attrs.type === "longname") {
                    jsItem.name = item.text;
                }
                if (attrs.type === "officestreetaddress") {
                    jsItem.address = item.text;
                }
                if (attrs.type === "postnumber") {
                    jsItem.postNumber = item.text;
                }
                if (attrs.type === "postoffice") {
                    jsItem.postOffice = item.text.toUpperCase();
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

        let addressString = jsItem.address + "," + jsItem.postNumber + " " + jsItem.postOffice;
        let encodedAddress = encodeURIComponent(addressString);

        let url = BuildUrl(queryUrl, {
            queryParams: {
                size: '1',
                text: encodedAddress
            }
        });

        let status = () => {
            console.log('Pending ' + requestQueue.pendingPromises + '/' + requestQueue.maxPendingPromises + ' Queued ' + requestQueue.queue.length + '/' + requestQueue.maxQueuedPromises);
        }

        if (requestQueue.size >= maxQueued) {
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

                    if (response["features"][0].geometry.type === "Point") {

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
                                    "id": (0 - recordCount),
                                    "lat": jsItem.coordinates[1],
                                    "lon": jsItem.coordinates[0],
                                    "timestamp": jsItem.timestamp
                                },
                                'tag': [{ '@': { 'k': 'name', 'v': jsItem.name } }]
                            };
                            if (amenityString.length > 0) {
                                xmlObject.tag[1] = { '@': { 'k': 'amenity', 'v': amenityString } };
                            }
                            file.write(Js2XmlParser.parse("node", xmlObject, options) + "\n");
                            geocodingResultCount++;
                        }
                    }

                } catch (error) {
                    errorLog.write(prepend + JSON.stringify(jsItem, null, 2));
                    if (!prepend) {
                        prepend = ",";
                    }
                    geocodingErrorCount++;
                }
            }
        }).catch((error) => {
            console.log("REQUEST ERROR: " + error);
        });
    }
});
process.stdin.resume(); //so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) { console.log("cleanup") };
    if (err) console.log(err.stack);
    if (options.exit) {
        file.write('</osm>\n');
        errorLog.write("\n}");

        console.log("RECORD COUNT: " + recordCount);
        console.log("RESULT COUNT: " + geocodingResultCount);
        console.log("ERROR COUNT: " + geocodingErrorCount);

        process.exit();
    }

}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));