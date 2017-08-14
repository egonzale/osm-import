## Using the script ##

### Prerequisities ###
1. input folder with sote.xml file from http://91.202.112.142/codeserver/pages/publication-view-page.xhtml?distributionKey=5559
1. output folder

```
npm install
npm start
```

### Results ###
This will create two output files:
1. output/output.osm is a file that can be loaded to JOSM
1. output/failed.json is a file listing items, in JSON format, that failed the geocoding for whatever reason. Usually incorrectly filled address field.