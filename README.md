### Source of the data ###

National Institute for Health and Welfare (THL) maintains a registry for all public and private social and health care providers.

The data is available under the CC BY 4.0 license on the [Code Service](https://www.thl.fi/en/web/information-management-in-social-welfare-and-health-care/standardisation-of-data-and-requirements/code-service) [1].

### Permission to use the data ###

National Institute for Heath and Welfare (THL) gives permission to use the data in OSM, provided they are listed as a data source on openstreetmap.org/copyright.

### Import ###

Goal is to use the service provider information available from the registry (**name, address, provider type: social/healthcare**), geocode the addresses to coordinates, transform the data to JOSM format and import the set to OSM.

Geocoding will be performed using the [Digitransit.fi -platform](https://digitransit.fi/en/developers/) [2].

Some of the facilities already have been uploaded by various individuals and organisations. Target here is to make one definitive layer using the official registry data.

The registry has over 72000 service providers listed.

### Example source data ###

Here is modified example data from the registry:

```
<?xml version="1.0" encoding="UTF-8"?><arb:result xmlns:arb="urn::codeservice"><arb:document xsi:schemaLocation="urn::codeservice codeservice_result_V2.0.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-inst\
ance"><header>Produced by CodeServer 5.7.4 (c) Datawell Oy</header>
<body>
<termsystem id="1.2.246.537.6.202.2008" begindate="1900-01-01T00:00:01" expirationdate="2100-12-31T23:59:59" lastmodifieddate="2017-08-04T01:30:12.05412" lastmodifiedby="Version Loader">
<attribute type="longname" datatype="ST" language="fi">THL - SOTE-organisaatiorekisteri 2008</attribute>
<attribute type="status" datatype="ST">1</attribute>
<attribute type="codetype" datatype="ST">2</attribute>
<attribute type="relatesto" datatype="ST">1.2.246.537.6.202</attribute>
<attribute type="relatestoname" datatype="ST">THL - SOTE-organisaatiorekisteri</attribute>
<attribute type="hierarchical" datatype="ST">1</attribute>
<attribute type="Luokituksen_peruste" datatype="ST">&lt;p&gt;1 TILASTO Valtakunnallisessa tilastotuotannossa käytettävä tietorakenne, 2 KANTA-TH Kanta-palveluissa käytettävä terveydenhuollon tietorakenne, 3 \
KANTA-SH Kanta-palveluissa käytettävä sosiaalihuollon tietorakenne&lt;/p&gt;</attribute>
<attribute type="Ruotsinnos" datatype="ST">F</attribute>
<termitementry id="1.2.246.10.10000549.10.0" language="fi" createdate="2016-03-08T10:28:36" begindate="1900-01-01T00:00:01" expirationdate="2100-12-31T23:59:59" lastmodifieddate="2017-02-01T14:51:21" lastmod\
ifiedby="Lehtonen, Jari">
<attribute type="status" datatype="ST">1</attribute>
<attribute type="longname" datatype="ST" language="fi">COMPANY X and Y SERVICES.</attribute>
<attribute type="abbreviation" datatype="ST" language="fi">COMPANY X & Y</attribute>
<attribute type="hierarchylevel" datatype="ST">0</attribute>
<attribute type="parentid" datatype="ST" language="fi"></attribute>
<attribute type="costcenter" datatype="ST" language="fi"></attribute>
<attribute type="officepostaddress" datatype="ST" language="fi">Esimerkkiosoite 1, 02150 Espoo</attribute>
<attribute type="officestreetaddress" datatype="ST" language="fi">Esimerkkiosoite 1</attribute>
<attribute type="postnumber" datatype="ST" language="fi">02150</attribute>
<attribute type="postoffice" datatype="ST" language="fi">Espoo</attribute>
<attribute type="officetelephone" datatype="ST" language="fi">0505286206</attribute>
<attribute type="officefax" datatype="ST" language="fi"></attribute>
<attribute type="description" datatype="ST" language="fi"></attribute>
<attribute type="Y-Tunnus" datatype="ST">000000-0</attribute>
<attribute type="Sektori" datatype="ST">2 yksityinen</attribute>
<attribute type="Org.Yks.lyhenne" datatype="ST">COMPANY X & Y</attribute>
<attribute type="Sijainti kunta" datatype="ST">049 Espoo</attribute>
<attribute type="Terv.toimintayksikkö" datatype="ST">F</attribute>
<attribute type="Sos.toimintayksikkö" datatype="ST">T</attribute>
<attribute type="Terv.palveluyksikkö" datatype="ST">F</attribute>
<attribute type="Sos.palveluyksikkö" datatype="ST">F</attribute>
</termitementry> 
```

### Example import data ###
This would be converted to something like this:

```
<node id='-45' lat='61.495632' lon='23.770766' timestamp='2016-02-02T01:30:24'>
    <tag k='name' v='Hammaslääkintäyritys Plakki Oy'/>
    <tag k='addr:city' v='Tampere'/>
    <tag k='addr:street' v='Suvantokatu'/>
    <tag k='addr:housenumber' v='10'/>
    <tag k='addr:postcode' v='33100'/>
    <tag k='sote_oid' v='1.1.111.1111.1111111.11.11'/>
    <tag k='addr:country' v='FI'/>
    <tag k='amenity' v='clinic'/>
    <tag k='phone' v='050123456'/>
</node>
```

The imported data set would contain the addresses, names and type of each provider. 

Type would be indicated as a tag, containing ``` amenity=social_facility ``` or ``` amenity=clinic ``` or a combination of these.

### References ###

[1] Code Service https://www.thl.fi/en/web/information-management-in-social-welfare-and-health-care/standardisation-of-data-and-requirements/code-service

[2] Digitransit.fi https://digitransit.fi/en/developers/

